/**
 * Janus Cloudflare Worker.
 *
 * Serves two roles:
 *  1. API: POST /api/analyze — accepts a screenshot, runs it through Gemini
 *     against the taxonomy, and returns the AnalysisResult shape the
 *     frontend expects.
 *  2. Everything else falls through to Workers Static Assets (the Vite
 *     production build in dist/), configured in wrangler.toml.
 */

import type { ExportedHandler } from "@cloudflare/workers-types";
import { analyzeWithGemini } from "./gemini";
import type { DirectionRequest } from "../src/lib/taxonomy";

function parseDirection(value: unknown): DirectionRequest {
  return value === "ios-to-android" ||
    value === "android-to-ios" ||
    value === "auto"
    ? value
    : "auto";
}

interface Env {
  /**
   * Google AI Studio API key.
   * Local dev: .dev.vars (see .dev.vars.example). Production: `wrangler secret put GEMINI_API_KEY`.
   * Never hardcode or commit this value.
   */
  GEMINI_API_KEY: string;
  /** KV ledger for per-day token usage (spend monitoring). */
  janus_usage: KVNamespace;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // ~10MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function handleAnalyze(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  if (!env.GEMINI_API_KEY) {
    return json(
      { error: "Server misconfigured: GEMINI_API_KEY is not set." },
      500,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Expected multipart/form-data." }, 400);
  }

  const screenshot = form.get("screenshot");
  if (!(screenshot instanceof File)) {
    return json({ error: "Missing 'screenshot' image field." }, 400);
  }
  if (!ALLOWED_TYPES.has(screenshot.type)) {
    return json(
      { error: "Unsupported image type. Use PNG, JPG, or WebP." },
      400,
    );
  }
  if (screenshot.size === 0) {
    return json({ error: "Empty image." }, 400);
  }
  if (screenshot.size > MAX_IMAGE_BYTES) {
    return json({ error: "Image too large (10MB limit)." }, 413);
  }

  const direction = parseDirection(form.get("direction"));

  try {
    const base64 = await fileToBase64(screenshot);
    const result = await analyzeWithGemini(
      env.GEMINI_API_KEY,
      screenshot.type,
      base64,
      direction,
    );
    // Spend ledger: accumulate per-day token counts in KV (fire-and-forget).
    ctx.waitUntil(recordUsage(env.janus_usage, result.usage));
    // Never leak usage internals to the client.
    const { usage: _usage, ...clientResult } = result;
    return json(clientResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("analyze failed:", message);
    // Free-tier rate limit: ask the user to wait instead of a generic error.
    if (
      err instanceof Error &&
      (err as { statusHint?: number }).statusHint === 429
    ) {
      return json(
        { error: "Rate limit reached — please wait a minute and try again." },
        429,
      );
    }
    // Transient Gemini capacity pressure (after retries): same treatment.
    if (
      err instanceof Error &&
      (err as { statusHint?: number }).statusHint === 503
    ) {
      return json(
        { error: "The AI service is busy right now — try again in a minute." },
        503,
      );
    }
    return json({ error: "Analysis failed. Please try again." }, 502);
  }
}

/**
 * Accumulate one analysis's token counts into today's KV ledger entry.
 * Key: usage:YYYY-MM-DD -> { promptTokens, candidateTokens, requests }.
 */
async function recordUsage(
  kv: KVNamespace,
  usage: { promptTokens: number; candidateTokens: number },
): Promise<void> {
  try {
    const key = `usage:${new Date().toISOString().slice(0, 10)}`;
    const raw = await kv.get(key);
    const cur = raw
      ? (JSON.parse(raw) as {
          promptTokens: number;
          candidateTokens: number;
          requests: number;
        })
      : { promptTokens: 0, candidateTokens: 0, requests: 0 };
    cur.promptTokens += usage.promptTokens;
    cur.candidateTokens += usage.candidateTokens;
    cur.requests += 1;
    await kv.put(key, JSON.stringify(cur), { expirationTtl: 90 * 86400 });
  } catch (e) {
    console.error("usage ledger failed:", e);
  }
}

const handler = {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/analyze") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed." }, 405);
      }
      return handleAnalyze(request, env, ctx);
    }
    // Non-API paths are served from Workers Static Assets (dist/).
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

export default handler;
