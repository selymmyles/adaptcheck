/**
 * Analysis client — talks to the Cloudflare Worker backend.
 *
 * POSTs the screenshot as multipart/form-data to /api/analyze (with the
 * requested direction) and returns the AnalysisResult. The worker resolves
 * findings against src/lib/taxonomy.ts, so check ids here always match the
 * taxonomy.
 */

import type {
  Severity,
  AnalysisDirection,
  DirectionRequest,
} from "./taxonomy";

// Re-exported so UI components import all analysis types from one place.
export type { Severity, AnalysisDirection, DirectionRequest };

export interface FindingSource {
  label: string;
  url: string;
}

/** Bounding box in 0–1000 normalized screenshot coordinates. */
export interface FindingRegion {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  sourcePattern: string;
  targetPattern: string;
  rationale: string;
  /** Official-doc citations grounding this finding. */
  sources: FindingSource[];
  /** True when grounded in community convention, not official docs. */
  unverified?: boolean;
  /** One-line note explaining why the finding is unverified. */
  unverifiedNote?: string;
  /** Optional bounding box around the flagged UI element. */
  region?: FindingRegion;
}

export interface AnalysisResult {
  summary: string;
  findings: Finding[];
  /** The direction the findings belong to (resolved server-side). */
  direction: AnalysisDirection;
  /** What the model identified (== direction for explicit requests). */
  detectedDirection: AnalysisDirection;
}

export class AnalysisError extends Error {}

/**
 * Analyze an uploaded screenshot via the backend.
 *
 * `direction` is "ios-to-android" | "android-to-ios" | "auto" (default in the
 * UI). Throws AnalysisError with a human-readable message on failure.
 */
export async function analyzeDesign(
  file: File,
  direction: DirectionRequest,
): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("screenshot", file, file.name);
  form.append("direction", direction);

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
