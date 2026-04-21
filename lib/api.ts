import type { ParsedResume } from "@/lib/types";

export async function parseResume(file: File): Promise<ParsedResume> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/parse", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const fallback = "We could not parse this resume right now. Please try again.";
    try {
      const data = (await response.json()) as { message?: string; error?: string };
      throw new Error(data.message ?? data.error ?? fallback);
    } catch {
      throw new Error(fallback);
    }
  }

  return (await response.json()) as ParsedResume;
}
