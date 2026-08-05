#!/usr/bin/env bash
# Packs the submission bundle and enforces the two Playables rules that are easy
# to break by accident: nothing may reach the network, and the initial load has
# to stay under the size ceiling.
set -euo pipefail
cd "$(dirname "$0")"

LIMIT_MB=30
OUT=dist/dpl-flick-cricket.zip
PACK=(index.html src)

echo "==> checking for external references"
if grep -rInE "https?://|//cdn\.|fetch\(|XMLHttpRequest|new WebSocket|import\(['\"]https" "${PACK[@]}" \
     --include='*.html' --include='*.js' --include='*.css' | grep -v '^\s*$'; then
  echo "FAIL: the bundle must be fully self-contained (no network calls, no remote assets)."
  exit 1
fi
echo "    clean"

echo "==> packing"
rm -rf dist
mkdir -p dist
zip -qr "$OUT" "${PACK[@]}" -x '*.DS_Store'

BYTES=$(wc -c <"$OUT" | tr -d ' ')
MB=$(echo "scale=2; $BYTES/1048576" | bc)
echo "    $OUT  ${MB} MB (${BYTES} bytes)"

if [ "$BYTES" -gt $((LIMIT_MB * 1048576)) ]; then
  echo "FAIL: over the ${LIMIT_MB} MB initial-load limit."
  exit 1
fi
echo "==> ok: ${MB} MB of a ${LIMIT_MB} MB budget"
