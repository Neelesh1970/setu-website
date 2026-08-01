#!/usr/bin/env bash
# Upload changed SPA + API files only (skip large videos). Uses curl FTPS.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
set -a
# shellcheck disable=SC1091
source .env
set +a

FTP_SERVER="${FTP_SERVER:-184.168.116.6}"
FTP_USERNAME="${FTP_USERNAME:?FTP_USERNAME required in .env}"
FTP_PASSWORD="${FTP_PASSWORD:?FTP_PASSWORD required in .env}"
BASE="ftp://${FTP_SERVER}:21/public_html/setuai.com"
DIST="$ROOT/dist"
AUTH="${FTP_USERNAME}:${FTP_PASSWORD}"

if [ ! -f "$DIST/index.html" ]; then
  echo "Run: npm run build:godaddy"
  exit 1
fi

JS=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$DIST/index.html" | head -1 | sed 's|assets/||')
echo "Uploading: index.html, .htaccess, assets/$JS, app.css.php, api/*"

upload() {
  local src="$1"
  local dest="$2"
  curl -sS --ftp-ssl-reqd --ftp-pasv -k --user "$AUTH" -T "$src" "${BASE}/${dest}"
  echo "OK ${dest}"
}

upload "$DIST/index.html" "index.html"
upload "$DIST/.htaccess" ".htaccess"
upload "$DIST/assets/$JS" "assets/$JS"
upload "$DIST/assets/app.css.php" "assets/app.css.php"
upload "$DIST/api/staging-proxy.php" "api/staging-proxy.php"
upload "$DIST/api/config.php" "api/config.php"

echo ""
echo "Verifying https://setuai.com ..."
sleep 8
curl -sf "https://setuai.com/api/health.php" | head -c 120 || echo "health check pending"
echo ""
curl -sL "https://setuai.com/" | grep -oE 'index-[A-Za-z0-9_-]+\.js|app\.css\.php[^"]*' | head -3
echo "Done."
