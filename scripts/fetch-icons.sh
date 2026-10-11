#!/usr/bin/env bash
# Download self-hosted icon assets for the SF<->Material alias map.
#   public/icons/material/<name>.svg  — Material Symbols (Outlined, official)
#   public/icons/sf/<name>.png        — SF Symbols (via andrewtavis/sf-symbols-online)
# Re-run when the alias map in worker/gemini.ts changes.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/icons/material public/icons/sf

python3 - <<'PYEOF'
import io, re, json, urllib.request, os

s = io.open("worker/gemini.ts", encoding="utf-8").read()
m = re.search(r"const SF_TO_MATERIAL_ICONS: Record<string, string> = \{(.*?)\};", s, re.S)
pairs = re.findall(r'^\s*"?([a-z0-9._-]+)"?:\s*"([^"]+)"', m.group(1), re.M)

def fetch(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return "cached"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "janus-icon-fetch"})
        with urllib.request.urlopen(req, timeout=30) as r, open(dest, "wb") as f:
            f.write(r.read())
        return "ok"
    except Exception as e:
        return f"FAIL {e}"

ok_m = ok_sf = 0
for sf, mat in pairs:
    mu = f"https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/{mat}/materialsymbolsoutlined/{mat}_24px.svg"
    r = fetch(mu, f"public/icons/material/{mat}.svg")
    ok_m += r in ("ok", "cached")
    # Up-to-date SVGs (SF Symbols 7) via brendanballon/sfsymbols-svg; the old
    # andrewtavis PNG repo is 2022-vintage and missing symbols.
    sf_repo = {"clock.arrow.circlepath": "clock.arrow.trianglehead.counterclockwise.rotate.90",
               "thumbsup": "hand.thumbsup", "mic": "microphone", "doc.text": "text.document"}.get(sf, sf)
    su = f"https://raw.githubusercontent.com/brendanballon/sfsymbols-svg/master/symbols/{sf_repo}.svg"
    r = fetch(su, f"public/icons/sf/{sf}.svg")
    ok_sf += r in ("ok", "cached")
    if r.startswith("FAIL"):
        print(f"  sf/{sf}: {r}")

print(f"material: {ok_m}/{len(pairs)}, sf: {ok_sf}/{len(pairs)}")
PYEOF
