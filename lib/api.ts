import type { ParsedResume } from "@/lib/types";

export async function parseResume(file: File): Promise<ParsedResume> {
  const formData = new FormData();
  formData.append("file", file);
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const endpoint = configuredBaseUrl
    ? `${configuredBaseUrl.replace(/\/$/, "")}/api/parse`
    : "/api/parse";

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const fallback = "We could not parse this resume right now. Please try again.";
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const data = (await response.json()) as { message?: string; error?: string };
        throw new Error(data.message ?? data.error ?? fallback);
      } catch (error) {
        if (error instanceof Error && error.message !== fallback) {
          throw error;
        }
      }
    }
    throw new Error(fallback);
  }

  return (await response.json()) as ParsedResume;
}
