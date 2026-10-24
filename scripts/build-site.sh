#!/usr/bin/env bash
# Assemble the GitHub Pages artifact: static site + latest bot data (bot-data branch) + local training log.
set -euo pipefail
OUT="${1:-_site}"
rm -rf "$OUT" && mkdir -p "$OUT/data"
cp site/index.html site/style.css site/app.js site/control.js site/bot-config.json "$OUT/"
cp -r site/vendor "$OUT/vendor"
[ -d site/data ] && cp -r site/data/. "$OUT/data/" || true
if git ls-remote --exit-code --heads origin bot-data >/dev/null 2>&1; then
  git fetch -q --depth=1 origin bot-data
  tmp="$(mktemp -d)"
  git archive origin/bot-data data | tar -x -C "$tmp" || true
  [ -d "$tmp/data" ] && cp -r "$tmp/data/." "$OUT/data/"
fi
touch "$OUT/.nojekyll"
echo "site assembled in $OUT ($(find "$OUT" -type f | wc -l) files)"
