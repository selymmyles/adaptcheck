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
import { analyzeWithGemini, PIPELINE_VERSION } from "./gemini";
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
  /**
   * KV: per-day token usage ledger (spend monitoring) + versioned
   * analysis-result cache (analysis:<pipelineVersion>:<sha256>).
   */
  janus_usage: KVNamespace;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // ~10MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Per-IP rate limiting via KV (protects the prepaid Gemini balance).
 * Two sliding windows: burst (per minute) + sustained (per hour).
 * Generous enough for heavy dogfooding (10-screenshot batches); tight
 * enough to make bulk abuse uneconomical. The $20 prepaid hard cap is
 * the ultimate backstop.
 */
const RATE_LIMITS = [
  { windowSec: 60, max: 20 }, // burst: 20 analyses/minute per IP
  { windowSec: 3600, max: 100 }, // sustained: 100 analyses/hour per IP
];

async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const now = Math.floor(Date.now() / 1000);
  try {
    for (const { windowSec, max } of RATE_LIMITS) {
      const bucket = Math.floor(now / windowSec);
      const key = `rl:${ip}:${windowSec}:${bucket}`;
      const raw = await kv.get(key);
      const count = raw ? parseInt(raw, 10) || 0 : 0;
      if (count >= max) {
        return { allowed: false, retryAfterSec: (bucket + 1) * windowSec - now };
      }
    }
    for (const { windowSec } of RATE_LIMITS) {
      const bucket = Math.floor(now / windowSec);
      const key = `rl:${ip}:${windowSec}:${bucket}`;
      const raw = await kv.get(key);
      const count = raw ? parseInt(raw, 10) || 0 : 0;
      await kv.put(key, String(count + 1), { expirationTtl: windowSec * 2 });
    }
  } catch (e) {
    // If KV is unavailable, fail open (don't break the app over the limiter).
    console.error("rate limit check failed:", e);
  }
  return { allowed: true };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function sha256Hex(bytes: Uint8Array): Promise<string> {
  return crypto.subtle.digest("SHA-256", bytes as BufferSource).then((digest) =>
    [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  );
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

  // Rate limit before any expensive work (Gemini calls cost real money).
  const clientIp =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown";
  if (clientIp !== "unknown") {
    const rl = await checkRateLimit(env.janus_usage, clientIp);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          error:
            "Too many analyses from this address — please wait a bit and try again.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rl.retryAfterSec ?? 60),
          },
        },
      );
    }
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
    const bytes = new Uint8Array(await screenshot.arrayBuffer());
    // Identical image bytes -> identical findings, always. A tool must be
    // deterministic for the same input; the vote+judge pipeline below still
    // produces the best judgment for every NEW image. The pipeline version
    // in the key means prompt/taxonomy fixes are never masked by stale cache.
    const cacheKey = `analysis:${PIPELINE_VERSION}:${await sha256Hex(bytes)}`;
    const cached = await env.janus_usage.get(cacheKey, "json");
    if (cached) return json(cached);

    const result = await analyzeWithGemini(
      env.GEMINI_API_KEY,
      screenshot.type,
      bytesToBase64(bytes),
      direction,
    );
    // Spend ledger: accumulate per-day token counts in KV (fire-and-forget).
    ctx.waitUntil(recordUsage(env.janus_usage, result.usage));
    // Never leak usage internals to the client.
    const { usage: _usage, ...clientResult } = result;
    // Cache the client-safe result for 7 days (fire-and-forget).
    ctx.waitUntil(
      env.janus_usage.put(cacheKey, JSON.stringify(clientResult), {
        expirationTtl: 7 * 86400,
      }),
    );
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
    // Pass through the specific failure reason (vote breakdown, parse errors)
    // instead of a generic message — it tells the user whether to retry or
    // wait, and it makes batch failures diagnosable.
    return json({ error: message || "Analysis failed. Please try again." }, 502);
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
