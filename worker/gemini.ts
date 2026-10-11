/**
 * Gemini analysis layer for AdaptCheck.
 *
 * The system prompt is constructed programmatically from src/lib/taxonomy.ts,
 * which is the single source of truth for the 19 checks (stable ids across
 * 6 categories). The model returns ONLY { check_id, severity } pairs plus a
 * summary; all display content (title, patterns, rationale) is resolved from
 * the taxonomy by the worker — never trusted from model output.
 */

import {
  TAXONOMY,
  CHECKS_BY_ID,
  CATEGORY_BY_CHECK_ID,
  type Severity,
} from "../src/lib/taxonomy";

/**
 * Multimodal model used for screenshot analysis. SINGLE CONFIG POINT — swap
 * this constant to change models later.
 *
 * Verified free-tier (Oct 2026, official Gemini API pricing page):
 * gemini-2.5-flash input/output is "Free of charge". It supports vision
 * input and JSON response-schema mode. Alternatives if limits ever bite:
 * gemini-2.5-flash-lite (most generous free quota).
 */
export const GEMINI_MODEL = "gemini-2.5-flash";

export interface ModelFinding {
  check_id: string;
  severity: Severity;
}

interface ModelResult {
  summary: string;
  findings: ModelFinding[];
}

/** Build the system prompt from the taxonomy — stays in sync automatically. */
export function buildSystemPrompt(): string {
  const lines: string[] = [
    "You are an expert mobile UI/UX analyst specializing in Apple's Human Interface Guidelines and Material Design 3.",
    "",
    "TASK",
    "Examine the attached iOS app screenshot. Identify which of the adaptation checks listed below visibly apply — i.e. the screenshot shows an iOS design pattern that would need to change for a correct Android (Material 3) implementation.",
    "",
    "OUTPUT",
    'Return a JSON object with exactly two keys: "summary" (one sentence describing the overall iOS-to-Android adaptation state of this screen) and "findings" (an array of objects, each with "check_id" and "severity").',
    'Severity meanings: "must" = the issue would read as broken or wrong on Android; "should" = the issue would read as an obvious iOS port and is worth fixing; "nice" = polish that would make it feel native.',
    "",
    "RULES",
    "- Include ONLY checks you can see evidence for in the screenshot. Do not guess.",
    "- Use only the check ids listed below, copied verbatim. Never invent ids.",
    "- A check's severity may differ from its default when the specific instance warrants it.",
    "- If the image is not an app UI screenshot, or no checks apply, return an empty findings array and say so in the summary.",
    "- Order findings by severity: must first, then should, then nice.",
    "",
    "ADAPTATION CHECKS",
  ];
  for (const category of TAXONOMY) {
    lines.push("", `## ${category.name}`);
    for (const check of category.checks) {
      lines.push(
        `- ${check.id} — "${check.check}" (default: ${check.defaultSeverity})`,
      );
      lines.push(`  iOS: ${check.iosPattern}`);
      lines.push(`  Android (Material 3): ${check.androidPattern}`);
      lines.push(`  Why it matters: ${check.rationale}`);
    }
  }
  return lines.join("\n");
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
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
  required: ["summary", "findings"],
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
  iosPattern: string;
  androidPattern: string;
  rationale: string;
}

export interface BackendAnalysisResult {
  summary: string;
  findings: ResolvedFinding[];
}

/**
 * Send the screenshot to Gemini and resolve the model's check picks against
 * the taxonomy. Unknown check ids and invalid severities are dropped.
 */
export async function analyzeWithGemini(
  apiKey: string,
  mimeType: string,
  imageBase64: string,
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
        systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
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

  // Resolve against the taxonomy — never trust the model to reproduce content.
  const seen = new Set<string>();
  const findings: ResolvedFinding[] = [];
  for (const f of parsed.findings) {
    if (seen.has(f.check_id)) continue;
    const check = CHECKS_BY_ID[f.check_id];
    if (!check || !VALID_SEVERITIES.has(f.severity)) continue;
    seen.add(f.check_id);
    findings.push({
      id: check.id,
      severity: f.severity,
      category: CATEGORY_BY_CHECK_ID[f.check_id] ?? "General",
      title: check.check,
      iosPattern: check.iosPattern,
      androidPattern: check.androidPattern,
      rationale: check.rationale,
    });
  }

  return { summary: parsed.summary, findings };
}
