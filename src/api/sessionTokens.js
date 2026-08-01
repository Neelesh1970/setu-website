import { authUrl } from "../config/api"

/** Decode JWT exp without verifying signature. */
export function isAccessTokenExpired(token, skewSeconds = 60) {
  if (!token || typeof token !== "string") return true
  try {
    const [, payloadPart] = token.split(".")
    if (!payloadPart) return true
    const b64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    if (!payload?.exp) return false
    return Date.now() / 1000 >= Number(payload.exp) - skewSeconds
  } catch {
    return true
  }
}

function persistSessionTokens(token, refreshToken) {
  try {
    const raw = localStorage.getItem("setu_auth_session")
    if (!raw) return
    const prev = JSON.parse(raw)
    const next = {
      ...prev,
      token: token || prev.token,
      refreshToken: refreshToken || prev.refreshToken,
    }
    localStorage.setItem("setu_auth_session", JSON.stringify(next))
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("setu:tokens", {
          detail: { token: next.token, refreshToken: next.refreshToken },
        }),
      )
    }
  } catch {
    /* ignore */
  }
}

/**
 * Refresh SETU access token via Auth service (same as RN bookTest interceptor).
 * POST /auth/refreshToken with x-refresh-token header.
 */
export async function refreshAuthTokens(refreshToken) {
  if (!refreshToken) {
    throw new Error("Session expired. Please sign in again.")
  }

  const response = await fetch(authUrl("/refreshToken"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-refresh-token": refreshToken,
      "X-REFRESH-TOKEN": refreshToken,
    },
    body: JSON.stringify({ refreshToken }),
  })
  const data = await response.json().catch(() => ({}))

  const payload = data?.data ?? data ?? {}
  const token =
    payload.token ||
    payload.accessToken ||
    payload.access_token ||
    data?.token ||
    ""
  const nextRefresh =
    payload.refreshToken ||
    payload.refresh_token ||
    payload.refreshTokenValue ||
    data?.refreshToken ||
    refreshToken

  if (!response.ok || !token) {
    const msg = String(payload?.message || data?.message || "")
    throw new Error(
      msg && !/route not found/i.test(msg)
        ? msg
        : "Session expired. Please sign in again.",
    )
  }

  persistSessionTokens(token, nextRefresh)
  return { token, refreshToken: nextRefresh }
}
