import { vleUrl } from "../config/api"
import { normalizeMobile10 } from "./roleAuth"

async function parseJson(response) {
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

/** District Coordinator login — SETU-VLE-service /api/v1/coordinator/login */
export async function loginCoordinator({ email, phone, password }) {
  const body = { password }
  const trimmedEmail = String(email || "").trim().toLowerCase()
  const phoneNumber = normalizeMobile10(phone)

  if (trimmedEmail) body.email = trimmedEmail
  else if (phoneNumber) body.phone_number = phoneNumber

  const { response, data } = await parseJson(
    await fetch(vleUrl("/coordinator/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  )

  if (response.ok && data.success) {
    const d = data.data || {}
    return {
      accountType: "district_coordinator",
      token: d.token || "",
      refreshToken: d.refreshToken || "",
      coordinatorId: d.coordinatorId != null ? String(d.coordinatorId) : "",
      userId: d.userId != null ? String(d.userId) : "",
      employeeCode: d.employeeCode || "",
      name: d.name || "",
      email: d.email || trimmedEmail,
      phone: normalizeMobile10(d.phoneNumber || phoneNumber),
      assignedDistricts: Array.isArray(d.assignedDistricts) ? d.assignedDistricts : [],
      assignedDistrictDetails: Array.isArray(d.assignedDistrictDetails)
        ? d.assignedDistrictDetails
        : [],
    }
  }

  const msg = data.message || data.error || ""
  if (response.status === 403 && /not registered as a district coordinator/i.test(msg)) {
    throw new Error(
      "This account is not a District Coordinator yet. Ask a Super Admin to create your coordinator profile.",
    )
  }
  if (response.status === 503) {
    throw new Error("Auth service unavailable. Ensure SETU-AUTH is running on port 7005.")
  }
  throw new Error(msg || "Coordinator login failed.")
}

export async function coordinatorFetch(
  path,
  { token, httpMethod, method, body, _retried } = {},
) {
  if (!token) {
    throw new Error("Not signed in. Use /login → District Coordinator.")
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
      /invalid or expired token/i.test(msg)
    ) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("setu:session-invalid"))
      }
    }
    throw new Error(msg)
  }

  return data.data ?? data
}
