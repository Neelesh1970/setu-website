/**
 * Shared fetch helpers with SETU auth headers (mirrors RN axios utils).
 */

import { isAccessTokenExpired, refreshAuthTokens } from "./sessionTokens"

export function authHeaders(token, refreshToken, extra = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extra,
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (refreshToken) {
    headers["x-refresh-token"] = refreshToken
    headers["X-REFRESH-TOKEN"] = refreshToken
  }
  return headers
}

/**
 * fetch() with Bearer + refresh token headers.
 * Refreshes access token when expired or when upstream returns 401/403.
 * @returns {{ response: Response, data: any }}
 */
export async function authFetch(url, { token, refreshToken, headers, _retried, ...init } = {}) {
  let accessToken = token
  let nextRefresh = refreshToken

  if (accessToken && nextRefresh && isAccessTokenExpired(accessToken)) {
    try {
      const refreshed = await refreshAuthTokens(nextRefresh)
      accessToken = refreshed.token
      nextRefresh = refreshed.refreshToken
    } catch {
      /* use existing token; caller may handle 401 */
    }
  }

  const response = await fetch(url, {
    ...init,
    headers: authHeaders(accessToken, nextRefresh, headers),
  })
  const data = await response.json().catch(() => ({}))

  if (
    !_retried &&
    nextRefresh &&
    (response.status === 401 || response.status === 403)
  ) {
    const msg = String(data?.message || "")
    if (/invalid or expired token|unauthorized|session expired|access denied/i.test(msg)) {
      try {
        const refreshed = await refreshAuthTokens(nextRefresh)
        return authFetch(url, {
          token: refreshed.token,
          refreshToken: refreshed.refreshToken,
          headers,
          _retried: true,
          ...init,
        })
      } catch {
        /* fall through */
      }
    }
  }

  return { response, data }
}
