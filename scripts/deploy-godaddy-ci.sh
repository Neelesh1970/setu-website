#!/usr/bin/env bash
# CI/local: upload dist/ to GoDaddy via explicit FTPS (AUTH TLS on port 21).
# GoDaddy rejects implicit ftps:// handshakes — use ftp:// + ftp:ssl-force true.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FTP_SERVER="${FTP_SERVER:?FTP_SERVER required}"
FTP_USERNAME="${FTP_USERNAME:?FTP_USERNAME required}"
FTP_PASSWORD="${FTP_PASSWORD:?FTP_PASSWORD required}"
CLEAN_SLATE="${CLEAN_SLATE:-false}"

if [ ! -f dist/index.html ]; then
  echo "::error::dist/ missing — run npm run build:godaddy first"
  exit 1
fi

if ! command -v lftp >/dev/null 2>&1; then
  echo "Installing lftp..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo apt-get install -y lftp
  elif command -v brew >/dev/null 2>&1; then
    brew install lftp
  else
    echo "::error::lftp not found"
    exit 1
  fi
fi

DELETE_OPT=""
if [ "$CLEAN_SLATE" = "true" ]; then
  DELETE_OPT="--delete"
fi

export HOME="${HOME:-$RUNNER_TEMP:-/tmp}"
NETRC="$HOME/.netrc"
printf 'machine %s\nlogin %s\npassword %s\n' \
  "$FTP_SERVER" "$FTP_USERNAME" "$FTP_PASSWORD" > "$NETRC"
chmod 600 "$NETRC"

echo "Deploying dist/ → ftp://$FTP_SERVER/public_html/setuai.com/ (clean_slate=$CLEAN_SLATE)"
echo "Files: $(find dist -type f | wc -l | tr -d ' ')  Size: $(du -sh dist | cut -f1)"

lftp <<LFTP_EOF
set net:timeout 90
set net:max-retries 3
set ssl:verify-certificate no
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ftp:ssl-protect-list true
set ftp:passive-mode true
set cmd:fail-exit yes
open ftp://${FTP_SERVER}:21
cd public_html/setuai.com
lcd ${ROOT}/dist
mirror -R --parallel=4 --verbose ${DELETE_OPT} \
  --exclude-glob .git* \
  --exclude-glob **/node_modules/** \
  --exclude-glob **/assets/public/khatima/originals/** \
  --exclude-glob DEPLOY-CHECKLIST.txt
bye
LFTP_EOF

rm -f "$NETRC"
echo "OK: FTPS upload finished"
