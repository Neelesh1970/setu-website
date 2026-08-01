/**
 * Central API bases — mirrors setuReactNative/src/config/apiConfig.js.
 * Local dev: leave VITE_API_URL empty; vite.config.js proxies /auth, /dashboard, …
 * GoDaddy prod: leave VITE_API_URL empty; public/.htaccess + api/staging-proxy.php
 *   forward the same relative prefixes to https://staging.setuai.com (CORS-safe).
 * Direct absolute API URLs only work if API CORS/CORP allow the site origin.
 */

const trim = (url) => String(url || "").trim().replace(/\/+$/, "")

const ROOT = trim(import.meta.env.VITE_API_URL || "")

/** Prefer explicit env override, else ROOT + path, else relative path for Vite proxy */
function serviceBase(envKey, defaultPath) {
  const override = trim(import.meta.env[envKey])
  if (override) return override
  if (ROOT) return `${ROOT}${defaultPath}`
  return defaultPath
}

export const API_ROOT = ROOT

/** Auth service — RN: API_URI_AUTH_SERVICE / API_URL_AUTH */
export const AUTH_BASE = serviceBase("VITE_AUTH_BASE", "/auth")

/** Main API host paths (dashboard under /dashboard/...) — RN: API_URL */
export const API_BASE = serviceBase("VITE_API_BASE", "")

/** Dashboard / slider host — RN: API_URL_SLIDER */
export const DASHBOARD_BASE = serviceBase("VITE_DASHBOARD_BASE", "/dashboard")

/** SOS — RN: API_URI_SOS */
export const SOS_BASE = serviceBase("VITE_SOS_BASE", "/sos/api/v1")

/** Book test — RN: API_URL_BOOKTEST */
export const BOOKTEST_BASE = serviceBase("VITE_BOOKTEST_BASE", "/booktest")

/** ABHA — RN: API_URL_ABHA */
export const ABHA_BASE = serviceBase("VITE_ABHA_BASE", "/abha")

/** Drug directory — RN: API_URI_DRUG */
export const DRUG_BASE = serviceBase("VITE_DRUG_BASE", "/drug/api/v1")

/** Telemedicine — RN: API_URI_MED */
export const MED_BASE = serviceBase("VITE_MED_BASE", "/telemedicine/api/v1")

/** Generic medicine — RN: API_URI_GENERIC */
export const GENERIC_BASE = serviceBase("VITE_GENERIC_BASE", "/generic/api")

/** Mental health — RN: API_URI_MENTAL */
export const MENTAL_BASE = serviceBase("VITE_MENTAL_BASE", "/mental/api")

/** Agriculture — RN: API_URL_AGRICULTURE */
export const AGRI_BASE = serviceBase("VITE_AGRI_BASE", "/agri")

/** Govt schemes — RN: GOVT_SCHEMES_API_URL */
export const SCHEMES_BASE = serviceBase("VITE_SCHEMES_BASE", "/schemes")

/** Fitness — RN: API_URL_FITNESS */
export const FITNESS_BASE = serviceBase("VITE_FITNESS_BASE", "/fitness")

/** Reports / PHR — RN: API_URI_REPORTS */
export const REPORTS_BASE = serviceBase("VITE_REPORTS_BASE", "/reports/api/v1")

/** Preventive health (lab reports) — RN: API_URI_PREVENTIVE */
export const PREVENTIVE_BASE = serviceBase(
  "VITE_PREVENTIVE_BASE",
  "/preventive-health",
)

/** Assets / storage — RN: API_URL_ASSETS */
export const ASSETS_BASE = serviceBase("VITE_ASSETS_BASE", "/assets")

/** Storage API host — proxied to staging in dev via VITE_ASSETS_API_HOST */
export const ASSETS_API_ORIGIN = trim(
  import.meta.env.VITE_ASSETS_API_HOST || "https://staging.setuai.com",
)

/** CloudFront CDN — RN: API_URL_CLOUDFRONT */
export const CLOUDFRONT_BASE = trim(
  import.meta.env.VITE_CLOUDFRONT_BASE || "https://d10pnqyli54qno.cloudfront.net",
)

function joinUrl(base, path) {
  const p = path.startsWith("/") ? path : `/${path}`
  if (!base) return p
  return `${base}${p}`
}

export function authUrl(path) {
  return joinUrl(AUTH_BASE, path)
}

/** VLE portal — SETU-VLE-service /api/v1 (via gateway: /vle/api/v1) */
export const VLE_BASE = serviceBase("VITE_VLE_BASE", "/vle/api/v1")

export function vleUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`
  return joinUrl(VLE_BASE, p)
}

/** VLE auth (login/register/refresh) — SETU-AUTH /api/vle (via gateway: /auth/api/vle) */
export function vleAuthUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`
  return joinUrl(AUTH_BASE, `/api/vle${p}`)
}

/** Admin RBAC — SETU-AUTH /api/auth (via gateway: /auth/api/auth) */
export function adminAuthUrl(path) {
  return joinUrl(AUTH_BASE, `/api/auth${path.startsWith("/") ? path : `/${path}`}`)
}

export function apiUrl(path) {
  return joinUrl(API_BASE, path)
}

export function dashboardUrl(path) {
  return joinUrl(DASHBOARD_BASE, path)
}

export function sosUrl(path) {
  return joinUrl(SOS_BASE, path)
}

export function booktestUrl(path) {
  return joinUrl(BOOKTEST_BASE, path)
}

export function abhaUrl(path) {
  return joinUrl(ABHA_BASE, path)
}

export function drugUrl(path) {
  return joinUrl(DRUG_BASE, path)
}

export function medUrl(path) {
  return joinUrl(MED_BASE, path)
}

export function genericUrl(path) {
  return joinUrl(GENERIC_BASE, path)
}

export function mentalUrl(path) {
  return joinUrl(MENTAL_BASE, path)
}

export function agriUrl(path) {
  return joinUrl(AGRI_BASE, path)
}

export function schemesUrl(path) {
  return joinUrl(SCHEMES_BASE, path)
}

export function fitnessUrl(path) {
  return joinUrl(FITNESS_BASE, path)
}

export function reportsUrl(path) {
  return joinUrl(REPORTS_BASE, path)
}

export function preventiveUrl(path) {
  return joinUrl(PREVENTIVE_BASE, path)
}

export function assetsUrl(path) {
  return joinUrl(ASSETS_BASE, path)
}

export function buildStorageObjectUrl(fileKey, contentType = "image/png") {
  return `${ASSETS_BASE}/api/v1/storage/object?key=${encodeURIComponent(
    fileKey,
  )}&disposition=inline&contentType=${encodeURIComponent(contentType)}`
}

/** Absolute storage object URL (rewritten for same-origin proxy in the browser). */
export function storageObjectUrlAbsolute(fileKey, contentType = "image/png") {
  return `${ASSETS_API_ORIGIN}/assets/api/v1/storage/object?key=${encodeURIComponent(
    fileKey,
  )}&disposition=inline&contentType=${encodeURIComponent(contentType)}`
}

/**
 * Rewrite storage URLs for browser `<img>` tags.
 * API may return absolute storage URLs; browser loads same-origin /assets/api/... (Vite /
 * .htaccess proxy forwards to staging.setuai.com).
 */
export function resolveStorageImageUrl(url) {
  if (url == null || url === "") return ""
  const raw = String(url).trim()
  if (!raw) return ""

  const toProxiedStoragePath = (key, contentType = "image/png") =>
    buildStorageObjectUrl(key, contentType)

  if (raw.startsWith("/assets/api/")) return raw

  try {
    const parsed = new URL(
      raw,
      typeof window !== "undefined" ? window.location.origin : "http://localhost",
    )
    if (parsed.pathname.includes("/assets/api/v1/storage/object")) {
      const key = parsed.searchParams.get("key")
      const contentType = parsed.searchParams.get("contentType") || "image/png"
      if (key) return toProxiedStoragePath(key, contentType)
      return `${parsed.pathname}${parsed.search}`
    }
  } catch {
    /* not a URL */
  }

  const cf = raw.match(/cloudfront\.net\/Reports\/public\/(.+)$/i)
  if (cf?.[1]) {
    return toProxiedStoragePath(`Reports/public/${decodeURIComponent(cf[1])}`)
  }

  if (raw.startsWith("Reports/public/")) {
    return toProxiedStoragePath(raw)
  }

  return raw
}
