import { type NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// ---------------------------------------------------------------------------
// Types (mirror lib/types.ts to keep API self-contained)
// ---------------------------------------------------------------------------

type ContactInfo = {
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  location?: string | null;
};

type EducationItem = {
  institution?: string;
  degree?: string;
  year?: string;
};

type ExperienceItem = {
  company?: string;
  role?: string;
  duration?: string;
  summary?: string;
};

type ParsedResume = {
  name?: string | null;
  contactInfo?: ContactInfo;
  skills?: string[];
  education?: EducationItem[];
  experience?: ExperienceItem[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const KNOWN_SKILLS = [
  // Languages
  "Python", "JavaScript", "TypeScript", "Java", "C", "C++", "C#", "Go", "Rust", "Ruby",
  "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Perl", "Shell", "Bash", "PowerShell",
  // Web
  "HTML", "CSS", "React", "Next.js", "Vue", "Angular", "Svelte", "Node.js", "Express",
  "Django", "Flask", "FastAPI", "Spring", "Laravel", "Rails", "GraphQL", "REST", "gRPC",
  // Data / AI / ML
  "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Data Science",
  "TensorFlow", "PyTorch", "Keras", "scikit-learn", "Pandas", "NumPy", "Matplotlib",
  "Seaborn", "OpenCV", "Hugging Face", "LangChain", "Spark", "Hadoop",
  // Databases
  "SQL", "MySQL", "PostgreSQL", "SQLite", "MongoDB", "Redis", "Cassandra",
  "DynamoDB", "Elasticsearch", "Firebase",
  // Cloud / DevOps
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins",
  "GitHub Actions", "CI/CD", "Linux", "Nginx", "Apache",
  // Other tools
  "Git", "GitHub", "GitLab", "Jira", "Agile", "Scrum", "Figma", "Tableau", "Power BI",
];

const DEGREE_KEYWORDS = [
  "B.Sc", "M.Sc", "B.Tech", "M.Tech", "B.E", "M.E", "Bachelor", "Master", "MBA",
  "PhD", "Ph.D", "Doctor", "Associate", "Diploma", "High School", "GED",
];

const JOB_TITLE_KEYWORDS = [
  "Engineer", "Developer", "Analyst", "Manager", "Director", "Designer",
  "Architect", "Consultant", "Lead", "Intern", "Scientist", "Researcher",
  "Specialist", "Executive", "Officer", "Head", "VP", "President",
];

/**
 * Matches common duration formats in work experience entries:
 *  - "Jan 2020 – Dec 2022" / "Jan, 2020 - Dec, 2022"
 *  - "2019 – 2021"
 *  - "2020 – Present"
 */
const DURATION_PATTERN =
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{4}\s*[-–]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{4}|\b(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}|\b(?:19|20)\d{2}\s*[-–]\s*[Pp]resent\b/;

/**
 * RFC-5321-inspired email pattern.
 * Local part: starts and ends with alphanumeric; allows dots, underscores, percent, plus, hyphen in between.
 * Domain: labels separated by dots, TLD at least 2 characters.
 */
const EMAIL_PATTERN =
  /\b[A-Za-z0-9](?:[A-Za-z0-9._%+\-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+\b/;

/**
 * Matches common phone number formats, requiring an area code + at least 7 digits.
 * Examples: "+1 (555) 123-4567", "555.123.4567", "+44 7911 123456"
 */
const PHONE_PATTERN = /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4,6}\b/;

/** Section headings that bound the experience block from below. */
const NEXT_SECTION_KEYWORDS = [
  "education", "skills", "projects", "certifications", "awards",
  "references", "interests", "hobbies", "languages",
];

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse({ data: uint8, verbosity: 0 });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function extractContactInfo(text: string): ContactInfo {
  const emailMatch = text.match(EMAIL_PATTERN);
  const phoneMatch = text.match(PHONE_PATTERN);
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w\-]+/i);

  // Location: look for "City, ST" or "City, State" patterns, or explicit label
  let location: string | null = null;
  const locationLabelMatch = text.match(/(?:Location|Address|City)[:\s]+([^\n,]+(?:,\s*[^\n]+)?)/i);
  if (locationLabelMatch) {
    location = locationLabelMatch[1].trim();
  } else {
    // Heuristic: "City, Two-letter-state" e.g. "San Francisco, CA"
    const cityStateMatch = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2})\b/);
    if (cityStateMatch) {
      location = cityStateMatch[0];
    }
  }

  return {
    email: emailMatch?.[0] ?? null,
    phone: phoneMatch?.[0].trim() ?? null,
    linkedin: linkedinMatch?.[0] ?? null,
    location,
  };
}

function extractName(lines: string[]): string | null {
  const contactPatterns = [/@/, /\d{3}/, /http/, /linkedin/, /github/, /www\./i];
  const sectionHeaders = /^(experience|education|skills|summary|objective|profile|contact|references|projects|awards|certifications|languages|interests|hobbies|activities|publications|work)/i;

  for (const raw of lines.slice(0, 8)) {
    const line = raw.trim();
    if (!line || line.length < 2 || line.length > 60) continue;
    if (sectionHeaders.test(line)) continue;
    if (contactPatterns.some((p) => p.test(line))) continue;
    // Must look like a name: letters, spaces, hyphens, apostrophes only
    if (!/^[A-Za-z][A-Za-z'\-. ]+$/.test(line)) continue;
    // Must have at least two "words" (first + last name)
    const words = line.trim().split(/\s+/);
    if (words.length < 2) continue;
    return line;
  }
  return null;
}

function extractSkills(text: string): string[] {
  return KNOWN_SKILLS.filter((skill) =>
    new RegExp(`(?<![A-Za-z])${escapeRegex(skill)}(?![A-Za-z])`, "i").test(text)
  );
}

function extractEducation(text: string): EducationItem[] {
  const results: EducationItem[] = [];
  const lines = text.split(/\n/);

  // Find the education section bounds
  const eduSectionStart = lines.findIndex((l) =>
    /^(education|academic|qualifications)/i.test(l.trim())
  );

  const searchLines =
    eduSectionStart >= 0
      ? lines.slice(eduSectionStart, eduSectionStart + 30)
      : lines;

  const degreePattern = new RegExp(
    `(${DEGREE_KEYWORDS.map(escapeRegex).join("|")})`,
    "i"
  );

  for (let i = 0; i < searchLines.length; i++) {
    const line = searchLines[i].trim();
    if (!degreePattern.test(line)) continue;

    const item: EducationItem = {};

    // Degree
    const degreeMatch = line.match(degreePattern);
    if (degreeMatch) {
      item.degree = degreeMatch[0];
    }

    // Year: 4-digit year in surrounding ±2 lines
    const contextBlock = searchLines
      .slice(Math.max(0, i - 1), Math.min(searchLines.length, i + 3))
      .join(" ");
    const yearMatch = contextBlock.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      item.year = yearMatch[0];
    }

    // Institution: line before or after that doesn't contain degree keyword and looks like a name
    const prevLine = searchLines[i - 1]?.trim();
    const nextLine = searchLines[i + 1]?.trim();
    const institutionCandidate = [prevLine, nextLine].find(
      (l) => l && l.length > 3 && !degreePattern.test(l) && !/^\d/.test(l)
    );
    if (institutionCandidate) {
      item.institution = institutionCandidate;
    }

    results.push(item);
  }

  return results;
}

function extractExperience(text: string): ExperienceItem[] {
  const results: ExperienceItem[] = [];
  const lines = text.split(/\n/);

  // Find experience section
  const expSectionStart = lines.findIndex((l) =>
    /^(experience|work history|employment|professional background)/i.test(l.trim())
  );
  if (expSectionStart < 0) return results;

  // Find next major section to bound experience block
  const nextSectionPattern = new RegExp(`^(${NEXT_SECTION_KEYWORDS.join("|")})`, "i");
  const nextSectionStart = lines.findIndex(
    (l, idx) => idx > expSectionStart && nextSectionPattern.test(l.trim())
  );

  const expLines =
    nextSectionStart > 0
      ? lines.slice(expSectionStart + 1, nextSectionStart)
      : lines.slice(expSectionStart + 1, expSectionStart + 60);

  const jobTitlePattern = new RegExp(JOB_TITLE_KEYWORDS.map(escapeRegex).join("|"), "i");

  let currentItem: ExperienceItem | null = null;

  for (const raw of expLines) {
    const line = raw.trim();
    if (!line) {
      if (currentItem) {
        results.push(currentItem);
        currentItem = null;
      }
      continue;
    }

    const durationMatch = line.match(DURATION_PATTERN);
    if (durationMatch) {
      if (!currentItem) currentItem = {};
      currentItem.duration = durationMatch[0];
      continue;
    }

    if (jobTitlePattern.test(line) && line.length < 80) {
      if (currentItem?.role) {
        results.push(currentItem);
        currentItem = {};
      }
      if (!currentItem) currentItem = {};
      currentItem.role = line;
      continue;
    }

    // Possible company name: short line that doesn't look like body text
    if (currentItem && !currentItem.company && line.length < 80 && /^[A-Z]/.test(line)) {
      currentItem.company = line;
      continue;
    }

    // Summary/description
    if (currentItem && line.length > 20) {
      currentItem.summary = currentItem.summary
        ? `${currentItem.summary} ${line}`
        : line;
    }
  }

  if (currentItem && Object.keys(currentItem).length > 0) {
    results.push(currentItem);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided. Include a 'file' field." }, { status: 400 });
  }

  const { name: fileName, size } = file;
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (!ext || !["pdf", "docx"].includes(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF or DOCX file." },
      { status: 415 }
    );
  }

  if (size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Maximum allowed size is 10 MB." },
      { status: 413 }
    );
  }

  let text: string;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (ext === "pdf") {
      text = await extractTextFromPdf(buffer);
    } else {
      text = await extractTextFromDocx(buffer);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/parse] text extraction failed:", message);
    return NextResponse.json(
      { error: "Could not read the file. Make sure it is a valid PDF or DOCX." },
      { status: 422 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "The file appears to be empty or contains no extractable text." },
      { status: 422 }
    );
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const parsed: ParsedResume = {
    name: extractName(lines),
    contactInfo: extractContactInfo(text),
    skills: extractSkills(text),
    education: extractEducation(text),
    experience: extractExperience(text),
  };

  return NextResponse.json(parsed);
}
