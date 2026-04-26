import { NextResponse } from "next/server";

type ParsedResumeResponse = {
  name: string | null;
  contactInfo: {
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    location: string | null;
  };
  skills: string[];
  education: string[];
  experience: string[];
};

const SKILLSET = [
  "Python",
  "Machine Learning",
  "Data Science",
  "Java",
  "SQL",
  "NLP",
  "Deep Learning",
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "AWS",
  "Docker",
  "Kubernetes",
  "Git",
];

const EDUCATION_KEYWORDS = [
  "bachelor",
  "master",
  "phd",
  "b.tech",
  "m.tech",
  "b.e",
  "m.e",
  "bsc",
  "msc",
  "mba",
  "university",
  "college",
];

const EXPERIENCE_SECTION_HEADERS = [
  "experience",
  "work experience",
  "employment",
  "professional experience",
  "work history",
];

const SECTION_STOP_HEADERS = ["education", "skills", "projects", "certifications", "achievements", "summary"];

export const runtime = "nodejs";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").trim();
}

function extractName(lines: string[]): string | null {
  for (const line of lines.slice(0, 12)) {
    if (line.length < 2 || line.length > 60) continue;
    if (/@|\d/.test(line)) continue;
    if (/(resume|curriculum|vitae|linkedin|github)/i.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length > 6) continue;
    return line;
  }
  return null;
}

function extractEmail(text: string): string | null {
  const match = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  return match?.[0] ?? null;
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}/);
  return match?.[0] ?? null;
}

function extractLinkedIn(text: string): string | null {
  const match = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s)]+/i);
  return match?.[0] ?? null;
}

function extractLocation(lines: string[]): string | null {
  for (const line of lines.slice(0, 25)) {
    const match = line.match(/\b[A-Za-z .'-]+,\s?[A-Za-z]{2,}\b/);
    if (match) return match[0];
  }
  return null;
}

function extractSkills(text: string): string[] {
  return SKILLSET.filter((skill) => new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(text));
}

function extractEducation(lines: string[]): string[] {
  return Array.from(
    new Set(
      lines.filter((line) => {
        const lower = line.toLowerCase();
        return EDUCATION_KEYWORDS.some((keyword) => lower.includes(keyword));
      }),
    ),
  ).slice(0, 8);
}

function extractSectionLines(lines: string[], sectionHeaders: string[]): string[] {
  const lowerLines = lines.map((line) => line.toLowerCase());
  let startIndex = -1;

  for (let index = 0; index < lowerLines.length; index += 1) {
    if (sectionHeaders.some((header) => lowerLines[index] === header || lowerLines[index].startsWith(`${header}:`))) {
      startIndex = index + 1;
      break;
    }
  }

  if (startIndex === -1) return [];

  const sectionLines: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const lower = lowerLines[index];
    if (SECTION_STOP_HEADERS.some((header) => lower === header || lower.startsWith(`${header}:`))) {
      break;
    }
    sectionLines.push(lines[index]);
  }

  return sectionLines.filter((line) => line.length > 2);
}

function extractExperience(lines: string[]): string[] {
  const sectionLines = extractSectionLines(lines, EXPERIENCE_SECTION_HEADERS);
  if (sectionLines.length) {
    return Array.from(new Set(sectionLines)).slice(0, 10);
  }

  const dateRangePattern = /\b(?:19|20)\d{2}\b\s*[-to]+\s*\b(?:present|current|(?:19|20)\d{2})\b/i;
  const fallback = lines.filter((line) => dateRangePattern.test(line));
  return Array.from(new Set(fallback)).slice(0, 8);
}

function hasUsefulData(data: ParsedResumeResponse): boolean {
  return Boolean(
    data.name ||
      data.contactInfo.email ||
      data.contactInfo.phone ||
      data.contactInfo.linkedin ||
      data.skills.length ||
      data.education.length ||
      data.experience.length,
  );
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { default: pdfParse } = await import("pdf-parse");
  const parsed = await pdfParse(buffer);
  return parsed.text ?? "";
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

async function extractResumeText(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  if (fileName.endsWith(".pdf")) {
    return extractTextFromPdf(fileBuffer);
  }

  if (fileName.endsWith(".docx")) {
    return extractTextFromDocx(fileBuffer);
  }

  throw new ApiError("Unsupported file format. Please upload a PDF or DOCX file.", 400);
}

function buildParsedResume(rawText: string): ParsedResumeResponse {
  const text = normalizeWhitespace(rawText);
  const lines = toLines(rawText);

  return {
    name: extractName(lines),
    contactInfo: {
      email: extractEmail(text),
      phone: extractPhone(text),
      linkedin: extractLinkedIn(text),
      location: extractLocation(lines),
    },
    skills: extractSkills(text),
    education: extractEducation(lines),
    experience: extractExperience(lines),
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ message: "No resume file was uploaded." }, { status: 400 });
    }

    const maxSizeMb = Number(process.env.RESUME_MAX_FILE_SIZE_MB ?? "10");
    const maxBytes = Number.isFinite(maxSizeMb) && maxSizeMb > 0 ? maxSizeMb * 1024 * 1024 : 10 * 1024 * 1024;
    if (fileEntry.size > maxBytes) {
      return NextResponse.json(
        { message: `Resume is too large. Maximum allowed size is ${Math.floor(maxBytes / (1024 * 1024))}MB.` },
        { status: 413 },
      );
    }

    const extractedText = await extractResumeText(fileEntry);
    if (!extractedText.trim()) {
      return NextResponse.json(
        { message: "Could not extract readable text from this file. Please upload another resume file." },
        { status: 422 },
      );
    }

    const parsed = buildParsedResume(extractedText);
    if (!hasUsefulData(parsed)) {
      return NextResponse.json(
        { message: "Could not parse this resume. Please try another file with clearer text." },
        { status: 422 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to parse the uploaded resume.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
