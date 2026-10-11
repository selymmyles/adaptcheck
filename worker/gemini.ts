/**
 * Gemini analysis layer for AdaptCheck (bidirectional).
 *
 * The system prompt is constructed programmatically from src/lib/taxonomy.ts,
 * which is the single source of truth for both directions' checks (stable ids).
 * The model returns ONLY { detected_direction, check_id, severity } plus a
 * summary; all display content (title, patterns, rationale) is resolved from
 * the taxonomy by the worker — never trusted from model output.
 */

import {
  TAXONOMY,
  CHECKS_BY_DIRECTION,
  CATEGORY_BY_CHECK_ID,
  DIRECTION_META,
  type Severity,
  type AnalysisDirection,
  type DirectionRequest,
} from "../src/lib/taxonomy";

/**
 * Multimodal model used for screenshot analysis. SINGLE CONFIG POINT — swap
 * this constant to change models later.
 */
// NOTE (2026-10-10): gemini-2.5-flash returns 404 for new API users ("no longer
// available to new users" per Google); gemini-3.8-flash verified working with
// vision on the free tier the same day. DO NOT revert to 2.5-flash.
export const GEMINI_MODEL = "gemini-3.8-flash";

export interface ModelFinding {
  check_id: string;
  severity: Severity;
}

interface ModelResult {
  detected_direction: AnalysisDirection;
  summary: string;
  findings: ModelFinding[];
}

function isDirection(value: unknown): value is AnalysisDirection {
  return value === "ios-to-android" || value === "android-to-ios";
}

/** Enumerate one direction's checks for the prompt. */
function checksSection(direction: AnalysisDirection): string[] {
  const meta = DIRECTION_META[direction];
  const lines: string[] = [
    `CHECKS FOR ${meta.arrow.toUpperCase()} (use ONLY when detected_direction is "${direction}")`,
  ];
  for (const category of TAXONOMY) {
    const checks = category.checks.filter((c) => c.direction === direction);
    if (checks.length === 0) continue;
    lines.push("", `## ${category.name}`);
    for (const check of checks) {
      lines.push(
        `- ${check.id} — "${check.check}" (default: ${check.defaultSeverity})`,
      );
      lines.push(`  ${meta.sourceShort}: ${check.sourcePattern}`);
      lines.push(`  ${meta.targetShort} (${meta.targetSystem}): ${check.targetPattern}`);
      lines.push(`  Why it matters: ${check.rationale}`);
    }
  }
  return lines;
}

/** Build the system prompt from the taxonomy — stays in sync automatically. */
export function buildSystemPrompt(request: DirectionRequest): string {
  const intro = [
    "You are an expert mobile UI/UX analyst specializing in Apple's Human Interface Guidelines and Material Design 3.",
    "",
  ];

  const output = [
    "OUTPUT",
    'Return a JSON object with exactly three keys: "detected_direction", "summary", and "findings".',
    '"detected_direction" is "ios-to-android" when the screenshot shows an iOS design to adapt for Android, or "android-to-ios" when it shows an Android design to adapt for iOS.',
    '"summary" is one sentence describing the overall adaptation state of the screen for the detected direction.',
    '"findings" is an array of objects, each with "check_id" and "severity".',
    'Severity meanings: "must" = the issue would read as broken or wrong on the target platform; "should" = the issue would read as an obvious port and is worth fixing; "nice" = polish that would make it feel native.',
    "",
    "RULES",
    "- FIRST identify the screenshot's platform, then evaluate ONLY that direction's checks.",
    "- Include ONLY checks you can see evidence for in the screenshot. Do not guess.",
    "- Use only the check ids listed below, copied verbatim. Never invent ids.",
    "- A check's severity may differ from its default when the specific instance warrants it.",
    "- If the image is not an app UI screenshot, or no checks apply, return an empty findings array and say so in the summary.",
    "- Order findings by severity: must first, then should, then nice.",
    "",
  ];

  if (request === "auto") {
    return [
      ...intro,
      "TASK",
      "First, determine the platform of the attached app screenshot: is it an iOS app (Apple HIG conventions — SF typography, tab bar, back chevron, grouped lists) or an Android app (Material Design 3 conventions — Roboto, navigation bar with active-indicator pill, FAB, tonal surfaces)?",
      'Set "detected_direction" accordingly, then identify which of THAT direction\'s adaptation checks visibly apply.',
      "",
      ...output,
      ...checksSection("ios-to-android"),
      "",
      ...checksSection("android-to-ios"),
    ].join("\n");
  }

  const meta = DIRECTION_META[request];
  return [
    ...intro,
    "TASK",
    `Examine the attached ${meta.sourceShort} app screenshot. Identify which of the adaptation checks listed below visibly apply — i.e. the screenshot shows a ${meta.sourceShort} design pattern that would need to change for a correct ${meta.targetShort} (${meta.targetSystem}) implementation.`,
    `Set "detected_direction" to "${request}".`,
    "",
    ...output,
    ...checksSection(request),
  ].join("\n");
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    detected_direction: {
      type: "string",
      enum: ["ios-to-android", "android-to-ios"],
    },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          check_id: { type: "string" },
          severity: { type: "string", enum: ["must", "should", "nice"] },
        },
        required: ["check_id", "severity"],
      },
    },
  },
  required: ["detected_direction", "summary", "findings"],
} as const;

const VALID_SEVERITIES: ReadonlySet<string> = new Set([
  "must",
  "should",
  "nice",
]);

export interface ResolvedFinding {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  sourcePattern: string;
  targetPattern: string;
  rationale: string;
}

export interface BackendAnalysisResult {
  summary: string;
  findings: ResolvedFinding[];
  /** The direction the findings belong to (== detected for auto). */
  direction: AnalysisDirection;
  /** What the model identified (== requested direction for explicit calls). */
  detectedDirection: AnalysisDirection;
}

/**
 * Send the screenshot to Gemini and resolve the model's check picks against
 * the matching direction's taxonomy. Unknown check ids, wrong-direction ids,
 * and invalid severities are dropped.
 */
export async function analyzeWithGemini(
  apiKey: string,
  mimeType: string,
  imageBase64: string,
  request: DirectionRequest,
): Promise<BackendAnalysisResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(request) }] },
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType, data: imageBase64 } }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    // 429 is the free-tier rate limit — surface it distinctly so the UI can
    // tell the user to wait rather than showing a generic failure.
    if (res.status === 429) {
      const err = new Error("Gemini free-tier rate limit hit. Try again in a minute.");
      (err as { statusHint?: number }).statusHint = 429;
      throw err;
    }
    throw new Error(`Gemini API error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? "";

  let parsed: ModelResult;
  try {
    parsed = JSON.parse(text) as ModelResult;
  } catch {
    throw new Error("Gemini returned unparseable JSON.");
  }
  if (
    !parsed ||
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.findings)
  ) {
    throw new Error("Gemini returned an unexpected shape.");
  }

  // Effective direction: explicit requests win; auto follows the model, with
  // a safe fallback if it returns something unexpected.
  const detected: AnalysisDirection = isDirection(parsed.detected_direction)
    ? parsed.detected_direction
    : request === "auto"
      ? "ios-to-android"
      : request;
  const direction: AnalysisDirection =
    request === "auto" ? detected : request;

  // Resolve against the matching direction's taxonomy — never trust the model
  // to reproduce content, and drop ids from the wrong direction.
  const checkMap = CHECKS_BY_DIRECTION[direction];
  const seen = new Set<string>();
  const findings: ResolvedFinding[] = [];
  for (const f of parsed.findings) {
    if (seen.has(f.check_id)) continue;
    const check = checkMap[f.check_id];
    if (!check || !VALID_SEVERITIES.has(f.severity)) continue;
    seen.add(f.check_id);
    findings.push({
      id: check.id,
      severity: f.severity,
      category: CATEGORY_BY_CHECK_ID[f.check_id] ?? "General",
      title: check.check,
      sourcePattern: check.sourcePattern,
      targetPattern: check.targetPattern,
      rationale: check.rationale,
    });
  }

  return { summary: parsed.summary, findings, direction, detectedDirection: detected };
}
