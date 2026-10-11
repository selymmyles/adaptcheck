/**
 * Analysis client — talks to the Cloudflare Worker backend.
 *
 * POSTs the screenshot as multipart/form-data to /api/analyze and returns
 * the AnalysisResult. The worker resolves findings against
 * src/lib/taxonomy.ts, so check ids here always match the taxonomy.
 */

import type { Severity } from "./taxonomy";

// Re-exported so UI components import all analysis types from one place.
export type { Severity };

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  iosPattern: string;
  androidPattern: string;
  rationale: string;
}

export interface AnalysisResult {
  summary: string;
  findings: Finding[];
}

export class AnalysisError extends Error {}

/**
 * Analyze an uploaded iOS screenshot via the backend.
 *
 * Throws AnalysisError with a human-readable message on failure.
 */
export async function analyzeDesign(file: File): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("screenshot", file, file.name);

  let res: Response;
  try {
    res = await fetch("/api/analyze", { method: "POST", body: form });
  } catch {
    throw new AnalysisError(
      "Couldn't reach the analysis service. Check your connection and try again.",
    );
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response — handled below via res.ok.
  }

  if (!res.ok) {
    const message =
      data !== null &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Analysis request failed (HTTP ${res.status}).`;
    throw new AnalysisError(message);
  }

  return data as AnalysisResult;
}
