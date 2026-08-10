import { vleUrl } from "../config/api"

async function parseJson(response) {
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

/** Resolve Indian pincode → state, district, city, village (+ SETU districtId when matched). */
export async function lookupPincode(pincode) {
  const normalized = String(pincode || "").replace(/\D/g, "").slice(0, 6)
  if (normalized.length !== 6) {
    throw new Error("Enter a valid 6-digit pincode.")
  }

  const { response, data } = await parseJson(
    await fetch(vleUrl(`/location/pincode/${normalized}`)),
  )

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Could not resolve pincode.")
  }

  return data.data
}
