#!/usr/bin/env python3
"""Janus regression harness.

POSTs each corpus screenshot to the Janus /api/analyze endpoint (the same
contract the frontend uses) and scores the result against expectations.json,
which encodes Myles's dogfooding verdicts: expected direction, must-flag
checks, should-flag checks, minimum finding count, and exact icon pairs.

Usage:
    python3 harness/run.py [--base-url https://janus.mylezlan3.workers.dev]

Notes:
- The worker caches by image bytes + PIPELINE_VERSION, deterministically —
  re-running the same corpus against the same pipeline version returns the
  cached result instantly and free. The harness earns its keep when the
  pipeline version changes (prompt / taxonomy / model edits): run it before
  deploying those, and only failures need a human eye.
- "Extras" (findings beyond the expectations) are NOT scored — precision
  needs Myles's verdicts. They are listed in the report as unjudged.
"""
import argparse, json, sys, time, urllib.request, urllib.error, uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent

def post_analysis(base_url: str, image_path: Path, direction: str = "auto") -> dict:
    boundary = "----harness" + uuid.uuid4().hex
    data = image_path.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="screenshot"; filename="{image_path.name}"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + data + (
        f"\r\n--{boundary}\r\n"
        f'Content-Disposition: form-data; name="direction"\r\n\r\n{direction}\r\n'
        f"--{boundary}--\r\n"
    ).encode()
    req = urllib.request.Request(
        base_url.rstrip("/") + "/api/analyze",
        data=body, method="POST",
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            # Cloudflare error 1010 blocks the default Python UA outright.
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
        },
    )
    with urllib.request.urlopen(req, timeout=1200) as r:
        return json.loads(r.read())

def score_case(case: dict, result: dict) -> dict:
    findings = result.get("findings", [])
    ids = [f.get("id", "") for f in findings]
    id_set = set(ids)
    must = case.get("mustFlag", [])
    should = case.get("shouldFlag", [])
    out = {"id": case["id"], "screen": case["screen"]}
    out["direction_ok"] = result.get("detectedDirection") == case["direction"]
    out["detected_direction"] = result.get("detectedDirection")
    out["findings_count"] = len(findings)
    out["min_ok"] = len(findings) >= case.get("minFindings", 1)
    out["must_hit"] = [c for c in must if c in id_set]
    out["must_miss"] = [c for c in must if c not in id_set]
    out["should_hit"] = [c for c in should if c in id_set]
    out["should_miss"] = [c for c in should if c not in id_set]
    # direction-confusion guard: a2i results must only carry a2i- ids
    want_a2i = case["direction"] == "android-to-ios"
    out["foreign_ids"] = [i for i in id_set if i.startswith("a2i-") != want_a2i]
    # exact icon pairs
    pair_results = []
    for pair in case.get("iconPairs", []):
        match = next((f for f in findings
                      if f.get("id", "").endswith("icon-symbols")
                      and (f.get("detail") or "") == pair["detail"]), None)
        if match is None:
            pair_results.append({**pair, "ok": False, "why": "icon finding not returned"})
        else:
            ok = (match.get("counterpartName") == pair["counterpartName"]
                  and bool(match.get("counterpartExact")) == bool(pair["exact"]))
            pair_results.append({**pair, "ok": ok,
                                 "got_counterpart": match.get("counterpartName"),
                                 "got_exact": match.get("counterpartExact")})
    out["icon_pairs"] = pair_results
    judged = set(must) | set(should)
    out["extras"] = [{"id": f.get("id"), "title": f.get("title")}
                     for f in findings if f.get("id") not in judged]
    out["fail"] = (not out["direction_ok"] or not out["min_ok"]
                   or bool(out["must_miss"]) or bool(out["foreign_ids"])
                   or any(not p["ok"] for p in pair_results))
    return out

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="https://janus.mylezlan3.workers.dev")
    args = ap.parse_args()
    spec = json.loads((HERE / "expectations.json").read_text())
    stamp = time.strftime("%Y-%m-%d-%H%M")
    raw_dir = HERE / "reports" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    results, total_must, hit_must = [], 0, 0
    for case in spec["cases"]:
        img = HERE / case["file"]
        t0 = time.time()
        try:
            result = post_analysis(args.base_url, img, case["direction"])
        except urllib.error.HTTPError as e:
            # Free-tier RPM is tight (~2 fresh analyses/min): a 502 whose
            # body says "rate limit" gets ONE retry after a 65s pause.
            body = ""
            try: body = e.read().decode()[:400]
            except Exception: pass
            if e.code == 502 and "rate limit" in body:
                print(f"{case['id']}: rate-limited, waiting 65s and retrying once...")
                time.sleep(65)
                try:
                    result = post_analysis(args.base_url, img, case["direction"])
                    scored = score_case(case, result)
                    scored["seconds"] = round(time.time() - t0, 1)
                    (raw_dir / f"{stamp}-{case['id']}.json").write_text(json.dumps(result, indent=1))
                    results.append(scored)
                    total_must += len(case.get("mustFlag", []))
                    hit_must += len(scored["must_hit"])
                    print(f"{case['id']}: {'FAIL' if scored['fail'] else 'PASS'} "
                          f"({scored['findings_count']} findings, {scored['seconds']}s, after retry)")
                    time.sleep(65)
                    continue
                except Exception as e2:
                    results.append({"id": case["id"], "screen": case["screen"],
                                    "fail": True, "error": f"retry failed: {type(e2).__name__}: {e2}"})
                    continue
            results.append({"id": case["id"], "screen": case["screen"],
                            "fail": True, "error": f"HTTP {e.code}: {body}"})
            continue
        except Exception as e:  # network, timeout, bad JSON
            results.append({"id": case["id"], "screen": case["screen"],
                            "fail": True, "error": f"{type(e).__name__}: {e}"})
            continue
        (raw_dir / f"{stamp}-{case['id']}.json").write_text(json.dumps(result, indent=1))
        scored = score_case(case, result)
        scored["seconds"] = round(time.time() - t0, 1)
        results.append(scored)
        if scored["seconds"] > 3:  # a fresh generation happened; respect free RPM
            time.sleep(65)
        total_must += len(case.get("mustFlag", []))
        hit_must += len(scored["must_hit"])
        print(f"{case['id']}: {'FAIL' if scored['fail'] else 'PASS'} "
              f"({scored['findings_count']} findings, {scored['seconds']}s)")

    lines = [f"# Janus regression harness — {stamp}", "",
             f"Endpoint: {args.base_url}  ·  Cases: {len(results)}  ·  "
             f"must-flag recall: {hit_must}/{total_must}", ""]
    for r in results:
        lines.append(f"## {'❌ FAIL' if r['fail'] else '✅ PASS'} — {r['id']}")
        lines.append(f"_{r['screen']}_")
        lines.append("")
        if "error" in r:
            lines.append(f"- **Error:** {r['error']}")
            lines.append("")
            continue
        lines.append(f"- Direction: detected `{r['detected_direction']}` — {'ok' if r['direction_ok'] else '**WRONG**'}")
        lines.append(f"- Findings: {r['findings_count']} (minimum {r.get('min_ok') and 'met' or '**NOT MET**'}) in {r['seconds']}s")
        if r["must_miss"]:
            lines.append(f"- **Must-flag MISSED:** {', '.join(r['must_miss'])}")
        if r["must_hit"]:
            lines.append(f"- Must-flag hit: {', '.join(r['must_hit'])}")
        if r["should_miss"]:
            lines.append(f"- Should-flag absent (not a failure): {', '.join(r['should_miss'])}")
        if r["foreign_ids"]:
            lines.append(f"- **Direction-foreign check ids present:** {', '.join(r['foreign_ids'])}")
        for p in r["icon_pairs"]:
            if p["ok"]:
                lines.append(f"- Icon pair ✓: {p['detail']} → {p['counterpartName']} (exact)")
            else:
                lines.append(f"- **Icon pair ✗:** {p['detail']} → expected {p['counterpartName']} "
                             f"(exact={p['exact']}); got {p.get('got_counterpart', '—')} "
                             f"(exact={p.get('got_exact', '—')}) — {p.get('why', 'mismatch')}")
        if r["extras"]:
            lines.append(f"- Unjudged extras ({len(r['extras'])}): " +
                         "; ".join(f"{e['id']} — {e['title']}" for e in r["extras"]))
        lines.append("")
    fails = sum(1 for r in results if r["fail"])
    lines.append(f"**Overall: {len(results) - fails}/{len(results)} cases pass · "
                 f"must-flag recall {hit_must}/{total_must}.**")
    report = HERE / "reports" / f"report-{stamp}.md"
    report.write_text("\n".join(lines) + "\n")
    print(f"\nReport: {report}")
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
