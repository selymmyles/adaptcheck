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
