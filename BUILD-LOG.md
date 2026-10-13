# Janus — Build Log

*The making of Janus, kept as it happens. Raw material for build-in-public
posts and the final case study. Newest at the bottom.*

---

## 2026-10-10 — The idea survives the kill list

Ran a viability sweep across all 9 side-project ideas with the same strict
bar that killed the mortgage idea (real gap + moat). 6 kills in one night:
Interior Design Share, Artist Commission, Animation Review, Push-Up, Fitness
Share (+ Mortgage earlier). Survivors: the iOS↔Android converter (this
project) as the **attention bet**, Pre-Call Sales Brief as the **business
bet**. Everything else is portfolio-only or dead.

*Story beat: "I killed 6 of my own ideas in one night before writing a line
of code."*

## 2026-10-10 — Web V1 ships in a day

Frontend scaffold (Vite + React + TS + Tailwind), Cloudflare Worker backend,
Gemini vision against a 19-check iOS→Android taxonomy. Pushed to GitHub,
deployed to Cloudflare. Hit two real problems and fixed both: Google retired
the model we'd wired up (`gemini-2.5-flash` 404s for new users → switched to
`gemini-3.8-flash`), and the API secret needed a dashboard round-trip.
End-to-end verified with a synthetic iOS screenshot: 4 correct findings.

*Story beat: shipping velocity — idea to working product in one day.*

## 2026-10-10 — The bidirectional pivot

Founder call: one-directional was half a product. An Android-first designer is
exactly half the audience. Rebuilt the taxonomy as directional (19 checks
each way), added an iOS / Android / auto-detect source toggle. The product
got its identity from this decision.

*Story beat: the one decision that doubled the audience.*

## 2026-10-10 — The name: Janus

Two finalists: **Janus** (two-faced god — the duality IS the product) vs
**Proteus** (shape-shifter — keeps expansion open). Collision check killed
Proteus: Flipkart already ships an Android layout engine called Proteus, and
Labcenter owns it commercially. Janus's collisions are all small and
unrelated. The "trap" to iOS/Android turned out to be positioning, not a
limitation. Tagline: *"See your design through the other platform's eyes."*

*Story beat: how a 10-minute trademark check picked the name.*

## 2026-10-10 — Authority, not vibes (in progress)

Founder call: he's not a native mobile dev, so his word can't be the
taxonomy's authority. Every check is being verified against Apple's HIG and
Material Design 3, corrected where the docs disagree, and cited — findings
link to the official guideline. Checks that can't be grounded get flagged
honestly instead of pretending.

*Story beat: "my product's brain is cited like a research paper."*

## 2026-10-10 — Show, don't tell (in progress)

Founder call: findings need numbered pins on the screenshot itself — no
back-and-forth between text and image. Model returns bounding boxes per
finding; the results screen renders numbered markers; tapping a finding
pulses its pin.

---

## 2026-10-10 — Two theses, not one (founder correction)

Janus and Trolley are separate ideas sharing one instinct — collapsing the
distance between intent and production output:

- **Janus (dev tool):** screenshot analysis now (V1, shipped); native app
  next (V2, dogfooding + craft showcase); **final form: point it at your
  codebase (or a clone) and it ports the UI to Kotlin for you.** The
  analyzer is the wedge; the porter is the vision.
- **Trolley (designer thesis, separate track):** systemize a design system
  into something *promptable* — so you can prompt an app in a company's
  design language and get output in its actual components, not a generic
  MVP you have to rebuild. Parked, not dead.

## What's next

1. Features land → verify live.
2. **Native app design** — the founder's craft step. Web V1 was the proof;
   the native app is the portfolio piece.
3. Post the design → build it → post the build → case study, all from this log.
4. Long arc: Janus grows toward codebase-in / Kotlin-out.

## 2026-10-11 — First real-world failure (and fix)

Myles uploaded a real screenshot Sunday morning and got "Analysis failed."
Diagnosis: not his image, not our code — Gemini itself returned 503
(model overloaded). The worker was masking all non-rate-limit errors as a
generic 502. Fix: retry transient 503/500s twice with backoff, and surface
a distinct "AI service is busy — try again in a minute" message.

*Story beat: the first bug report came from the founder dogfooding it.*

## 2026-10-11 — Findings UX overhaul: "look native" means no tiers

Founder product thesis, implemented as one coherent redesign:

- **Severity tiers killed.** must/should/nice are gone from the taxonomy, the
  AI prompt, the API schema, and the UI. The reasoning: Janus promises "look
  native" — a "nice to fix" left unfixed still reads as a port, so every
  finding is required. Findings group by category (Navigation, Typography,
  Components, Touch & Layout, Motion, Iconography) in taxonomy order instead.
- **Multi-screenshot upload (up to 4).** Each screenshot gets its own analysis
  call, run max 2-at-a-time against the free-tier limit, with per-screenshot
  progress and per-screenshot retry on failure.
- **Inline crops per finding.** Every finding card now shows a zoomed crop of
  its flagged region (CSS cut from the uploaded screenshot) next to the fix —
  problem and solution in the same place. The numbered screenshot map stays
  as the per-screenshot overview.
- **Content index.** Sticky sidebar (desktop) / collapsible drawer (mobile):
  Screenshot → category → finding, click to jump and highlight.
- Checklist regenerated in the new format (categories, no severities).

*Story beat: the founder looked at severity tiers and said "all of it needs
to be fixed or it still looks like a port" — and he was right.*

## 2026-10-11 — "Still working" state

Follow-up to the slow-model wart: after 15s of analysis the UI now says
"Still working — the AI service is slow right now. This can take up to a
minute; your screenshots are safe." instead of a dead-feeling spinner.

## 2026-10-11 — Direction toggle removed

Founder call: the "What are you uploading?" toggle is gone — the platform
is always auto-detected per screenshot. One less decision before the value.

## 2026-10-11 — Fix library (46 one-liners)

Founder call: pre-write every fix instead of letting the model improvise.
All 46 checks now carry a one-line FIX ("Change the Material navigation
bar to the Apple tab bar") in the taxonomy, resolved server-side — the
model only detects and localizes now. Cheaper, consistent, red-pennable.
Cards show the FIX line; full card redesign (stacked iOS 26 / Material 3
boxes, in-box source links, collapsible categories, sticky index) planned
next.

## 2026-10-11 — Spend guardrail

Founder: "will you monitor to make sure i dont hit 20?" Yes. Worker now
logs per-analysis token counts to a KV ledger; a daily check estimates
month-to-date spend and paces it against the $20 cap (warns at $15 MTD,
on pace-over, or single-day spikes). At ~$0.015/analysis, the cap is
~1,300 analyses/month — testing will never get close.

## 2026-10-11 — Crop bug fixed

Founder caught it: finding crops showed the wrong part of the screenshot.
Diagnosis: the model was right (correct bbox); our CSS crop math assumed
a square image, so vertical offsets were wrong on tall phone screenshots.
Replaced with a canvas crop (pixel-exact, padded 8%). Map pins were
unaffected — only the thumbnail zoom was wrong.

## 2026-10-11 — Finding card + menu redesign (founder-specified)

Every item from the founder's review, built in one pass:
- Pattern boxes stack vertically, labeled "iOS 26" / "Material 3" from the
  taxonomy (never hardcoded) — the old "ANDROID PATTERN"/"iOS · HIG" labels
  are gone.
- Each pattern box carries its own "source" hyperlink (Apple doc in the iOS
  box, Material/Android doc in the Material box); the bottom source row and
  the rationale quote are removed from the card.
- Screenshot thumbnail removed from the card's left edge; a collapsed
  "Show screenshot" toggle reveals the canvas region crop at full card
  width.
- Findings index: categories are collapsible accordions; the sidebar is
  now TRULY sticky (the old code put `sticky` on an inner div whose parent
  was exactly its own height — nothing to stick within — so it never moved;
  sticky now sits on the <aside> flex item itself with self-start).
- Category groups in the main content are collapsible accordions too;
  jumping from the index auto-opens a collapsed group first.

## 2026-10-11 — Screenshot lightbox

Founder feedback: the full-width crop stretched and looked ugly. Crop now
renders at natural size; clicking it opens a lightbox (dimmed page, closer
look, Escape/backdrop/X to close).

## 2026-10-11 — Consistency via consensus voting

Founder caught run-to-run variance (5→4 findings, same screenshot).
Temperature 0 didn't fix it — Gemini's serving stack isn't deterministic
even at temp 0. Fix: 3 parallel model passes per analysis, keep findings a
majority (2/3) agree on, average their regions. Verified: 3 analyses of the
same screenshot now return identical finding sets. ~$0.045/analysis.

## 2026-10-11 — Source link audit + fixes

Founder clicked through and found dead/mismatched source links. Audit of all
23 m3.material.io URLs against their sitemap: 2 dead (foundations restructure
killed /foundations/accessible-design -> now /foundations/designing/structure;
motion easing page moved to /easing-and-duration/tokens-specs). Also fixed the
source picker: it matched on label prefixes and fell back to the first source,
so the Material box on the icon check linked Apple's SF Symbols page. Now
matches on URL host first and never falls back across platforms (no link beats
a wrong-platform link).

## 2026-10-11 — Tie-breaker judge for consistency

Founder ran 5 analyses of one screenshot: 2-3 findings, touch-target and
type-scale flipping. 2/3 voting can't settle ~50/50 model judgments. New
pipeline: 3 parallel passes -> unanimous verdicts stand -> split votes go to
a focused tie-breaker pass (single-check yes/no with visual evidence, strict:
ambiguous = drop). Summary prompt constrained to mention only consensus
findings. Verified: 5/5 identical finding sets on a screenshot that flipped
before. ~$0.06/analysis.

## 2026-10-11 — Deterministic result cache

Founder's 5-run test still showed a flip (FAB 3/5): the tie-breaker itself
can coin-flip a genuinely ambiguous call. New rule: identical image bytes
always return identical findings, via a SHA-256-keyed KV cache (7-day TTL).
Cache key includes PIPELINE_VERSION (bumped on any prompt/taxonomy/voting
change, so fixes are never masked). Vote+judge pipeline still runs for every
new image. Bonus: repeat analyses are instant and free. Verified: 28s fresh,
0.7s cached, byte-identical findings.

## 2026-10-11 — Multi-region findings + icon deep links

Founder: bottom bar has 3 elements (left FAB, Ask AI box, half-visible right
FAB) but the pipeline deduped to one finding per check, so repeats were
silently dropped. New: the model may return the same check for multiple
distinct elements (overlap-IoU dedup kills true duplicates); votes cluster by
(check_id, region); UI keys are unique (check_id#2…); numbering/map/jump all
use the unique key. Verified: one icon check returned 6 distinct icon
findings, keys unique.

Also his ask: icon findings now link the EXACT counterpart instead of the
Material git repo. Model names each icon; worker maps SF<->Material names
(~50 common aliases) and deep-links the Material icon's Google Fonts page
(search URL = robust target) in the Material box. Apple has no per-symbol web
pages, so the iOS box shows the exact SF Symbol name as copyable text.
PIPELINE_VERSION 6 (cache invalidated).

## 2026-10-11 — Holistic bottom input cluster (founder feedback)

Founder on the Notion AI screen: (1) back-gesture fix linked Top App Bar docs
— citation didn't match the fix; (2) FAB finding treated one button atomically
when the bottom cluster (FAB + prompt bar + FAB) wants a holistic answer;
(3) asked for Material best-practice research on that pattern.
Research: not a nav bar (destinations only) and not a bottom app bar (no text
fields) — the Material-native answer is the M3 Search Bar (56dp, leading icon
slot, supporting text, up to two trailing icons; mic is the canonical
trailing example). comp-fab now carries the exception: input-adjacent
floating buttons -> convert the cluster to a Search Bar, region around the
whole group. Source orders fixed (predictive-back first; m3 icons overview
before the github repo). PIPELINE_VERSION 8.

## 2026-10-11 — Search Bar IS the trigger pattern (founder pushback)

Founder: the middle element isn't a search field, it's a button opening an AI
modal — with a Figma M3 search-bar example for reference. He's right about the
trigger, but that IS the Search Bar pattern: M3 defines it as a persistent bar
whose tap opens a full-screen input modal (SearchView). Fix text now names the
modal mapping explicitly. PIPELINE_VERSION 9.

## 2026-10-11 — Batch upload (founder-approved scope)

Problem statement says "translate every screen twice" — single-upload was a
demo constraint. Now: up to 10 screenshots per batch, 4 concurrent analyses
(paid Tier 1 quotas), per-file progress, and a "Fix once, apply everywhere"
rollup showing checks that repeat across screens (fix in theme/design system,
not per screen). Included in the markdown export. Verified: parallel analyses
with correct independent direction detection. NOTE: /tmp is ephemeral across
VM replacements — test screenshots there vanish; use workspace uploads.

## 2026-10-11 — Item-based results (dogfood feedback)

His red-pen via use: findings were grouped by taxonomy category (Nav, Type,
Components) — he wants them grouped by UI ITEM: the bottom nav bar is item
one (bar + its icons), the top search bar is item two (bar + its icons +
text). Implemented as geometry clustering: regions containing each other's
centers merge (union-find), named after the largest region's finding, ordered
bottom-of-screen first. Regionless (global) findings go in a leading "Whole
screen" group. Item sections are collapsible, default open; the annotated
screenshot is now the only thing collapsed by default. Map badge click now
jumps to the finding card (was: pointless re-flash on the map); card number
click opens the collapsed map and highlights. Content index + markdown export
follow the item grouping. Also: new comp-searchbar / a2i-comp-searchbar checks
(the model had caught a barcode icon inside a search bar but missed the bar
itself); prompt nudge to scan nav/tab/toolbar icons individually. Verified:
fresh analysis fires comp-searchbar; clustering unit-tested on real regions.
PIPELINE_VERSION 10.

## 2026-10-11 — Icon findings v2 (dogfood feedback)

His red-pen: icon cards read as prose ("a sentence explaining what it is")
instead of naming the swap. Now: each icon finding leads with the glyph
itself (self-hosted: 53 Material SVGs + 57 SF PNGs under public/icons/),
the exact symbol names ("house" → "home"), and a copy button (SwiftUI
`Image(systemName:)` / Material name). Fix line is dynamic: "Change the iOS
pin icon to the Material push_pin icon." When no exact counterpart exists,
the card shows the model's closest-equivalent recommendation with a "Closest
match" badge. Model must now name the icon (detail) and its counterpart on
every icon finding — never empty. External deep links kept. PIPELINE_VERSION 11.

## 2026-10-12 — Speed diagnosis + Pro swap + red-pen round 4

**Speed (founder-timed):** 4 screenshots = 7:26; 7 = 13:59. Four optimizations
(progressive consensus, low thinking, image downscale, prompt caching) barely
moved it. Worker timing logs found the truth: one Flash vote took 7.7s/716 out
tokens, its pair took 90.6s/**16,483 out tokens** — occasional runaway
generations dominate everything. API can't bound output: `maxOutputTokens` and
schema `maxItems` both return 400 on this endpoint (verified by isolation).

**Model swap (founder's call):** votes moved Flash → `gemini-3.1-pro-preview`
(`gemini-3.8-pro` doesn't exist; `gemini-3-pro-preview` retired). Result: same
screenshot 1:47 → 21s, votes byte-consistent (850/850, 343/343 tokens).

**Red-pen round 4 (Fandango "Movies" screenshot):**
- Direction was flipped: model read Material-style components and ignored the
  iOS chrome. Fix: prompt now decides platform from OS CHROME first; chrome
  wins over component styling (cross-platform apps borrow components); the
  "ignore chrome" rule now carves out direction detection.
- Item order: groups were sorted bottom-up; pins/list now run top-down in
  on-screen order (`groupByItem` sort flipped).
- Source symmetry: card showed an iOS source link but no Material one on the
  font finding. Audit found 15/48 checks missing one platform's citation —
  all 15 filled from already-verified doc URLs (incl. Apple HIG — Motion).
- Missed search bar + zip/location pill, and nav-bar icon findings: expected
  to follow the direction fix; founder to re-test.
PIPELINE_VERSION 18.

## 2026-10-12 — Red-pen round 5 (6 screenshots, 35s on Pro)

Speed confirmed at scale: 6 screenshots in 35s end-to-end. "Fix once, apply
everywhere" rollup landed well with the founder.
- **Lists and menus were unflaggable**: the taxonomy had NO list or menu
  check at all — model caught icons inside them but had no container check
  to return. Added 4 checks (52 total): `comp-list`, `comp-menu`,
  `a2i-comp-list`, `a2i-comp-menu`, each citing both platforms' docs.
- **Container-scanning rule**: prompt now requires flagging the container's
  check in addition to the icons inside it.
- **False "not a UI screenshot" verdicts** (4 of 6 screens wrongly cleared):
  the empty-findings escape hatch was too easy. Prompt now treats every
  image as app UI unless it has NO interface elements at all, and a
  zero-finding summary must name what was verified as native.
PIPELINE_VERSION 19.

## 2026-10-12 — Red-pen round 6 (Android batch, a2i direction)

First android-to-ios batch. Screenshot 2 fully correct; screenshot 1 mostly.
- **Banner lied**: static "every one needs addressing" even when screens had
  0 findings. Banner now counts done screens and says "N of M need
  addressing; the rest already read native" when mixed.
- **Icon doc links broken (a2i)**: SF Symbols source URL had a bogus
  `/overview/` suffix; the GitHub icon repo was listed before the M3 icons
  doc and won the link slot. Reordered + URL fixed. Also removed a stray
  Xcode legal-PDF source from the i2a icon check.
- **Source icon names missing (a2i)**: model returned counterparts but no
  `detail`, so cards said "Icon not identified" and exact pairs (history ↔
  clock.arrow.circlepath, in the map all along) showed as "Closest match".
  Prompt now demands the screenshot-platform library name with Material
  examples; sanitizeDetail normalizes spaces→underscores instead of
  rejecting multi-word answers.
- **Icon items over-merged**: ALL icon findings collapsed into one item, so
  top-of-page buttons and a mid-page button shared an item. Icon clusters
  now merge only when their regions are near (gap ≤ 90/1000) — separate
  screen areas get separate items.
- **Button missed around a flagged icon**: container rule now names buttons
  explicitly — an icon inside a button doesn't discharge the button check.
- **Photos of screens dismissed as "no interface"**: rule now says a
  photograph OF a screen counts; analyze the interface in it.
PIPELINE_VERSION 20.

## 2026-10-12 — Round 6 verification + upload hardening + results nav

- **Blank-upload bug (the real cause of "no interface elements")**: the two
  .jpg test files (LocalSend Settings/Selection — dense Material UI) decoded
  to a BLANK canvas in the browser downscale (suspected HEIC bytes behind a
  .jpg name), and the blank JPEG was uploaded silently, producing a fake
  "already native" verdict. Proven by running the same content through the
  pipeline server-side: rich findings, incl. the new grouped-list check.
  Fix: downscaler verifies its canvas isn't flat/uniform, falls back to the
  original file on blank or decode failure, and one bad file can't kill the
  batch. Honest errors over fake verdicts.
- **Results navigation**: findings index labels (Screenshot N) now click to
  jump to that section; screenshot sections are collapsible from their
  headers; jumps auto-expand a collapsed section.
- **Testing process**: founder flagged the manual dogfood loop as slow.
  Agreed to trial a regression harness LATER (saved corpus + encoded
  expectations from his red-pens; Muse runs it before deploys). Deferred
  by his call 2026-10-12 — not yet built.

## 2026-10-12 night — Foundation reset to stock shadcn defaults (branch)

Founder correction: the look the foundation rebuild preserved (teal,
Inter, stone) was AI-improvised styling from the original generation,
not his design. Direction: start from stock defaults; he directs token
customization from there, one change at a time.

- Theme reset to the exact shadcn base-nova defaults (harvested from a
  fresh CLI scaffold, not memory): neutral oklch palette, primary
  near-black, radius 0.625rem, Geist Variable font. `--primary-dark`
  removed; ui primitives regenerated to stock; `accordion` added.
- 125 hardcoded palette classes (teal/stone/rose/amber) across the app
  components swept to semantic tokens.
- Accordion conversions: findings-sidebar item groups, results item
  groups, and the annotated-screenshot panel now use the stock shadcn
  Accordion (controlled state wired into jump-to-finding / locate-on-map).
- Verified: build clean, lint 0 errors; preview version 0d83458f serves
  the stock theme (primary oklch(20.5% 0 0), no teal hex in CSS).
- Still unmerged/unpushed-to-production: branch `ui-foundation-shadcn`.

## 2026-10-12 night — Out-of-the-box strip (branch)

Founder: "completely strip everything, I want it out the box." Every
shadcn component is now used exactly as shipped — no className
overrides on Card/Badge/Button/Alert/Progress/Separator/Accordion.
Finding cards compose from stock CardHeader/CardTitle/CardContent;
the jump highlight ring moved to the results wrapper div; pattern
boxes are uniform stock muted/accent; PatternBox link decorations and
the dead `hover:text-primary-dark` reference removed. Build clean,
lint 0 errors. Preview version 73f5f861.

## 2026-10-13 — Founder-directed UI pass: findings become Items

The founder reviewed the stock build against the shadcn docs demos and
directed a five-part pass, then amended it mid-flight:

- **Findings are Items, not Cards** — "they are items within a card, not
  a card within a card." FindingCard now composes the stock Item
  primitives (outline variant, sm size) inside an ItemGroup; the FIX /
  platform boxes inside were tightened (p-3.5 → p-3, stack space-y-3 →
  space-y-2). Summary, patterns, and analyzing surfaces remain Cards.
- **Card outline investigation:** the founder disputed that the docs
  cards read clearer "because of the background." Verified by pulling
  both sites' code: the stock Card edge is `ring-1 ring-foreground/10`
  on Janus AND on ui.shadcn.com — identical class lists, no border at
  all. The docs shot was a magnified crop plus the preview panel's own
  real border. At his direction, `ui/card.tsx` now uses a real
  `border border-border` so cards have a visible outline.
- **Progress is stock everywhere** — the custom per-file bars and their
  keyframes are deleted; per-file rows use Progress with value=null
  (Base UI indeterminate). QA caught that the stock Progress file
  leaves the indeterminate state completely unstyled (invisible bar),
  so the primitive carries a documented functional patch:
  data-indeterminate slide classes + a --animate-progress-indeterminate
  theme token in index.css.
- **Findings sidebar** follows the shadcn Tags scroll-area demo he
  picked: bordered panel, "Findings" header over a hairline, and the
  React Aria ScrollArea variant (aria-nova registry file) scrolling it.
- **Source links** use the stock Button link variant (shadcn has no
  link component/default link style).

Two previews: 36cab641 (QA caught the dead indeterminate bar) →
ecc78653 (verified: sliding segment renders, panel clean, findings
read as bordered items). Branch only — production untouched, merge is
still the founder's call.

## 2026-10-13 (later) — The case of the vanishing side borders

The founder reported the finding Items' side borders were absent in HIS
Chrome while present in every QA capture — no flicker on resize, scaling
and per-site zoom both verified 100% on his PC. Research found the bug
class: Chromium's GPU-accelerated painting drops hairline borders on
elements inside composited, overflow-hidden containers (the accordion
panel); accordion-specific vanishing-border reports exist, and the
documented workaround is drawing the line as an inset box-shadow,
which paints with the element instead of as a border. The QA browser
renders in software (VM), which is why it never reproduced. Fix: Card,
the Item outline variant, and the findings panel now carry
`ring-1 ring-inset ring-border` behind the border. Verification is the
founder's own browser this time — preview ecc78653 superseded.

## 2026-10-13 (later still) — Ring backing reverted; accordion is the suspect

The founder rejected the inset-ring backing (reads as a thickened
border where border and ring both paint) and directed it reverted —
done, outlines are plain `border border-border` again. His diagnosis,
which the evidence supports: every element that loses its sides for
him lives inside the results group accordion; every card that renders
fine sits outside one. Removing the findings from the group accordion
(static group sections instead) is teed up as his call.

## 2026-10-13 (night) — Findings leave the accordion

At the founder's direction, the results item-groups are no longer a
shadcn Accordion: each group is now a static section (header + count +
ItemGroup). The accordion panel — an overflow-hidden, height-animated,
composited container — is the prime suspect in the vanishing-side-
borders bug on GPU-accelerated Chrome, and every element he reported
as fine sat outside one. Group collapsing goes away; index jumps
simplify (no closed group to open before scrolling). The annotated-
map accordion and the screenshot-section collapse toggle are separate
mechanisms and stay. His browser is the verification: if the Items'
side borders now render for him, the diagnosis is proven.

## 2026-10-13 (night) — Vanishing borders: VERIFIED FIXED; patterns become Items

The founder loaded the de-accordioned preview in his own Chrome:
"yep all cards are fixed now." His diagnosis was the correct one —
the group accordion's composited panel was eating the Items' side
borders on GPU-accelerated rendering; outside it, they paint. Saga
closed (two of my earlier explanations — border tint, sub-pixel
flicker — were wrong; his screen was the ground truth throughout).

Same night, same rule applied one level up: the "Fix once, apply
everywhere" Card held card-looking rows (`rounded-xl bg-muted` list
items). Per his direction they're now shadcn Items (ItemGroup +
Item variant="muted" — the filled variant, closest to the old rows;
title + fix in ItemContent, the "N of M screens" count in
ItemActions). Standalone surfaces (summary, analyzing, error) remain
Cards, per the standing rule: stands alone → Card; sits in a list →
Item.

## 2026-10-13 (night) — Icon copy button goes icon-only

The founder's standard for the icon copy button: a dev expects it to
hand over the exact thing they'd paste into code to get the icon
they're looking at — which it already did (SwiftUI snippet for SF
Symbols, the bare name for Material). His refinement: say it in as
little text as possible — ideally none. The labeled outline button
("Copy SwiftUI" / "Copy name") is now an icon-only button (Copy glyph,
swapping to a Check when copied); the words moved to the accessible
label and hover title.

## 2026-10-13 (night) — Screenshot crops get breathing room

"Some of these screenshots need the spacing tweaked" meant the region
CROP inside a finding: for small regions (a lone chevron button) the
flat 8% padding was a few pixels — the icon nearly touched the crop
edges and looked cramped, while large regions (a toolbar) looked
fine. Crop padding is now proportional (35% of the region) with a
floor of 28 per-mille units, so every crop carries a minimum ring of
context around the flagged element. Applies to the lightbox too
(same component).

## 2026-10-13 (night) — Pin number matches the badge

The numbered pin button beside the category badge was h-6 (24px)
against the badge's h-5 (20px) — a small height mismatch in the
finding header row. At the founder's direction ("same size as the
badge, for cohesion") the number is now h-5 w-5 with the digit at
10px, so the two sit at one height in the row. Applies to the muted
non-button fallback too.

## 2026-10-13 (night) — Copy button sits next to the icon name

The icon copy button was pushed to the box's right edge (ml-auto),
visually disconnected from the name it copies. At the founder's
direction it now sits directly beside the icon name chip in the
glyph row — glyph, name, copy — one glanceable unit.

## 2026-10-13 (night) — Findings become collapsible accordion items

Founder's proposal: the findings back into an accordion — per finding
this time — as a way to save space. With 38 findings a results page
is a wall; now each finding collapses to one row (pin number, category
badge, title) and expands on tap. Index and map jumps open the target
finding first, then scroll.

The border lesson shaped the build: the finding's outline lives on
the AccordionItem itself, not on a box nested inside the panel (the
exact nesting GPU Chrome dropped), and everything inside the panel
is borderless filled boxes. The panel's stock <p>-margin cascade is
neutralized so box spacing is unchanged. Founder's browser is the
verification, as always with this bug: if a line vanishes, this
reverts in one commit.

## 2026-10-13 (night) — Accordion findings: founder-verified, now default-open

The founder loaded the collapsible-findings build in his own Chrome:
"it worked" — the accordion-item outlines hold on his GPU (the
structure change did its job), and the collapse interaction works.
His one correction: don't default closed. The state model inverted
to match — ResultsScreen now tracks only the findings the user
collapses, so findings are expanded by default and late-arriving
results (retries) come up open too.

## 2026-10-13 (night) — Accordion chevron to the right edge

The collapsed-row chevron trailed the title text instead of sitting
at the row's right edge: the stock trigger's header wrapper shrink-
wraps its content inside the finding's header row, so the trigger
never spanned the row. The header row now grows that wrapper
([&>h3]:flex-1), letting the trigger — and its right-aligned
chevron — span the full row width.

## 2026-10-13 (night) — Annotated screenshot gets a Card; section chevron right

Two founder directions from his screenshots: (1) the annotated
screenshot now lives inside a Card — the map accordion (header +
panel) composes inside CardContent, so the map surface reads as a
card like the other standalone surfaces; (2) the screenshot-section
collapse chevron moved from the left of the "Screenshot N" header to
the right edge (button is now full-width, chevron last with ml-auto)
— every disclosure arrow in the results UI now sits on the right.

## 2026-10-13 (night) — Item groups (and General) collapse too

Founder: "give the items themselves an accordion — same with
general." The groups (Item 1, Item 2, …, General) now collapse from
their headers, chevron on the right, expanded by default. Deliberate
implementation choice: groups use the screenshot-section house
toggle (button + conditional render), not the Accordion component —
a real accordion would nest every finding item inside another
animated overflow-hidden panel, the exact configuration whose
borders GPU Chrome dropped. Same interaction, no panel. Index jumps
reopen a collapsed group before scrolling.

## 2026-10-13 (night) — Annotated screenshot padding mirrors the findings

Founder: decrease the annotated screenshot's padding and make it
mirror the findings. The map card carried the stock Card spacing
(16px) around an accordion, and the map figure had its own border —
two frames, deep inset. Now: the Card's vertical padding is zeroed
and its content inset is the findings' px-3.5, so the map header row
sits exactly like a finding header row; the figure drops its own
border (the Card's is the one frame now) and its radius matches the
finding boxes (rounded-xl); the caption inset follows to px-3.5.

## 2026-10-13 (night) — Divider between group title and findings

Founder: a divider between the item title (group header) and the
findings cards. A stock Separator now sits under each group header,
rendered only while the group is open (a collapsed group keeps just
its header row). Findings keep their rhythm below it (mt-2.5).

## 2026-10-13 (night) — Annotated screenshot card radius matches findings

Founder spotted it from two screenshots: the finding items are
rounded-lg (the theme radius, 10px) while stock Cards are
rounded-xl (+4px) — side by side, the annotated screenshot card's
corners were visibly rounder than every finding row around it. The
map card now carries rounded-lg. (The summary and patterns Cards
remain stock rounded-xl — they're page-level surfaces, not adjacent
to findings; flagged to the founder, his call if they should match
too.)

## 2026-10-13 (night) — FIX box inverted

Founder: "in some way emphasize the fix item so it stands out from
the other two." The FIX box was bg-muted — identical to the source
platform box — so the three boxes read as equals. The FIX is the
action, so it now takes the one treatment nothing else in the stack
uses: bg-primary with primary-foreground text (near-black in the
stock light theme, inverts in dark). The platform boxes stay quiet
muted/accent reference fills.

## 2026-10-13 (night) — Item groups get plain conversion names

Founder: instead of "Item 1 — Modal presentation and dismissal",
name the group for what the element is and what it becomes —
"iOS sheet to Material bottom sheet". Group names now come from a
plain-language pair map keyed by the primary finding's check id (all
52 checks covered, each pair in its check's conversion order); a
check with no pair falls back to its title. The "Item N —" prefix is
gone everywhere (headers, sidebar index, copied checklist — all read
from the same grouping). Two clusters with the same conversion on
one screen suffix the repeat ("… 2"). General keeps its name.

## 2026-10-13 (night) — Platform boxes: white with the FIX black as outline

Founder: playing off the inverted FIX — the two platform boxes drop
their light-gray fills for a white (card) surface with a thin
outline in the same black as the FIX fill (border-primary, 1px like
the card outlines). The pair now reads as one system: FIX = filled,
references = outlined. Applies to both pattern boxes and icon boxes;
source/target fills no longer differ (labels carry the distinction).
In dark theme the primary token inverts and the pairing survives.

## 2026-10-13 (night) — Platform-box outline treatment REVERTED

Founder tried the white + primary-outline platform boxes live and
didn't like them ("revert the outline thing"). Both pattern and icon
boxes are back to the stock fills (source muted, target accent).
The inverted FIX box stays — that part he likes. Do not re-propose
the outline treatment.

## 2026-10-13 (night) — Sidebar screenshots are accordions too

Founder (with a screenshot of the Findings sidebar): the screenshot
level of the index should collapse like the groups under it. Each
screenshot in the sidebar is now an AccordionItem — header row with
label, count, and the stock chevron; expanded by default, and a
screenshot opens as its analysis lands. The filename line under the
header stays a jump link to that screenshot's section (the header
click itself now toggles instead of jumping). Groups and findings
inside are unchanged.

## 2026-10-13 (night) — Hero copy reframed: spotter, not converter

Founder: the copy should be about helping you pick out what needs
fixing to make your app look native. Hero H1 "Will your design
survive the other platform?" → "Find what needs fixing to make your
app look native." Sub now: Janus picks out the patterns that make an
app look ported and gives the fix for each. Header tagline "See your
design through the other platform's eyes" → "Look native on both
platforms." Matches the standing product truth: Janus is a spotter,
not a translator.

## 2026-10-13 (night) — Browser tab title follows the new tagline

The QA text check caught the page <title> still carrying the old
tagline ("See your design through the other platform's eyes"). Now
"Janus — Look native on both platforms", matching the header.

## 2026-10-13 (night) — Hero left-aligned

Founder: the hero block (headline + sub) was centered; it's now
left-aligned at the page column's edge, still capped at max-w-xl
for line length.

## 2026-10-13 (night) — Hero alignment reverted to centered

Founder: "nvm go back" — hero is centered again, exactly as before
the left-align change.

## 2026-10-13 (night) — ui-foundation-shadcn MERGED and DEPLOYED

Founder gave the merge call. The branch (28 commits ahead, 0 behind,
base = old main 5409fd2) merged into main on GitHub as de46596.
Production source (this tree) synced to the merged main, rebuilt
(assets byte-identical to the final branch preview), and deployed
with wrangler: janus.mylezlan3.workers.dev now serves the stock
shadcn foundation build with the full founder-directed pass —
findings as default-open accordion items, collapsible groups with
plain conversion names, sidebar accordions at every level, annotated
screenshot in a radius/padding-matched Card, inverted FIX boxes,
and the "look native" hero copy. This tree is the canonical Janus
source going forward; the janus-foundation clone is the merged
branch's archive.

## 2026-10-13 (night) — Group divider stays; findings roll up/down

Founder: when a group collapses, its divider vanished with the
findings, and the collapse was instant. The Separator now renders
outside the collapsible region (always under the group header), and
the findings roll: a 300ms grid-template-rows transition slides them
up under the divider on collapse and back down on expand (content
stays mounted; sidebar jumps wait out the roll before scrolling).
QA-verified: divider present under a settled collapsed group, roll
both ways, jump-into-collapsed-group reopens + scrolls. (Groups
remain house toggles, not Accordion panels — GPU border rule.)

## 2026-10-13 (night) — Finding boxes become a grouped stack

Founder (with a screenshot): nested boxes shouldn't match their
container's radius 1:1, and the three boxes in a finding should read
as one group — outer corners fuller, meeting corners small. Now:
the finding item is rounded-lg (10px); the stack's outer corners
take rounded-md (8px, one step down, concentric-style); corners
where boxes meet take 4px (2px was tried first — read as sharp;
his reference is ~half the outer radius, still rounded). Spacing
unchanged: a tightened 2px internal gap was tried and reverted at
his direction — he likes the original 8px separation; only the
radii changed. The region-crop image takes the same step down
(xl → md).

## 2026-10-13 — Corners only for the platform pair; badges outlined

Founder refinements: (1) the grouped-corner treatment applies ONLY
to the iOS/Material boxes — the FIX box goes back to regular
rounded-xl all around. The pair keeps it: source box top = rounded-md,
meeting corners 4px, target box bottom = rounded-md. (2) All badges
(category, Closest match, direction pill) switch to the outline
variant — no filled badges in the results UI.

## 2026-10-13 — One stable preview link

Myles asked for a single preview address instead of a new link per
change. Set up `janus-preview.mylezlan3.workers.dev`: a tiny redirect
worker (source in `preview-redirect/`) that reads the newest version
snapshot URL from KV (`preview:latest_url` in janus-usage) and 302s
to it. Version history is unaffected — it lives in git + Cloudflare's
version list as before. Workflow addition: after every versions
upload, refresh the KV pointer. Verified end-to-end: the stable
address lands on the current build (200, current asset hashes).

## 2026-10-13 — Regression harness built; first run finds a credit outage

The deferred dogfood replacement is built (`harness/`): 4 LocalSend
corpus screens, expectations encoded from the founder's red-pens
(direction, must-flag / should-flag checks, min findings, the exact
history → clock.arrow.circlepath pair), a stdlib runner, and markdown
reports. First production run was blocked after one cached case:
**Gemini returned 402 — the prepaid credits are depleted.** Fresh
uploads to Janus fail right now; cached results still serve, which
masks the outage. The spend guardrail's blind spot is proven: its KV
ledger counts only successful analyses, so it reported $3.53 MTD /
OK while the real balance (incl. the Oct 12 runaway) reached zero.
Top-up needed (AI Studio, myleslane00). Owed: a real-balance probe
for the guardrail. The one scored case surfaced direction
instability on LocalSend (cached result ios-to-android; live QA the
same day produced android-to-ios) — which direction a Material-
designed app running on iOS converts to is the founder's call;
recommendation: target the platform it runs on.
