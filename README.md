# Janus — See your design through the other platform's eyes.

Upload an app screenshot, get a prioritized iOS ⇄ Android adaptation checklist.

## Frontend

Vite + React + TypeScript + Tailwind CSS v4. Standard commands:

```sh
npm install
npm run dev      # Vite dev server (:5173), /api proxied to the worker
npm run build    # typecheck + production build → dist/
```

## Backend (Cloudflare Worker)

`worker/` holds a Cloudflare Worker that serves the production build as
static assets and implements the analysis API:

- `POST /api/analyze` — multipart/form-data, single `screenshot` field
  (PNG/JPG/WebP, 10MB limit). Forwards the image to the Google Gemini API
  (multimodal), which picks applicable checks from the taxonomy; the worker
  resolves display content from `src/lib/taxonomy.ts` (the single source of
  truth — 38 checks across both directions, stable ids) and returns the
  `AnalysisResult` shape.

`wrangler.toml` configures Workers Static Assets from `dist/`; the worker
name (`adaptcheck-api`) is unchanged for now.

## API key

The worker reads `GEMINI_API_KEY` from the environment only — never hardcoded:

- Local dev: copy `.dev.vars.example` to `.dev.vars` and fill in your
  [Google AI Studio key](https://aistudio.google.com/apikey) (free tier works).
  `.dev.vars` is gitignored — never commit it.
- Production: `wrangler secret put GEMINI_API_KEY`

## Local dev end to end

```sh
npm run build            # dist/ must exist for the worker to serve it
npx wrangler dev         # worker + static assets on :8787 (reads .dev.vars)
npm run dev              # Vite on :5173, proxies /api → :8787
```

Then open http://localhost:5173 and upload a screenshot.

## Deploy

```sh
npx wrangler secret put GEMINI_API_KEY   # once per environment
npx wrangler deploy
```
