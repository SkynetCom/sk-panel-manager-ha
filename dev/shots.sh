#!/bin/sh
# Regenerates the README screenshots from the demo (needs Google Chrome).
# Serve the repository root first:  python3 -m http.server 8766
set -e
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE:-http://localhost:8766}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/docs"

shot() { # name size url
  "$CHROME" --headless=new --hide-scrollbars --disable-gpu --force-device-scale-factor=${SCALE:-2} \
    --window-size="$2" --virtual-time-budget=8000 --screenshot="$OUT/$1" "$BASE/$3" >/dev/null 2>&1
  echo "docs/$1"
}

for lang in en es; do
  sfx=$([ "$lang" = en ] && echo "" || echo ".es")
  shot "overview$sfx.png" 1440,900  "dev/demo.html?shot=1&lang=$lang&tab=overview"
  shot "matrix$sfx.png"   1440,860  "dev/demo.html?shot=1&lang=$lang&tab=matrix"
  shot "user$sfx.png"     1440,1180 "dev/demo.html?shot=1&lang=$lang&tab=users&user=u_tomi"
  shot "profile$sfx.png"  1440,1100 "dev/demo.html?shot=1&lang=$lang&tab=profiles&profile=p_wall"
  shot "kiosk$sfx.png"    1440,1240 "dev/demo.html?shot=1&lang=$lang&tab=kiosk&layer=profile:p_kids&scope=dashboard-ninos"
  shot "settings$sfx.png" 1440,980  "dev/demo.html?shot=1&lang=$lang&tab=settings&dark=1"
  shot "mobile$sfx.png"   390,844   "dev/demo.html?shot=1&lang=$lang&tab=users&user=u_tablet"
  shot "flow$sfx.png"     1600,600  "docs/src/flow.html?lang=$lang"
  shot "banner$sfx.png"   1280,640  "docs/src/banner.html?lang=$lang"
done
