import { vleUrl } from "../config/api"

async function parseJson(response) {
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

export async function adminFetch(path, { token, httpMethod, method, body, _retried } = {}) {
  if (!token) {
    throw new Error("Not signed in. Use /login → Super Admin.")
  }

  const resolvedMethod = httpMethod || method || "GET"
  const normalized = path.startsWith("/") ? path : `/${path}`
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  }
  if (body) headers["Content-Type"] = "application/json"

  const { response, data } = await parseJson(
    await fetch(vleUrl(normalized), {
      method: resolvedMethod,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
  )

  if (!response.ok) {
    const msg = data.message || data.error || "Request failed."
    if (
      !_retried &&
      (response.status === 401 || response.status === 403) &&
      /invalid or expired token|super admin access only/i.test(msg)
    ) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("setu:session-invalid"))
      }
    }
    throw new Error(msg)
  }

  return data.data ?? data
}
