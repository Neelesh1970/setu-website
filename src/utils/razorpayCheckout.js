/** Public Razorpay key — must match backend RAZORPAY_KEY_ID when no keyId is returned */
export const RAZORPAY_KEY_ID =
  import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_Rgl75wP2oROCnL"

export const DEFAULT_RAZORPAY_METHODS = {
  upi: true,
  card: true,
  netbanking: true,
  wallet: true,
}

export function resolveRazorpayKeyId(keyIdFromServer) {
  const key = String(keyIdFromServer || "").trim()
  if (key) return key
  if (RAZORPAY_KEY_ID) return RAZORPAY_KEY_ID
  throw new Error("Razorpay is not configured. Contact SETU support.")
}

/** Razorpay expects +91XXXXXXXXXX for Indian numbers */
export function formatRazorpayContact(phone) {
  const digits = String(phone || "").replace(/\D/g, "")
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`
  return digits ? `+${digits}` : undefined
}

export function buildRazorpayPrefill({ name, email, contact } = {}) {
  const prefill = {}
  const trimmedName = String(name || "").trim()
  const trimmedEmail = String(email || "").trim()
  const formattedContact = formatRazorpayContact(contact)

  if (trimmedName) prefill.name = trimmedName
  if (trimmedEmail) prefill.email = trimmedEmail
  if (formattedContact) prefill.contact = formattedContact

  return prefill
}

export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(window.Razorpay)
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(window.Razorpay)
    script.onerror = () => reject(new Error("Could not load Razorpay checkout"))
    document.body.appendChild(script)
  })
}

/**
 * Opens Razorpay modal and resolves with payment response
 * { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export function openRazorpayCheckout(options) {
  return new Promise((resolve, reject) => {
    const { modal, method, config, key, order_id, amount, prefill, ...rest } = options || {}

    if (!key) {
      reject(new Error("Razorpay key is missing. Payment cannot start."))
      return
    }
    if (!order_id && (!amount || Number(amount) <= 0)) {
      reject(new Error("Invalid payment amount."))
      return
    }

    loadRazorpayScript()
      .then((Razorpay) => {
        const checkoutOptions = {
          method: { ...DEFAULT_RAZORPAY_METHODS, ...method },
          ...rest,
          key,
          currency: rest.currency || "INR",
          handler: (response) => resolve(response),
          modal: {
            escape: true,
            backdropclose: false,
            ondismiss: () => reject(new Error("Payment cancelled")),
            ...modal,
          },
        }

        if (prefill && Object.keys(prefill).length) {
          checkoutOptions.prefill = prefill
        }

        if (order_id) {
          checkoutOptions.order_id = order_id
        }

        // Razorpay standard checkout expects amount even when order_id is set.
        if (amount && Number(amount) > 0) {
          checkoutOptions.amount = Number(amount)
        }

        if (config && Object.keys(config).length) {
          checkoutOptions.config = config
        }

        const rzp = new Razorpay(checkoutOptions)
        rzp.on("payment.failed", (resp) => {
          reject(new Error(resp?.error?.description || "Payment failed"))
        })
        rzp.open()
      })
      .catch(reject)
  })
}
