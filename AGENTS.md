# Janus — agent notes

Janus is a live app: upload an app screenshot → AI analyzes it against a
bidirectional iOS/Android design-adaptation taxonomy → prioritized findings
with pins on the screenshot.

## Stack

- Vite + React 19 + TypeScript (strict; `verbatimModuleSyntax`, `noUnusedLocals`)
- Tailwind CSS v4 (via `@tailwindcss/vite`, CSS-first config in `src/index.css`)
- shadcn/ui (style: base-nova) for UI primitives, Lucide (`lucide-react`) for icons
- Cloudflare Worker backend in `worker/` (serves the app + `POST /api/analyze`)
- Path alias: `@/*` → `./src/*`

## UI rules (read before touching any component)

- **Build from the library first.** Generic UI comes from the shadcn
  primitives in `src/components/ui/` (`button`, `card`, `badge`, `separator`,
  `alert`, `progress`). Reuse them before creating anything new.
- **Icons come from Lucide.** No hand-drawn or inline SVGs for standard
  icons — if Lucide has it, use it.
- **New shared UI goes in the library**, not inline in a screen: generic
  primitives extend `src/components/ui/`; Janus-specific building blocks
  (e.g. `PatternBox`, the screenshot map/pins) live as named components in
  `src/components/` and are built on top of the primitives.
- Screens (`UploadScreen`, `AnalyzingView`, `ResultsScreen`) compose
  primitives — they don't re-implement buttons, cards, badges, or alerts
  with raw Tailwind.
- Style with the theme tokens (below), not one-off hex values.

## Brand tokens

Defined as CSS variables in `src/index.css` (`:root`), mapped onto the
shadcn theme. Use the semantic utilities (`bg-primary`, `text-foreground`,
`bg-background`, `border-border`, …).

| Token | Value | Use |
|---|---|---|
| `--primary` | `#0f766e` (teal) | Brand accent: primary actions, progress, highlights |
| `--primary-dark` | `#0b5e57` | Accent hover/pressed (`hover:bg-primary-dark`) |
| `--foreground` | `#1c1917` | Ink: body text |
| `--background` | `#fafaf9` | App background (cards/popovers are white) |
| `--border` | `#e7e5e4` | Hairlines (stone-200) |
| `--destructive` | `#e11d48` | Errors |
| Font | Inter | `--font-sans` |
| Radius | cards/panels ≈ 1rem (`rounded-2xl`), controls 0.75rem (`rounded-xl`) | |

## Off-limits during UI work

UI-only changes must not alter behavior or logic in:

- `src/lib/` — the taxonomy (`taxonomy.ts`) and analysis client
  (`mockAnalysis.ts`) are the app's brain. (`src/lib/utils.ts` is just the
  shadcn `cn()` re-export.)
- `worker/` — the backend and the `/api/analyze` contract.

If a UI change seems to require touching those, stop and flag it instead.

## Verify

- `npm run build` (runs `tsc -b` + Vite build) must pass clean.
- `npm run lint` (oxlint).
