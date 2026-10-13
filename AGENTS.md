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

## Theme tokens — STOCK DEFAULTS (founder direction, 2026-10-12)

`src/index.css` carries the **unmodified shadcn (base-nova) default
theme**: neutral oklch palette, `--primary` near-black, `--radius`
0.625rem, Geist Variable font. Use the semantic utilities (`bg-primary`,
`text-foreground`, `bg-background`, `border-border`, …) and **never
hardcode palette classes** (`teal-*`, `stone-*`, …) in app components.

The previous Janus look (teal primary, Inter, stone palette) was
AI-improvised styling, not the founder's design, and was deliberately
reset. **Do not reintroduce brand customization on your own initiative.**
The founder directs token changes one at a time; when he does, record
the change here.

## Founder-directed changes (2026-10-13)

- **Card outline is a real border.** Stock base-nova Card draws its edge
  as `ring-1 ring-foreground/10` (a 10%-opacity ring; verified identical
  on ui.shadcn.com — the outline is a whisper by design). At the
  founder's direction, `ui/card.tsx` uses `border border-border`
  instead of the ring so cards have a visible outline. This is a
  deliberate deviation from stock — do not "restore" the ring.
  **Vanishing side borders (2026-10-13, RESOLVED — founder-verified):** on the founder's
  Windows/NVIDIA Chrome, hairline borders on elements inside the
  accordion panel (findings, which are Items) are dropped on the sides
  while rendering fine in software-rendered browsers — a known
  Chromium GPU-compositing/clipping bug class with accordion-specific
  reports. An inset box-shadow backing (`ring-1 ring-inset ring-border`)
  was tried and REVERTED at his direction (it read as a thickened
  border where both paint). His diagnosis: the accordion container is
  the culprit — cards outside accordions render fine for him.
  Do not re-add the ring backing. **Resolved the same night at his
  direction: findings no longer live in the group accordion** —
  ResultsScreen renders groups as static headed sections (the
  annotated-map accordion and the screenshot collapse toggle are
  separate and stay).
  **Finding boxes are a grouped stack (2026-10-13):** the FIX +
  two platform boxes read as ONE group: outer corners rounded-md
  (8px, one step under the item's rounded-lg — never larger than
  their container), meeting corners 4px (half the outer; 2px read
  as sharp). Spacing is the original 8px — a tightened gap was
  reverted at his direction. The region-crop image takes the same
  step down (rounded-md).
  **FIX box is inverted (2026-10-13):** the finding's FIX box uses
  `bg-primary` / `text-primary-foreground` — the one dark surface in
  the finding stack, so the action stands out from the two platform
  reference boxes (muted/accent fills). Founder: "emphasize the fix
  item so it stands out from the other two."
  **Icon copy button (2026-10-13):** icon findings already copied the
  paste-ready artifact (SwiftUI snippet for SF Symbols, bare name for
  Material); at his direction the button is now icon-only (Copy glyph,
  Check on copied) — the platform meaning lives in the accessible
  label / hover title, not face text.
- **Findings are collapsible accordion items** (2026-10-13, founder:
  save space — supersedes "Findings are Items"). FindingCard composes
  an `AccordionItem`: collapsed row = pin number + category badge +
  title; FIX / platform boxes / crop live in the panel. **Expanded by
  default** (founder: "dont make it default closed") — ResultsScreen
  tracks only the findings the user collapsed. The structure is
  founder-verified in his Chrome (2026-10-13): borders hold. The outline sits on the AccordionItem itself, never on
  a box inside the panel (the nesting GPU Chrome dropped); the inner
  boxes are borderless fills. The panel's stock paragraph-margin
  cascade is neutralized (`[&_p:not(:last-child)]:mb-0`) so the boxes
  keep their own spacing. Pattern rows inside the patterns Card remain
  `Item` primitives; summary / analyzing surfaces remain Cards.
- **ScrollArea is the React Aria variant** (`aria-nova` registry file:
  native scroll + thin themed scrollbar), used in the findings sidebar,
  which follows the bordered-panel + title-header pattern of the shadcn
  Tags scroll-area demo. The rest of the project stays on base-nova.
- **Links** use the stock Button `link` variant classes (via
  `buttonVariants`) — shadcn has no link component or default link
  style.
- **Progress is stock everywhere** — per-file rows use `Progress` with
  `value={null}` (Base UI indeterminate) while analyzing; no custom
  progress bars in app components. One functional patch inside the
  primitive: stock `ui/progress.tsx` leaves the indeterminate state
  unstyled (invisible bar), so the indicator carries
  `data-indeterminate` slide classes with keyframes defined as the
  `--animate-progress-indeterminate` theme token at the end of
  `index.css`. Theme color/radius/font tokens remain unmodified.

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
