#!/usr/bin/env bash
# Upload dist/ to GoDaddy public_html/setuai.com/ via FTPS
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load local .env if present
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

FTP_SERVER="${FTP_SERVER:-184.168.116.6}"
FTP_USERNAME="${FTP_USERNAME:-my14ac4b46r3}"
FTP_PASSWORD="${FTP_PASSWORD:-}"

if [ -z "$FTP_PASSWORD" ]; then
  echo "ERROR: Set FTP_PASSWORD in .env or export it before running."
  echo "  FTP_SERVER=$FTP_SERVER"
  echo "  FTP_USERNAME=$FTP_USERNAME"
  exit 1
fi

if [ ! -d dist ]; then
  echo "ERROR: dist/ missing — run: npm run build:godaddy"
  exit 1
fi

if ! command -v lftp >/dev/null 2>&1; then
  echo "Installing lftp via Homebrew..."
  brew install lftp
fi

CLEAN="${CLEAN_SLATE:-false}"
echo "Uploading dist/ → ftps://$FTP_SERVER/public_html/setuai.com/ (clean_slate=$CLEAN)"
echo "Files: $(find dist -type f | wc -l | tr -d ' ')  Size: $(du -sh dist | cut -f1)"

NETRC="$(mktemp)"
chmod 600 "$NETRC"
printf 'machine %s\nlogin %s\npassword %s\n' \
  "$FTP_SERVER" "$FTP_USERNAME" "$FTP_PASSWORD" > "$NETRC"

DELETE_OPT=""
if [ "$CLEAN" = "true" ]; then
  DELETE_OPT="--delete"
fi

export HOME
HOME="$(dirname "$NETRC")"
mv "$NETRC" "$HOME/.netrc"

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
lcd $ROOT/dist
mirror -R --parallel=4 --verbose $DELETE_OPT \
  --exclude-glob .git* \
  --exclude-glob **/node_modules/** \
  --exclude-glob **/assets/public/khatima/originals/** \
  --exclude-glob DEPLOY-CHECKLIST.txt
bye
LFTP_EOF

rm -f "$HOME/.netrc"
echo ""
echo "Done. Check https://setuai.com and https://setuai.com/api/health.php"
