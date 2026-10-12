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

/**
 * Bump this whenever the prompt, taxonomy, or voting logic changes — it is
 * part of the analysis-cache key, so a bump invalidates cached results.
 * 1 = launch, 2 = consensus voting, 3 = tie-breaker judge, 4 = result cache,
 * 5 = multi-region findings + icon deep links,
 * 6 = expanded icon alias map,
 * 7 = direct selected-icon Google Fonts URLs (verified format),
 * 8 = FAB input-cluster -> Search Bar guidance; back-gesture + icon source order fixes,
 * 9 = Search Bar fix names the SearchView modal pattern.
 */
export const PIPELINE_VERSION = 16;

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
  /**
   * Optional element detail the model noticed — e.g. the icon's name
   * ("home") for icon checks. Used for deep links; never trusted blindly.
   */
  detail?: string;
  /**
   * Model-supplied counterpart icon name on the target platform (exact match
   * or closest equivalent). Sanitized before use.
   */
  counterpart?: string;
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
    '"summary" is one sentence describing the overall adaptation state of the screen for the detected direction. It must mention ONLY checks that appear in the findings array — never describe a check you did not include.',
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
    "- If the same check applies to multiple DISTINCT elements (e.g. two separate floating buttons), return one finding per element with the same check_id and a different region. Never return the same element twice.",
    "- Scan navigation bars, tab bars, and toolbars icon by icon: each icon that doesn't match the target platform's iconography gets its own finding, even when the icons are small.",
    "- When a finding concerns a group of related elements (e.g. an input bar plus its adjacent action buttons), draw the region around the WHOLE group, not one button.",
    '- If a finding is about a specific icon, you MUST put the exact icon name in "detail" (the SF Symbol name like "magnifyingglass", or the Material Symbol name like "search") and its target-platform counterpart in "counterpart" (exact match, or the closest equivalent if none exists). Never leave these empty on an icon finding.',
    "- The phone's own OS chrome is never a finding: the system status bar (time, battery, signal/wifi icons), the home indicator, and the system navigation bar/gestures belong to the device, not the app. Ignore them completely.",
    "- The buttons across the top of an iOS screen (back chevron, title, right-side actions) are ONE navigation unit, not separate elements: return a single finding with the region drawn around the whole top bar. On Material that becomes one top app bar (navigation icon + actions) — never separate floating buttons.",
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
          detail: { type: "string" },
          counterpart: {
            type: "string",
            description:
              "For icon findings: the exact counterpart icon name on the target platform, or the closest available equivalent if no exact match exists.",
          },
        },
        required: ["check_id", "region"],
      },
    },
  },
  required: ["detected_direction", "summary", "findings"],
} as const;

/** Intersection-over-union for two normalized boxes; used to spot duplicate regions. */
function iou(a: ModelRegion, b: ModelRegion): number {
  const x1 = Math.max(a.x_min, b.x_min);
  const y1 = Math.max(a.y_min, b.y_min);
  const x2 = Math.min(a.x_max, b.x_max);
  const y2 = Math.min(a.y_max, b.y_max);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (inter === 0) return 0;
  const union =
    (a.x_max - a.x_min) * (a.y_max - a.y_min) +
    (b.x_max - b.x_min) * (b.y_max - b.y_min) -
    inter;
  return union === 0 ? 0 : inter / union;
}

export interface ResolvedFinding {
  /** Taxonomy check id (stable). Repeat findings share it; see `key`. */
  id: string;
  /**
   * Unique per-analysis key: the check id, or check_id#2, #3… when the same
   * check flagged multiple distinct elements. Used for UI identity.
   */
  key: string;
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
  /** Model-supplied element detail (e.g. icon name); sanitized before use. */
  detail?: string;
  /** Deep link to the exact counterpart resource (e.g. the icon's page). */
  deepLink?: string;
  /** Counterpart name where no web page exists (e.g. the SF Symbol name). */
  counterpartName?: string;
  /** True when the counterpart came from the curated map (exact); false when
   *  it's the model's closest-equivalent recommendation. */
  counterpartExact?: boolean;
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
    // 503/500/524 from Gemini is transient capacity pressure — retry up to
    // twice with backoff, then surface a "busy, try again" message instead of
    // a generic failure. 524 is Cloudflare's edge timing out (100s) when
    // parallel batches queue up at Google's API.
    if (
      (res.status === 503 || res.status === 500 || res.status === 524) &&
      attempt < 3
    ) {
      await new Promise((r) => setTimeout(r, 2500 * attempt));
      return analyzeOnce(apiKey, mimeType, imageBase64, request, attempt + 1);
    }
    if (res.status === 503 || res.status === 500 || res.status === 524) {
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
  // to reproduce content, and drop ids from the wrong direction. The same
  // check may flag multiple DISTINCT elements (one finding each); true
  // duplicates (same check, heavily overlapping region) are dropped.
  const checkMap = CHECKS_BY_DIRECTION[direction];
  const findings: ResolvedFinding[] = [];
  for (const f of parsed.findings) {
    const check = checkMap[f.check_id];
    if (!check) continue;
    const region = validRegion(f.region)
      ? {
          x_min: Math.round(f.region.x_min),
          y_min: Math.round(f.region.y_min),
          x_max: Math.round(f.region.x_max),
          y_max: Math.round(f.region.y_max),
        }
      : undefined;
    if (
      region &&
      findings.some(
        (g) => g.id === check.id && g.region && iou(g.region, region) > 0.3,
      )
    )
      continue; // same element reported twice
    findings.push({
      id: check.id,
      key: check.id, // finalized after consensus (adds #2, #3… for repeats)
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
      ...(f.detail ? { detail: sanitizeDetail(f.detail) } : {}),
      ...(f.counterpart ? { counterpart: sanitizeDetail(f.counterpart) } : {}),
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

/** Keep model-supplied detail short and safe (icon names like "home"). */
function sanitizeDetail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim().toLowerCase().slice(0, 40);
  return /^[a-z0-9._-]+$/.test(clean) ? clean : undefined;
}

/**
 * Common SF Symbol → Material Symbol name mappings, so an icon finding can
 * link straight to its counterpart. Inverted programmatically for the
 * reverse direction. Names outside this map fall back to a Google Fonts
 * search for the model's best-effort name.
 */
const SF_TO_MATERIAL_ICONS: Record<string, string> = {
  house: "home",
  magnifyingglass: "search",
  gearshape: "settings",
  gear: "settings",
  "chevron.left": "chevron_left",
  "chevron.right": "chevron_right",
  plus: "add",
  xmark: "close",
  checkmark: "check",
  "square.and.pencil": "edit",
  trash: "delete",
  heart: "favorite",
  star: "star",
  bell: "notifications",
  person: "person",
  envelope: "mail",
  camera: "photo_camera",
  photo: "image",
  mic: "mic",
  phone: "call",
  message: "chat",
  ellipsis: "more_horiz",
  "line.3.horizontal": "menu",
  "arrow.left": "arrow_back",
  "arrow.right": "arrow_forward",
  "square.and.arrow.up": "share",
  bookmark: "bookmark",
  clock: "schedule",
  calendar: "calendar_month",
  map: "map",
  paperplane: "send",
  "info.circle": "info",
  globe: "language",
  "clock.arrow.circlepath": "history",
  wifi: "wifi",
  "chevron.up": "expand_less",
  "chevron.down": "expand_more",
  "ellipsis.circle": "more_horiz",
  "square.and.arrow.down": "download",
  "doc.text": "description",
  folder: "folder",
  pencil: "edit",
  "plus.circle": "add_circle",
  "xmark.circle": "cancel",
  "checkmark.circle": "check_circle",
  "exclamationmark.triangle": "warning",
  "questionmark.circle": "help",
  thumbsup: "thumb_up",
  "hand.thumbsdown": "thumb_down",
  "arrow.clockwise": "refresh",
  "arrow.counterclockwise": "refresh",
  "slider.horizontal.3": "tune",
  "bell.badge": "notifications_active",
  "person.2": "group",
  "star.fill": "star",
  "heart.fill": "favorite",
  "bookmark.fill": "bookmark",
  "mappin": "location_on",
  "video": "videocam",
  "phone.fill": "call",
  "envelope.fill": "mail",
};
const MATERIAL_TO_SF_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(SF_TO_MATERIAL_ICONS).map(([sf, m]) => [m, sf]),
);

/**
 * Google Fonts page for a Material Symbol, verified 2026-10-11: the
 * `selected` param opens the icon's detail panel directly (copy-code
 * buttons), with only the name segment varying per icon.
 */
function materialIconUrl(materialName: string): string {
  return (
    "https://fonts.google.com/icons?selected=Material+Symbols+Outlined:" +
    `${encodeURIComponent(materialName)}` +
    ":FILL@0;wght@400;GRAD@0;opsz@24&icon.size=24&icon.color=%231f1f1f"
  );
}

/**
 * For icon findings, resolve the counterpart: a Google Fonts deep link for
 * the Material icon, and the SF Symbol name for the iOS side (Apple has no
 * per-symbol web pages, so the name is the deliverable there).
 */
function iconCounterparts(
  direction: AnalysisDirection,
  detail: string | undefined,
  modelCounterpart: string | undefined,
): { deepLink?: string; counterpartName?: string; counterpartExact?: boolean } {
  if (!detail && !modelCounterpart) return {};
  if (direction === "ios-to-android") {
    // Screenshot shows an SF Symbol; dev needs the Material equivalent.
    const exact = !!detail && detail in SF_TO_MATERIAL_ICONS;
    const material =
      (detail && SF_TO_MATERIAL_ICONS[detail]) ??
      modelCounterpart ??
      (detail ? detail.replace(/\./g, "_") : undefined);
    if (!material) return {};
    return {
      deepLink: materialIconUrl(material),
      counterpartName: material,
      counterpartExact: exact,
    };
  }
  // Screenshot shows a Material Symbol; dev needs the SF Symbol name.
  const exact = !!detail && detail in MATERIAL_TO_SF_ICONS;
  const sf =
    (detail && MATERIAL_TO_SF_ICONS[detail]) ?? modelCounterpart ?? detail;
  if (!sf) return {};
  return { counterpartName: sf, counterpartExact: exact };
}

/** Dynamic fix line for icon findings: names the exact swap. */
function iconFix(
  direction: AnalysisDirection,
  detail: string | undefined,
  counterpartName: string,
): string {
  const target =
    direction === "ios-to-android"
      ? `the Material ${counterpartName} icon`
      : `the iOS ${counterpartName} icon`;
  const source = detail
    ? direction === "ios-to-android"
      ? `the iOS ${detail} icon`
      : `the Material ${detail} icon`
    : "this icon";
  return `Change ${source} to ${target}.`;
}

/** Most frequent value; ties go to the first seen. */
function mostCommon(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | undefined;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

/** Checks whose findings can carry an icon deep link. */
const ICON_CHECK_IDS = new Set(["icon-symbols", "a2i-icon-symbols"]);

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

const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    decisions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          check_id: { type: "string" },
          keep: { type: "boolean" },
          why: { type: "string" },
        },
        required: ["check_id", "keep"],
      },
    },
  },
  required: ["decisions"],
} as const;

/**
 * Tie-breaker for split votes: the checks the parallel runs disagreed on
 * get one focused review pass that makes the final call. A narrow yes/no on
 * a single check is a far more reliable judgment than the full 46-check
 * scan, so this is what actually settles borderline items. On judge
 * failure the caller falls back to the majority vote (safe default).
 */
async function judgeContested(
  apiKey: string,
  mimeType: string,
  imageBase64: string,
  direction: AnalysisDirection,
  contested: {
    key: string;
    id: string;
    votesFor: number;
    votesTotal: number;
    regionHint?: ModelRegion;
    detail?: string;
  }[],
): Promise<Map<string, boolean> | null> {
  const checkMap = CHECKS_BY_DIRECTION[direction];
  const lines = contested.map((c) => {
    const check = checkMap[c.id];
    return [
      `- ${c.key} — ${c.id} (flagged by ${c.votesFor}/${c.votesTotal} passes): ${check?.check ?? c.id}`,
      `  Current: ${check?.sourcePattern ?? ""}`,
      `  Expected: ${check?.targetPattern ?? ""}`,
      ...(c.regionHint
        ? [`  Location in screenshot (0-1000): ${JSON.stringify(c.regionHint)}`]
        : []),
      ...(c.detail ? [`  Element detail: ${c.detail}`] : []),
    ].join("\n");
  });
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: [
                  "You are a decisive UI review judge. Other analysts disagreed on whether the checks below apply to the attached app screenshot.",
                  "For EACH check, examine the screenshot and give a final YES (keep) or NO (drop) with one sentence of visual evidence.",
                  "Be strict: a finding must earn its place with clearly visible evidence. If it is genuinely ambiguous, say NO.",
                  'Return JSON: {"decisions": [{"check_id": "<the key shown, e.g. c0>", "keep": true, "why": "..."}]} — one decision per contested item, using its key.',
                  "",
                  "CONTESTED CHECKS:",
                  ...lines,
                ].join("\n"),
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [{ inlineData: { mimeType, data: imageBase64 } }],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: JUDGE_SCHEMA,
          },
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";
    const parsed = JSON.parse(text) as {
      decisions?: Array<{ check_id: string; keep: boolean }>;
    };
    // Verdicts are keyed by the contested key handed to the judge (c0, c1…),
    // matched back to clusters by that key.
    const out = new Map<string, boolean>();
    const keys = contested.map((c) => c.key);
    for (const d of parsed.decisions ?? []) {
      if (typeof d.check_id === "string" && typeof d.keep === "boolean") {
        const match =
          keys.find((k) => d.check_id === k) ??
          keys.find((k) => d.check_id.includes(k) || k.includes(d.check_id));
        if (match) out.set(match, d.keep);
      }
    }
    (judgeContested as { lastUsage?: { promptTokens: number; candidateTokens: number } }).lastUsage = {
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      candidateTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
    return out;
  } catch {
    return null;
  }
}

/**
 * Run the analysis several times in parallel. Unanimous findings stand;
 * split votes go to a tie-breaker judge for a final call. Temperature 0
 * alone does NOT make Gemini deterministic — borderline checks still flip
 * between identical requests — so vote + adjudication is what actually
 * stabilizes the output.
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
  // Need a majority of runs to succeed; otherwise surface the distinct
  // failure reasons (preserves the 429 / busy / 402 messaging from analyzeOnce).
  if (ok.length < Math.ceil(CONSENSUS_RUNS / 2)) {
    const reasons = settled
      .filter(
        (s): s is PromiseRejectedResult => s.status === "rejected",
      )
      .map((s) =>
        s.reason instanceof Error ? s.reason.message : "unknown error",
      );
    const summary = [...new Set(reasons)].join(" | ");
    throw new Error(
      `Analysis failed (${ok.length}/${CONSENSUS_RUNS} votes succeeded): ${summary}`,
    );
  }

  // Direction first: the judge needs it to look up check definitions.
  const dirVotes = new Map<AnalysisDirection, number>();
  for (const run of ok)
    dirVotes.set(run.direction, (dirVotes.get(run.direction) ?? 0) + 1);
  const direction = [...dirVotes.entries()].sort((a, b) => b[1] - a[1])[0][0];

  // Cluster votes by (check_id, region): the same check flagging two
  // distinct elements forms two clusters that live or die independently.
  const clusters: {
    id: string;
    count: number;
    regions: ModelRegion[];
    finding: ResolvedFinding;
    details: string[];
    counterparts: string[];
  }[] = [];
  for (const run of ok) {
    for (const f of run.findings) {
      const cluster = clusters.find((c) => {
        if (c.id !== f.id) return false;
        if (!f.region) return c.regions.length === 0;
        return c.regions.some((r) => iou(r, f.region as ModelRegion) > 0.3);
      });
      if (cluster) {
        cluster.count++;
        if (f.region) cluster.regions.push(f.region);
        if (f.detail) cluster.details.push(f.detail);
        if (f.counterpart) cluster.counterparts.push(f.counterpart);
      } else {
        clusters.push({
          id: f.id,
          count: 1,
          regions: f.region ? [f.region] : [],
          finding: f,
          details: f.detail ? [f.detail] : [],
          counterparts: f.counterpart ? [f.counterpart] : [],
        });
      }
    }
  }

  // Split votes go to the judge; unanimous verdicts stand as-is.
  const total = ok.length;
  const contested = clusters
    .filter((c) => c.count > 0 && c.count < total)
    .map((c, i) => ({
      key: `c${i}`,
      id: c.id,
      votesFor: c.count,
      votesTotal: total,
      regionHint: c.regions.length ? averageRegion(c.regions) : undefined,
      detail: mostCommon(c.details),
    }));
  let verdicts: Map<string, boolean> | null = null;
  if (contested.length > 0) {
    verdicts = await judgeContested(apiKey, mimeType, imageBase64, direction, contested);
  }
  const judgeUsage = (
    judgeContested as { lastUsage?: { promptTokens: number; candidateTokens: number } }
  ).lastUsage ?? { promptTokens: 0, candidateTokens: 0 };

  const threshold = Math.ceil(total / 2);
  const kept = clusters.filter((c) => {
    if (c.count === total) return true; // unanimous keep
    const key = contested.find((k) => k.id === c.id && k.votesFor === c.count)?.key;
    if (key && verdicts?.has(key)) return verdicts.get(key)!;
    return c.count >= threshold; // judge unavailable: majority fallback
  });

  const findings: ResolvedFinding[] = kept.map((c) => {
    const detail = mostCommon(c.details);
    const modelCounterpart = mostCommon(c.counterparts);
    const links =
      ICON_CHECK_IDS.has(c.id) && (detail || modelCounterpart)
        ? iconCounterparts(direction, detail, modelCounterpart)
        : {};
    return {
      ...c.finding,
      region: c.regions.length ? averageRegion(c.regions) : undefined,
      ...(detail ? { detail } : {}),
      ...(links.deepLink ? { deepLink: links.deepLink } : {}),
      ...(links.counterpartName ? { counterpartName: links.counterpartName } : {}),
      ...(links.counterpartExact !== undefined
        ? { counterpartExact: links.counterpartExact }
        : {}),
      // Name the exact swap instead of the generic library fix.
      ...(links.counterpartName
        ? { fix: iconFix(direction, detail, links.counterpartName) }
        : {}),
    };
  });
  findings.sort((a, b) => (CHECK_ORDER[a.id] ?? 0) - (CHECK_ORDER[b.id] ?? 0));

  // Unique UI keys: first occurrence keeps the bare check id, repeats get #2…
  const occurrences = new Map<string, number>();
  for (const f of findings) {
    const n = (occurrences.get(f.id) ?? 0) + 1;
    occurrences.set(f.id, n);
    f.key = n === 1 ? f.id : `${f.id}#${n}`;
  }

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
    promptTokens:
      ok.reduce((s, r) => s + r.usage.promptTokens, 0) + judgeUsage.promptTokens,
    candidateTokens:
      ok.reduce((s, r) => s + r.usage.candidateTokens, 0) +
      judgeUsage.candidateTokens,
  };

  return {
    summary,
    findings,
    direction,
    detectedDirection: direction,
    usage,
  };
}
