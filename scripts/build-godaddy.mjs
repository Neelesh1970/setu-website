#!/usr/bin/env node
/**
 * Build production bundle for GoDaddy cPanel (public_html).
 * Output: dist/ — upload everything inside dist/ to public_html/
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dist = path.join(root, "dist")

console.log("Building SETU website for GoDaddy...\n")

if (!fs.existsSync(path.join(root, ".env.production"))) {
  if (fs.existsSync(path.join(root, ".env.production.example"))) {
    fs.copyFileSync(
      path.join(root, ".env.production.example"),
      path.join(root, ".env.production"),
    )
    console.log("Created .env.production from .env.production.example")
  }
}

execSync("npm run build", { cwd: root, stdio: "inherit" })

try {
  execSync("node scripts/generate-config-php.mjs", { cwd: root, stdio: "inherit" })
  const generated = path.join(root, "public", "api", "config.php")
  const distApi = path.join(dist, "api")
  if (fs.existsSync(generated)) {
    fs.mkdirSync(distApi, { recursive: true })
    fs.copyFileSync(generated, path.join(distApi, "config.php"))
    console.log("Included api/config.php in dist/")
  }
} catch {
  console.log("No SMTP_PASS set — create api/config.php on server manually.")
}

/** GoDaddy FTPS often aborts large .css uploads — ship gzip + PHP wrapper instead. */
function prepareGoDaddyCss() {
  const assetsDir = path.join(dist, "assets")
  const cssFiles = fs.readdirSync(assetsDir).filter((f) => /^index-.*\.css$/.test(f))
  if (!cssFiles.length) return

  const cssName = cssFiles[0]
  const cssPath = path.join(assetsDir, cssName)
  const gzPath = path.join(assetsDir, "setu-app.css.gz")
  fs.writeFileSync(gzPath, execSync(`gzip -c "${cssPath}"`, { encoding: undefined }))

  const php = `<?php
/** Serves gzipped Vite CSS (GoDaddy FTPS aborts large .css uploads). */
declare(strict_types=1);

header('Content-Type: text/css; charset=utf-8');
header('Cache-Control: public, max-age=604800');

$gz = __DIR__ . '/setu-app.css.gz';
if (!is_readable($gz)) {
    http_response_code(404);
    exit('/* stylesheet missing */');
}

$css = gzdecode((string) file_get_contents($gz));
if ($css === false) {
    http_response_code(500);
    exit('/* stylesheet decode failed */');
}

echo $css;
`
  fs.writeFileSync(path.join(assetsDir, "app.css.php"), php)

  const indexPath = path.join(dist, "index.html")
  let html = fs.readFileSync(indexPath, "utf8")
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  html = html.replace(
    /<link rel="stylesheet" href="\/assets\/[^"]+\.css[^"]*">/,
    `<link rel="stylesheet" href="/assets/app.css.php?v=${stamp}">`,
  )
  fs.writeFileSync(indexPath, html)
  console.log(`GoDaddy CSS: ${cssName} → setu-app.css.gz + app.css.php`)
}

prepareGoDaddyCss()

const requiredVideos = [
  "videos/herovideo.mp4",
  "videos/setu-story-web.mp4",
]

const missing = requiredVideos.filter(
  (rel) => !fs.existsSync(path.join(dist, rel)),
)

const checklist = `
SETU — GoDaddy deploy checklist
================================

UPLOAD (cPanel → File Manager or FTP)
  Upload ALL files inside the dist/ folder to public_html/

BEFORE GOING LIVE
  1. Backup existing setuai.com files (cPanel → Backups)
  2. On server: copy api/config.php.example → api/config.php
  3. Edit api/config.php — set smtp_pass for no_reply@setuai.com
  4. Ensure api/data/ folder is writable (chmod 755 or 775)

AFTER UPLOAD — TEST
  - https://setuai.com
  - https://setuai.com/api/health
  - Submit contact form on the site

LARGE FILES (upload via FTP if File Manager times out)
${missing.length ? missing.map((f) => `  - MISSING: ${f}`).join("\n") : "  - All required videos present in dist/"}

VIDEO SIZES (approx.)
  - herovideo.mp4        ~15 MB
  - setu-story-web.mp4  ~343 MB

CONTACT FORM
  Uses PHP at /api/contact (not Node.js). GoDaddy shared hosting supports PHP.

APP APIs (login OTP, dashboard, telemedicine, …)
  Relative paths (/auth, /dashboard, …) are rewritten by .htaccess to
  api/staging-proxy.php → https://staging.setuai.com
  (Override with STAGING_API_BASE / config.php staging_api_base.)
  Sign-in OTP uses POST /auth/otp/send (not /register/send-otp).
  Do not set VITE_API_URL to the API host unless CORS/CORP allow setuai.com.

NEED FROM YOU
  - SMTP password for no_reply@setuai.com (GoDaddy email)
  - Confirm: replace entire public_html or deploy to subfolder?
`

fs.writeFileSync(path.join(dist, "DEPLOY-CHECKLIST.txt"), checklist.trim() + "\n")

console.log("\n" + checklist)
console.log(`\nReady to upload: ${dist}/`)
console.log("See DEPLOY-GODADDY.md for full step-by-step instructions.\n")
