/**
 * Gemini analysis layer for Janus (bidirectional).
 *
 * The system prompt is constructed programmatically from src/lib/taxonomy.ts,
 * which is the single source of truth for both directions' checks (stable ids).
 * The model returns ONLY { detected_direction, check_id, region } plus a
 * summary; all display content (title, patterns, rationale) is resolved from
 * the taxonomy by the worker — never trusted from model output. There are no
 * severity tiers: every finding is required for a native look.
 */

import {
  TAXONOMY,
  CHECKS_BY_DIRECTION,
  CATEGORY_BY_CHECK_ID,
  CHECK_ORDER,
  DIRECTION_META,
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

export interface ModelRegion {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface ModelFinding {
  check_id: string;
  /** Bounding box (0–1000 normalized) around the flagged element. */
  region?: ModelRegion;
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
      lines.push(`- ${check.id} — "${check.check}"`);
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
    '"findings" is an array of objects, each with "check_id" and a "region" bounding box (see REGION). Every finding matters — the goal is for the design to look fully native on the target platform, so include every check you can see evidence for.',
    "",
    "REGION",
    'Every finding MUST include a "region" object — e.g. {"x_min": 120, "y_min": 800, "x_max": 400, "y_max": 880}. Coordinates are integers in a 0–1000 normalized space where (0,0) is the screenshot\'s top-left corner. Draw the box TIGHTLY around the specific UI element the finding refers to (the tab bar, the back chevron, the FAB, the switch).',
    'For global checks that genuinely apply to the whole screen (e.g. a font swap affecting all text), use the full-screen box {"x_min": 0, "y_min": 0, "x_max": 1000, "y_max": 1000}.',
    "Coordinates must satisfy 0 <= x_min < x_max <= 1000 and 0 <= y_min < y_max <= 1000.",
    "",
    "RULES",
    "- FIRST identify the screenshot's platform, then evaluate ONLY that direction's checks.",
    "- Include ONLY checks you can see evidence for in the screenshot. Do not guess.",
    "- Use only the check ids listed below, copied verbatim. Never invent ids.",
    "- If the image is not an app UI screenshot, or no checks apply, return an empty findings array and say so in the summary.",
    "- Order findings in the same order the checks appear below (they are grouped by category).",
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
          region: {
            type: "object",
            properties: {
              x_min: { type: "integer", minimum: 0, maximum: 1000 },
              y_min: { type: "integer", minimum: 0, maximum: 1000 },
              x_max: { type: "integer", minimum: 0, maximum: 1000 },
              y_max: { type: "integer", minimum: 0, maximum: 1000 },
            },
            required: ["x_min", "y_min", "x_max", "y_max"],
          },
        },
        required: ["check_id", "region"],
      },
    },
  },
  required: ["detected_direction", "summary", "findings"],
} as const;

export interface ResolvedFinding {
  id: string;
  category: string;
  title: string;
  sourcePattern: string;
  targetPattern: string;
  rationale: string;
  /** One-line plain-language fix from the taxonomy library. */
  fix: string;
  sources: { label: string; url: string }[];
  unverified?: boolean;
  unverifiedNote?: string;
  /** Validated bounding box (0–1000 normalized) around the flagged element. */
  region?: ModelRegion;
}

/**
 * Validate a model-supplied region. Positional only — never trusted for
 * display content. Invalid regions are dropped silently.
 */
function validRegion(value: unknown): value is ModelRegion {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  const nums = [r.x_min, r.y_min, r.x_max, r.y_max];
  if (
    !nums.every(
      (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1000,
    )
  )
    return false;
  const x_min = Math.round(r.x_min as number);
  const y_min = Math.round(r.y_min as number);
  const x_max = Math.round(r.x_max as number);
  const y_max = Math.round(r.y_max as number);
  if (x_min >= x_max || y_min >= y_max) return false;
  const area = (x_max - x_min) * (y_max - y_min);
  if (area < 100) return false; // too small to be meaningful
  if (area > 950_000) return false; // whole-screen box = global check
  return true;
}

export interface BackendAnalysisResult {
  summary: string;
  /** Token counts for spend monitoring (not sent to the client). */
  usage: { promptTokens: number; candidateTokens: number };
  findings: ResolvedFinding[];
  /** The direction the findings belong to (== detected for auto). */
  direction: AnalysisDirection;
  /** What the model identified (== requested direction for explicit calls). */
  detectedDirection: AnalysisDirection;
}

/**
 * One model pass: fetch, parse, and resolve against the taxonomy.
 * Unknown check ids, wrong-direction ids, and invalid regions are dropped.
 */
async function analyzeOnce(
  apiKey: string,
  mimeType: string,
  imageBase64: string,
  request: DirectionRequest,
  attempt = 1,
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
          // 0 = deterministic: the same screenshot must return the same
          // findings every run. (0.2 let borderline checks flip in and out
          // between runs — founder caught 5→4 on the same screenshot.)
          temperature: 0,
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
    // 503/500 from Gemini is transient capacity pressure — retry up to twice
    // with backoff, then surface a "busy, try again" message instead of a
    // generic failure.
    if ((res.status === 503 || res.status === 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 2500 * attempt));
      return analyzeOnce(apiKey, mimeType, imageBase64, request, attempt + 1);
    }
    if (res.status === 503 || res.status === 500) {
      const err = new Error("Gemini is busy right now. Try again in a minute.");
      (err as { statusHint?: number }).statusHint = 503;
      throw err;
    }
    throw new Error(`Gemini API error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
  const usage = {
    promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
    candidateTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
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
    if (!check) continue;
    seen.add(f.check_id);
    const region = validRegion(f.region)
      ? {
          x_min: Math.round(f.region.x_min),
          y_min: Math.round(f.region.y_min),
          x_max: Math.round(f.region.x_max),
          y_max: Math.round(f.region.y_max),
        }
      : undefined;
    findings.push({
      id: check.id,
      category: CATEGORY_BY_CHECK_ID[f.check_id] ?? "General",
      title: check.check,
      sourcePattern: check.sourcePattern,
      targetPattern: check.targetPattern,
      rationale: check.rationale,
      fix: check.fix,
      sources: check.sources,
      ...(check.unverified
        ? { unverified: true, unverifiedNote: check.unverifiedNote }
        : {}),
      ...(region ? { region } : {}),
    });
  }

  // Deterministic order: category order, then check order within category.
  findings.sort(
    (a, b) => (CHECK_ORDER[a.id] ?? 0) - (CHECK_ORDER[b.id] ?? 0),
  );

  return { summary: parsed.summary, findings, direction, detectedDirection: detected, usage };
}

/**
 * Consensus runs per analysis. 3 is the minimum for a majority vote.
 * ~$0.045/analysis at current pricing — still trivial against the $20 cap.
 */
const CONSENSUS_RUNS = 3;

/** Average bounding boxes across runs into one stable region. */
function averageRegion(regions: ModelRegion[]): ModelRegion {
  const n = regions.length;
  const avg = (f: (r: ModelRegion) => number) =>
    Math.round(regions.reduce((s, r) => s + f(r), 0) / n);
  return {
    x_min: avg((r) => r.x_min),
    y_min: avg((r) => r.y_min),
    x_max: avg((r) => r.x_max),
    y_max: avg((r) => r.y_max),
  };
}

/**
 * Run the analysis several times in parallel and keep only findings a
 * majority of runs agree on (2 of 3). Temperature 0 alone does NOT make
 * Gemini deterministic — borderline checks still flip between identical
 * requests — so consensus is what actually stabilizes the output.
 */
export async function analyzeWithGemini(
  apiKey: string,
  mimeType: string,
  imageBase64: string,
  request: DirectionRequest,
): Promise<BackendAnalysisResult> {
  const settled = await Promise.allSettled(
    Array.from({ length: CONSENSUS_RUNS }, () =>
      analyzeOnce(apiKey, mimeType, imageBase64, request),
    ),
  );
  const ok = settled
    .filter(
      (s): s is PromiseFulfilledResult<BackendAnalysisResult> =>
        s.status === "fulfilled",
    )
    .map((s) => s.value);
  // Need a majority of runs to succeed; otherwise surface the first failure
  // (preserves the distinct 429 / busy / 402 messaging from analyzeOnce).
  if (ok.length < Math.ceil(CONSENSUS_RUNS / 2)) {
    const first = settled.find(
      (s): s is PromiseRejectedResult => s.status === "rejected",
    );
    throw first ? first.reason : new Error("Analysis failed. Please try again.");
  }

  const threshold = Math.ceil(ok.length / 2);
  const votes = new Map<
    string,
    { count: number; regions: ModelRegion[]; finding: ResolvedFinding }
  >();
  for (const run of ok) {
    for (const f of run.findings) {
      const v = votes.get(f.id) ?? { count: 0, regions: [], finding: f };
      v.count++;
      if (f.region) v.regions.push(f.region);
      votes.set(f.id, v);
    }
  }
  const findings = [...votes.values()]
    .filter((v) => v.count >= threshold)
    .map((v) => ({
      ...v.finding,
      region: v.regions.length ? averageRegion(v.regions) : undefined,
    }));
  findings.sort((a, b) => (CHECK_ORDER[a.id] ?? 0) - (CHECK_ORDER[b.id] ?? 0));

  // Summary from the run whose finding set best matches the consensus.
  const consensusIds = new Set(findings.map((f) => f.id));
  let summary = ok[0].summary;
  let best = -1;
  for (const run of ok) {
    const overlap = run.findings.filter((f) => consensusIds.has(f.id)).length;
    if (overlap > best) {
      best = overlap;
      summary = run.summary;
    }
  }

  const usage = {
    promptTokens: ok.reduce((s, r) => s + r.usage.promptTokens, 0),
    candidateTokens: ok.reduce((s, r) => s + r.usage.candidateTokens, 0),
  };
  // Direction should agree across runs; majority wins, first run breaks ties.
  const dirVotes = new Map<AnalysisDirection, number>();
  for (const run of ok)
    dirVotes.set(run.direction, (dirVotes.get(run.direction) ?? 0) + 1);
  const direction = [...dirVotes.entries()].sort((a, b) => b[1] - a[1])[0][0];

  return {
    summary,
    findings,
    direction,
    detectedDirection: direction,
    usage,
  };
}
