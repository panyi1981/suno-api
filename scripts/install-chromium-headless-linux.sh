#!/usr/bin/env bash
# Manual install for Playwright chromium-headless-shell on Linux VPS.
# Use when "node .../cli.js install" hangs after download (unzip is slow or OOM).
set -euo pipefail

REVISION="${PLAYWRIGHT_CHROMIUM_REVISION:-1169}"
CACHE="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
DEST="$CACHE/chromium_headless_shell-${REVISION}"
URL="https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium-headless-shell/${REVISION}/chromium-headless-shell-linux.zip"
EXEC="$DEST/chrome-linux/headless_shell"

echo "Revision: $REVISION"
echo "Destination: $DEST"
echo "URL: $URL"
echo ""

if [[ -x "$EXEC" ]]; then
  echo "Already installed: $EXEC"
  "$EXEC" --version 2>/dev/null || true
  exit 0
fi

echo "Disk:"
df -h "$CACHE" "$HOME" /tmp 2>/dev/null || df -h
echo ""
echo "Memory:"
free -h 2>/dev/null || true
echo ""

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ZIP="$TMP/chromium-headless-shell-linux.zip"
echo "Downloading..."
if command -v curl >/dev/null 2>&1; then
  curl -fL --progress-bar -o "$ZIP" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$ZIP" "$URL"
else
  echo "Need curl or wget." >&2
  exit 1
fi

echo "Extracting (may take 1-3 minutes on small VPS)..."
rm -rf "$DEST"
mkdir -p "$DEST"
if command -v unzip >/dev/null 2>&1; then
  unzip -q "$ZIP" -d "$DEST"
else
  python3 -c "import zipfile; zipfile.ZipFile('$ZIP').extractall('$DEST')"
fi

chmod +x "$EXEC"

if [[ ! -x "$EXEC" ]]; then
  echo "FAILED: $EXEC not found after extract." >&2
  find "$DEST" -type f | head -20
  exit 1
fi

echo ""
echo "OK: $EXEC"
"$EXEC" --version 2>/dev/null || true
echo ""
echo "Add to .env (optional):"
echo "PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$EXEC"
