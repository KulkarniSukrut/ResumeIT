export type ContactInfo = {
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  location?: string | null;
};

export type EducationItem = {
  institution?: string;
  degree?: string;
  year?: string;
};

export type ExperienceItem = {
  company?: string;
  role?: string;
  duration?: string;
  summary?: string;
};

export type ParsedResume = {
  name?: string | null;
  contactInfo?: ContactInfo;
  skills?: string[];
  education?: EducationItem[] | string[];
  experience?: ExperienceItem[] | string[];
  [key: string]: unknown;
};

export type UploadHistoryItem = {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
};
