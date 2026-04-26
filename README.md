# ResumeIT

ResumeIT is a Next.js app that uploads PDF/DOCX resumes and parses them into structured JSON (name, contact info, skills, education, and experience).

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a local env file from the context template:
   ```bash
   copy .env.example .env.local
   ```
3. Start the app:
   ```bash
   npm run dev
   ```

## Environment / Context File

Use `.env.example` as the project context/config template when moving this project to another IDE or machine.

- `NEXT_PUBLIC_API_BASE_URL`: Optional API base URL. Keep empty to use the same host.
- `RESUME_MAX_FILE_SIZE_MB`: Max upload size accepted by the parser endpoint.

## Parser Endpoint

- Route: `POST /api/parse`
- Form field: `file`
- Supported files: `.pdf`, `.docx`

Returns JSON in this shape:

```json
{
  "name": "Candidate Name",
  "contactInfo": {
    "email": "person@example.com",
    "phone": "+1 555 123 4567",
    "linkedin": "linkedin.com/in/person",
    "location": "City, State"
  },
  "skills": ["Python", "SQL"],
  "education": ["Bachelor of Technology, XYZ University"],
  "experience": ["Software Engineer - ABC Corp (2021 - Present)"]
}
```
