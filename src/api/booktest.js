/**
 * Book Test API — mirrors setuReactNative/src/Utils/api/bookTest.js
 */
import { booktestUrl, apiUrl } from "../config/api"
import { isAccessTokenExpired, refreshAuthTokens } from "./auth"
import { authFetch } from "./http"

export const RAZORPAY_KEY_ID =
  import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_Rgl75wP2oROCnL"

function unwrap(data) {
  if (data?.data != null && typeof data.data === "object") return data.data
  return data
}

function assertOk(response, data, fallback) {
  if (response.ok && data?.hasError !== true && data?.success !== false) {
    return data
  }
  const msg =
    data?.message ||
    data?.error ||
    data?.data?.message ||
    fallback ||
    "Request failed"
  const err = new Error(msg)
  err.status = response.status
  err.data = data
  throw err
}

function isAuthTokenError(message, status) {
  if (status !== 401 && status !== 403) return false
  const msg = String(message || "").toLowerCase()
  return (
    msg.includes("token") ||
    msg.includes("jwt") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden") ||
    msg.includes("session") ||
    msg.includes("expired")
  )
}

/**
 * Book Test protected routes use validateUser middleware. Do not send x-refresh-token
 * to Book Test — it tries local JWT refresh with service secrets that differ from
 * Auth, which surfaces as "jwt malformed". Refresh via Auth and retry instead.
 */
async function btFetch(path, { session, method = "GET", body, params, auth = false } = {}) {
  let url = booktestUrl(path)
  if (params && typeof params === "object") {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== "") qs.set(k, String(v))
    })
    const s = qs.toString()
    if (s) url += `?${s}`
  }

  const run = (token) =>
    authFetch(url, {
      method,
      token,
      body: body != null ? JSON.stringify(body) : undefined,
    })

  if (auth && !session?.token) {
    throw new Error("Please sign in again.")
  }

  let token = session?.token
  if (auth && token && isAccessTokenExpired(token)) {
    const tokens = await refreshAuthTokens(session.refreshToken)
    token = tokens.token
  }

  let { response, data } = await run(token)

  if (auth && !response.ok && isAuthTokenError(data?.message, response.status)) {
    try {
      const tokens = await refreshAuthTokens(session.refreshToken)
      ;({ response, data } = await run(tokens.token))
    } catch (refreshErr) {
      throw new Error(
        refreshErr?.message || data?.message || "Session expired. Please sign in again.",
      )
    }
  }

  return { response, data }
}

export async function fetchDiseases(session) {
  try {
    const { response, data } = await btFetch("/diseases", { session })
    if (response.ok && data?.hasError !== true && data?.success !== false) {
      const raw = unwrap(data)
      const list =
        raw?.diseases ||
        raw?.categories ||
        data?.data?.diseases ||
        (Array.isArray(raw) ? raw : [])
      if (Array.isArray(list) && list.length) return list
    }
  } catch {
    /* fall through to categories */
  }

  // Fallback when BOOKTEST_DISEASE_UPSTREAM is unset (staging/prod currently)
  const { response, data } = await btFetch("/categories", {
    session,
    method: "POST",
    body: { productType: "profile" },
  })
  assertOk(response, data, "Could not load categories")
  const raw = unwrap(data)
  const slugs = Array.isArray(raw) ? raw : raw?.categories || []
  return slugs.map((code) => ({
    code: String(code),
    displayName: String(code)
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .join(" / "),
    productCount: 1,
  }))
}

export async function fetchProducts(session, { productType = "profile", category }) {
  const { response, data } = await btFetch("/products", {
    session,
    method: "POST",
    body: { productType, category },
  })
  assertOk(response, data, "Could not load packages")
  const raw = unwrap(data)
  return (
    raw?.products ||
    raw?.packages ||
    raw?.items ||
    (Array.isArray(raw) ? raw : [])
  )
}

export async function searchBookTests(session, searchInput) {
  const { response, data } = await btFetch("/search", {
    session,
    method: "POST",
    body: { searchInput },
  })
  assertOk(response, data, "Search failed")
  const raw = unwrap(data)
  const list = raw?.products || raw?.results || (Array.isArray(raw) ? raw : [])

  // Older /search responses are { packageName, code } only (no rate/price).
  // Attach price from packageDetails so search UI can show ₹ correctly.
  const top = (list || []).slice(0, 8)
  const enriched = await Promise.all(
    top.map(async (item) => {
      const code = String(item?.code || item?.product_code || item?.productCode || "").trim()
      const name = item?.name || item?.packageName || item?.productName
      const hasPrice =
        item?.price != null ||
        item?.rate != null ||
        item?.offer_price != null ||
        item?.selling_price != null
      if (!code || hasPrice) {
        return name && !item?.name ? { ...item, name } : item
      }
      try {
        const detail = await fetchPackageDetails(session, {
          userId: session?.user_id,
          code,
        })
        const price = detail?.price
        return {
          ...item,
          name,
          packageName: item?.packageName || name,
          price: price != null ? price : item.price,
          rate: item.rate || (price != null ? { b2C: price } : undefined),
        }
      } catch {
        return name && !item?.name ? { ...item, name } : item
      }
    }),
  )
  return enriched
}

export async function fetchPackageDetails(session, { userId, code }) {
  const { response, data } = await btFetch("/packageDetails", {
    session,
    auth: true,
    method: "POST",
    body: { user_id: userId, code },
  })
  assertOk(response, data, "Could not load package details")
  return unwrap(data)
}

export async function fetchSimilarPackages(session, { userId, code }) {
  const { response, data } = await btFetch("/similarpackages", {
    session,
    auth: true,
    method: "POST",
    body: { user_id: userId, code },
  })
  if (!response.ok) return []
  const raw = unwrap(data)
  return raw?.packages || raw?.products || (Array.isArray(raw) ? raw : [])
}

export async function addToCart(session, { userId, productCode, quantity = 1 }) {
  const { response, data } = await btFetch("/cart/add", {
    session,
    auth: true,
    method: "POST",
    body: { user_id: userId, productCode, quantity },
  })
  assertOk(response, data, "Could not update cart")
  return unwrap(data)
}

export async function fetchCartDetails(session, userId) {
  const { response, data } = await btFetch("/cart/details", {
    session,
    auth: true,
    method: "POST",
    body: { user_id: userId },
  })
  assertOk(response, data, "Could not load cart")
  return unwrap(data) || data
}

export async function removeFromCart(session, { userId, productCode }) {
  const { response, data } = await btFetch("/cart/remove", {
    session,
    auth: true,
    method: "DELETE",
    body: { user_id: userId, productCode },
  })
  assertOk(response, data, "Could not remove item")
  return unwrap(data)
}

export async function checkPincode(session, pincode) {
  const { response, data } = await btFetch("/pincode-availability", {
    session,
    method: "POST",
    body: { pincode },
  })
  assertOk(response, data, "Pincode check failed")
  const raw = unwrap(data)
  return Boolean(raw?.serviceable ?? data?.data?.serviceable ?? data?.serviceable)
}

export async function listAddresses(session, userId) {
  const { response, data } = await btFetch("/listAddresses", {
    session,
    auth: true,
    method: "POST",
    body: { user_id: userId },
  })
  assertOk(response, data, "Could not load addresses")
  const raw = unwrap(data)
  return raw?.addresses || (Array.isArray(raw) ? raw : [])
}

export async function addAddress(session, payload) {
  const { response, data } = await btFetch("/addAddress", {
    session,
    auth: true,
    method: "POST",
    body: payload,
  })
  assertOk(response, data, "Could not save address")
  return unwrap(data)
}

export async function setDefaultAddress(session, { userId, addressId }) {
  const { response, data } = await btFetch("/updateAddress", {
    session,
    auth: true,
    method: "POST",
    body: { user_id: userId, addressId },
  })
  assertOk(response, data, "Could not update address")
  return unwrap(data)
}

export async function deleteAddress(session, { userId, addressId }) {
  const { response, data } = await btFetch("/deleteAddress", {
    session,
    auth: true,
    method: "DELETE",
    body: { user_id: userId, addressId },
  })
  assertOk(response, data, "Could not delete address")
  return unwrap(data)
}

export async function fetchSlotDetails(session, userId) {
  const { response, data } = await btFetch("/slotdetails", {
    session,
    auth: true,
    method: "POST",
    body: { user_id: userId },
  })
  assertOk(response, data, "Could not load slot details")
  return unwrap(data)
}

export async function fetchAppointmentSlots(session, payload) {
  const { response, data } = await btFetch("/appointment-slots", {
    session,
    auth: true,
    method: "POST",
    body: payload,
  })
  assertOk(response, data, "Could not load time slots")
  const raw = unwrap(data)
  return raw?.slots || raw?.availableSlots || (Array.isArray(raw) ? raw : [])
}

export async function bookAppointmentSlot(session, payload) {
  const { response, data } = await btFetch("/bookAppointmentSlot", {
    session,
    auth: true,
    method: "POST",
    body: payload,
  })
  assertOk(response, data, "Could not book slot")
  return unwrap(data)
}

export async function fetchCheckout(session, userId) {
  const { response, data } = await btFetch("/checkout", {
    session,
    auth: true,
    method: "POST",
    body: { user_id: userId },
  })
  assertOk(response, data, "Could not load checkout")
  return unwrap(data) || data
}

export async function verifyBookTestPayment(session, { userId, paymentId }) {
  const { response, data } = await authFetch(apiUrl("/pay/verifyPayment"), {
    method: "POST",
    token: session?.token,
    refreshToken: session?.refreshToken,
    body: JSON.stringify({ user_id: userId, payment_id: paymentId }),
  })
  assertOk(response, data, "Payment verification failed")
  return unwrap(data) || data
}

export async function createThyrocareOrder(session, payload) {
  const { response, data } = await btFetch("/thyrocare/orders", {
    session,
    auth: true,
    method: "POST",
    body: payload,
  })
  assertOk(response, data, "Could not place order")
  return unwrap(data) || data
}

export async function fetchOrderList(session, { page = 1, limit = 20, orderId } = {}) {
  const body = orderId ? { orderId } : { page, limit }
  const { response, data } = await btFetch("/orderlist", {
    session,
    auth: true,
    method: "POST",
    body,
  })
  assertOk(response, data, "Could not load orders")
  const raw = unwrap(data)
  if (orderId) return raw
  return {
    orders: raw?.orders || raw?.data || (Array.isArray(raw) ? raw : []),
    total: raw?.total,
  }
}

export async function fetchThyrocareOrderDetails(
  session,
  orderId,
  include = "tracking,items,price",
) {
  const { response, data } = await btFetch(
    `/thyrocare/orders/${encodeURIComponent(String(orderId))}`,
    { session, auth: true, params: { include } },
  )
  assertOk(response, data, "Could not load order details")
  return data
}

export async function cancelThyrocareOrder(session, orderId, payload = {}) {
  const { response, data } = await btFetch(
    `/thyrocare/orders/${encodeURIComponent(String(orderId))}/cancel`,
    {
      session,
      auth: true,
      method: "POST",
      body: {
        reasonKey: "OTHER",
        reasonText: "Customer requested cancellation",
        speed: "optimum",
        ...payload,
      },
    },
  )
  assertOk(response, data, "Could not cancel order")
  return unwrap(data) || data
}

export async function rescheduleThyrocareOrder(session, orderId, payload) {
  const { response, data } = await btFetch(
    `/thyrocare/orders/${encodeURIComponent(String(orderId))}/reschedule`,
    { session, auth: true, method: "POST", body: payload },
  )
  assertOk(response, data, "Could not reschedule order")
  return unwrap(data) || data
}

export async function saveForLater(session, productCode) {
  const { response, data } = await btFetch("/saved-for-later/save", {
    session,
    auth: true,
    method: "POST",
    body: { product_code: productCode },
  })
  assertOk(response, data, "Could not save package")
  return unwrap(data)
}

export async function listSavedForLater(session) {
  const { response, data } = await btFetch("/saved-for-later/list", { session, auth: true })
  assertOk(response, data, "Could not load saved packages")
  const raw = unwrap(data)
  return raw?.items || raw?.saved || (Array.isArray(raw) ? raw : [])
}

export async function removeSavedForLater(session, productCode) {
  const { response, data } = await btFetch("/saved-for-later/remove", {
    session,
    auth: true,
    method: "DELETE",
    params: { product_code: productCode },
  })
  assertOk(response, data, "Could not remove saved package")
  return unwrap(data)
}
// Add to /api/booktest.js

export async function fetchSavedTests(session) {
  try {
    const items = await listSavedForLater(session)
    return items || []
  } catch (error) {
    console.error('Error fetching saved tests:', error)
    return []
  }
}

export async function toggleSavedTest(session, productCode, save = true) {
  try {
    if (save) {
      return await saveForLater(session, productCode)
    } else {
      return await removeSavedForLater(session, productCode)
    }
  } catch (error) {
    console.error('Error toggling saved test:', error)
    throw error
  }
}

export async function checkTestSaved(session, productCode) {
  try {
    const savedItems = await listSavedForLater(session)
    return savedItems.some(item => 
      item.product_code === productCode || 
      item.code === productCode ||
      item._id === productCode
    )
  } catch (error) {
    console.error('Error checking saved status:', error)
    return false
  }
}