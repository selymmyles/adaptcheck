# Janus regression harness

Replaces manual dogfooding for pipeline changes. Encodes Myles's red-pen
verdicts (2026-10-11/12 dogfooding rounds) as expectations and scores the
live pipeline against them.

```bash
python3 harness/run.py            # against production
python3 harness/run.py --base-url https://<version>-janus.mylezlan3.workers.dev
```

Reports land in `harness/reports/` (markdown + raw JSON per case).

**How scoring works**
- `mustFlag` — checks Myles faulted Janus for missing, or that name the
  screen's dominant Material element. A miss = FAIL.
- `shouldFlag` — plausible; reported, never a failure.
- `iconPairs` — exact icon counterparts he confirmed (history →
  clock.arrow.circlepath must be exact, not "Closest match").
- Direction + minimum-findings + no direction-foreign check ids are hard
  gates. Everything beyond the expectations is listed as *unjudged* —
  precision still needs his verdicts; recall and regressions don't.

**Cache note:** the worker caches by image bytes + PIPELINE_VERSION, so a
re-run on an unchanged pipeline returns instantly and free. The harness
matters when PIPELINE_VERSION changes — run it before deploying prompt /
taxonomy / model changes.

**Corpus gaps (wanted from Myles):** the Fandango "Movies" screenshot
(round 4's direction-flip case) and a Claude settings screen. Drop them in
`harness/corpus/` and add cases to `expectations.json`.
