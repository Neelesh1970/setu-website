import { adminAuthUrl, vleAuthUrl, vleUrl } from "../config/api"

async function parseJson(response) {
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

function normalizeMobile10(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10)
}

/** VLE login/register/refresh — SETU-AUTH /api/vle (same as Postman: /auth/api/vle/login). */
function vleAuthEndpoint(path) {
  return vleAuthUrl(path)
}

// ─── VLE ───

export async function registerVle({ name, phone, email, password }) {
  const { response, data } = await parseJson(
    await fetch(vleAuthEndpoint("/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, password }),
    }),
  )
  if (response.ok && data.success) {
    const d = data.data || {}
    return {
      accountType: "vle",
      token: d.token || "",
      refreshToken: d.refreshToken || "",
      vle_id: d.vle?.id != null ? String(d.vle.id) : "",
      vlePublicId: d.vle?.vle_id || "",
      name: d.vle?.name || name,
      phone: normalizeMobile10(phone),
      email: d.vle?.email || email || "",
      scope: d.scope || "vle_dashboard",
      allowedModules: d.allowedModules || ["vle_dashboard"],
    }
  }
  const msg = data.message || data.error || ""
  if (response.status === 404 || /route not found/i.test(msg)) {
    throw new Error(
      "VLE API not available. Check staging.setuai.com /vle and /auth are reachable.",
    )
  }
  if (response.status === 502) {
    throw new Error(
      "VLE auth unavailable (502). On EC2: docker ps | grep auth_service && docker logs auth_service --tail 30",
    )
  }
  throw new Error(msg || "VLE registration failed.")
}

export async function loginVle({ vleId, password }) {
  const { response, data } = await parseJson(
    await fetch(vleAuthEndpoint("/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vleId, password }),
    }),
  )
  if (response.ok && data.success) {
    const d = data.data || {}
    return {
      accountType: "vle",
      token: d.token || "",
      refreshToken: d.refreshToken || "",
      vle_id: d.vle?.id != null ? String(d.vle.id) : "",
      vlePublicId: d.vle?.vle_id || vleId,
      name: d.vle?.name || "",
      phone: d.vle?.phone || "",
      email: d.vle?.email || "",
      scope: d.scope || "vle_dashboard",
      allowedModules: d.allowedModules || ["vle_dashboard"],
    }
  }
  const msg = data.message || data.error || ""
  if (/invalid or expired token/i.test(msg)) {
    throw new Error(
      "VLE login misrouted (got token error instead of credentials check). Hard refresh the page and try again.",
    )
  }
  if (response.status === 404 || /route not found/i.test(msg)) {
    throw new Error(
      "VLE API not available. Ensure VITE_PROXY_* points to https://staging.setuai.com.",
    )
  }
  if (response.status === 502) {
    throw new Error(
      "VLE auth unavailable (502). Check auth_service is running on staging EC2.",
    )
  }
  throw new Error(msg || "Invalid VLE ID or password.")
}

export function isJwtExpired(token, skewSec = 30) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    if (!payload?.exp) return false
    return payload.exp * 1000 <= Date.now() + skewSec * 1000
  } catch {
    return true
  }
}

export async function refreshVleToken(refreshToken) {
  const { response, data } = await parseJson(
    await fetch(vleAuthEndpoint("/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }),
  )
  if (!response.ok) {
    const msg = data.message || data.error || "Session expired. Please sign in again."
    if (
      typeof window !== "undefined" &&
      /invalid or expired refresh token|invalid refresh token/i.test(msg)
    ) {
      window.dispatchEvent(new CustomEvent("setu:session-invalid"))
    }
    throw new Error(msg)
  }
  const d = data.data || {}
  const tokens = {
    token: d.token || "",
    refreshToken: d.refreshToken || refreshToken,
  }
  if (typeof window !== "undefined" && tokens.token) {
    window.dispatchEvent(new CustomEvent("setu:tokens", { detail: tokens }))
  }
  return tokens
}

function authErrorMessage(msg, status) {
  const text = String(msg || "")
  if (/invalid token.*vle dashboard access only/i.test(text)) {
    return "Wrong login type. Use /login → role VLE → VLE ID + password (not User OTP)."
  }
  if (/vle not found or inactive/i.test(text)) {
    return "VLE account not found or inactive on staging. Re-register or contact admin."
  }
  if (/invalid or expired refresh token|invalid refresh token/i.test(text)) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("setu:session-invalid"))
    }
    return "Session expired (staging token on local AUTH, or vice versa). Sign in again at /login."
  }
  if (/invalid or expired token/i.test(text)) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("setu:session-invalid"))
    }
    return "Session expired or token rejected by staging. Sign out, run docker-compose up -d --force-recreate vle-service on EC2, then sign in again."
  }
  if (status === 403) {
    if (/invalid or expired token/i.test(text) && typeof window !== "undefined") {
      const vleHost = import.meta.env.VITE_PROXY_VLE_HOST || ""
      const authHost = import.meta.env.VITE_PROXY_AUTH_HOST || ""
      const mixedLocal =
        /localhost|127\.0\.0\.1|:7035\b/.test(vleHost) &&
        !/localhost|127\.0\.0\.1|:7005\b/.test(authHost)
      if (mixedLocal) {
        return "VLE token mismatch: login uses staging but dashboard uses local VLE. Set both VITE_PROXY_AUTH_HOST and VITE_PROXY_VLE_HOST to localhost, or both to staging.setuai.com."
      }
    }
    return (
      text ||
      "VLE dashboard rejected your token. On EC2, set the same VLE_JWT_SECRET and DB_* in SETU-VLE-service/.env, then run: docker-compose up -d --force-recreate vle-service"
    )
  }
  return text || "Request failed."
}

/** Wallet + user registration → SETU-AUTH (/dashboard/wallet/…). Analytics → SETU-VLE-service. */
function resolveVleFetchUrl(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`
  const pathname = normalized.split("?")[0]
  const usesAuth =
    pathname.startsWith("/dashboard/wallet/") ||
    pathname.startsWith("/dashboard/users") ||
    pathname === "/dashboard/leaderboard" ||
    pathname.startsWith("/dashboard/leaderboard/") ||
    pathname === "/dashboard/profile" ||
    pathname === "/dashboard/stats"
  return usesAuth ? vleAuthUrl(normalized) : vleUrl(normalized)
}

export async function vleAuthFetch(
  path,
  { token, refreshToken, httpMethod, method, body, _retried } = {},
) {
  if (!token) {
    throw new Error("Not signed in. Use /login → VLE → VLE ID + password.")
  }

  const resolvedMethod = httpMethod || method || "GET"
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  }
  if (body) headers["Content-Type"] = "application/json"
  const { response, data } = await parseJson(
    await fetch(resolveVleFetchUrl(path), {
      method: resolvedMethod,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
  )
  if (!response.ok) {
    const msg = data.message || data.error || "Request failed."
    if (
      !_retried &&
      refreshToken &&
      (response.status === 401 || response.status === 403) &&
      /invalid or expired token/i.test(msg)
    ) {
      try {
        const tokens = await refreshVleToken(refreshToken)
        return vleAuthFetch(path, {
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          httpMethod: resolvedMethod,
          body,
          _retried: true,
        })
      } catch (refreshErr) {
        throw new Error(
          refreshErr.message ||
            "Session expired. Sign out and log in again after switching local/staging backend.",
        )
      }
    }
    throw new Error(authErrorMessage(msg, response.status))
  }
  return data.data ?? data
}

// ─── District Coordinator (Admin RBAC) ───

export async function registerDistrictCoordinator({
  name,
  email,
  mobile,
  password,
}) {
  const { response, data } = await parseJson(
    await fetch(adminAuthUrl("/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        mobile: normalizeMobile10(mobile),
        password,
        roleName: "district_coordinator",
      }),
    }),
  )
  if (response.ok) {
    return {
      accountType: "district_coordinator",
      token: data.token || "",
      refreshToken: data.refreshToken || "",
      admin_id: data.admin?.id != null ? String(data.admin.id) : "",
      name: data.admin?.name || name,
      email: data.admin?.email || email,
      mobile: normalizeMobile10(mobile),
      roles: data.admin?.roles || [],
    }
  }
  throw new Error(data.error || data.message || "Registration failed.")
}

export async function loginDistrictCoordinator({ email, password }) {
  const { response, data } = await parseJson(
    await fetch(adminAuthUrl("/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  )
  if (response.ok && data.success) {
    const admin = data.admin || {}
    const roles = Array.isArray(admin.roles) ? admin.roles : []
    const isDistrict = roles.some(
      (r) =>
        String(r.role_name || "").toLowerCase() === "district_coordinator" ||
        admin.is_super_admin,
    )
    if (!isDistrict) {
      throw new Error("This account is not a district coordinator.")
    }
    return {
      accountType: "district_coordinator",
      token: data.token || "",
      refreshToken: data.refreshToken || "",
      admin_id: admin.id != null ? String(admin.id) : "",
      name: admin.name || "",
      email: admin.email || "",
      mobile: admin.mobile || "",
      roles,
    }
  }
  throw new Error(data.error || data.message || "Login failed.")
}

export async function adminAuthFetch(path, { token, method = "GET", body } = {}) {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  }
  if (body) headers["Content-Type"] = "application/json"
  const { response, data } = await parseJson(
    await fetch(adminAuthUrl(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
  )
  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed.")
  }
  return data
}

export { normalizeMobile10 }
