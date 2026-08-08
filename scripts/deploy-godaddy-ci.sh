#!/usr/bin/env bash
# CI/local: upload dist/ to GoDaddy public_html/setuai.com via explicit FTPS (curl).
# Matches the GitHub Actions "Test FTP login" step that already passes on GoDaddy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FTP_SERVER="${FTP_SERVER:?FTP_SERVER required}"
FTP_USERNAME="${FTP_USERNAME:?FTP_USERNAME required}"
FTP_PASSWORD="${FTP_PASSWORD:?FTP_PASSWORD required}"
CLEAN_SLATE="${CLEAN_SLATE:-false}"
PARALLEL="${DEPLOY_PARALLEL:-6}"

DIST="$ROOT/dist"
BASE="ftp://${FTP_SERVER}:21/public_html/setuai.com"

if [ ! -f "$DIST/index.html" ]; then
  echo "::error::dist/ missing — run npm run build:godaddy first"
  exit 1
fi

echo "Deploying dist/ → ${BASE}/ (clean_slate=$CLEAN_SLATE, parallel=$PARALLEL)"
FILE_COUNT=$(find "$DIST" -type f | wc -l | tr -d ' ')
echo "Files: $FILE_COUNT  Size: $(du -sh "$DIST" | cut -f1)"

upload_one() {
  local file="$1"
  local rel="${file#${DIST}/}"
  curl -sS --ftp-ssl-reqd --ftp-pasv -k --connect-timeout 60 --max-time 600 \
    --fail --ftp-create-dirs \
    --user "${FTP_USERNAME}:${FTP_PASSWORD}" \
    -T "$file" "${BASE}/${rel}"
  printf 'OK %s\n' "$rel"
}

export -f upload_one
export DIST BASE FTP_USERNAME FTP_PASSWORD

if [ "$CLEAN_SLATE" = "true" ]; then
  echo "::warning::clean_slate: uploading over existing site (videos/ on server are preserved by mirror exclusions in full deploy)"
fi

find "$DIST" -type f -print0 | xargs -0 -P "$PARALLEL" -I {} bash -c 'upload_one "$1"' _ {}

echo "OK: FTPS upload finished ($FILE_COUNT files)"
