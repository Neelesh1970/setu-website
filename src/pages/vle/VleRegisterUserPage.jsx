import { useState } from "react"
import { Link } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { normalizeMobile10, vleAuthFetch } from "../../api/roleAuth"
import {
  buildRazorpayPrefill,
  openRazorpayCheckout,
  resolveRazorpayKeyId,
} from "../../utils/razorpayCheckout"
import { VLE_REGISTRATION_FEE_INR } from "../../constants/vle"

const OTP_LENGTH = 6

export default function VleRegisterUserPage() {
  const { session } = useAuth()
  const [step, setStep] = useState("details")
  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    age: "",
    gender: "male",
    email: "",
    state: "",
    city: "",
    village: "",
    pincode: "",
  })
  const [otp, setOtp] = useState("")
  const [paymentOrder, setPaymentOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const registerUserPayload = () => ({
    name: form.name.trim(),
    phoneNumber: form.phoneNumber,
    age: Number(form.age),
    gender: form.gender,
    email: form.email.trim() || undefined,
    state: form.state.trim() || undefined,
    city: form.city.trim() || undefined,
    village: form.village.trim() || undefined,
    pincode: form.pincode.trim() || undefined,
  })

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError("")
    const phone = normalizeMobile10(form.phoneNumber)
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number.")
      return
    }
    if (!form.name.trim() || !form.age || !form.gender) {
      setError("Name, age, and gender are required.")
      return
    }
    setLoading(true)
    try {
      await vleAuthFetch("/dashboard/users/send-otp", {
        token: session.token,
        refreshToken: session.refreshToken,
        method: "POST",
        body: { phoneNumber: phone, appHash: "DiubbEJbhXR" },
      })
      update("phoneNumber", phone)
      setPaymentOrder(null)
      setStep("otp")
    } catch (err) {
      setError(err.message || "Failed to send OTP.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (otp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit OTP.")
      return
    }
    setLoading(true)
    try {
      await vleAuthFetch("/dashboard/users/verify-otp", {
        token: session.token,
        refreshToken: session.refreshToken,
        method: "POST",
        body: { phoneNumber: form.phoneNumber, otp },
      })

      const skipPayment =
        import.meta.env.DEV && import.meta.env.VITE_VLE_SKIP_PAYMENT === "true"

      if (skipPayment) {
        await vleAuthFetch("/dashboard/users/register", {
          token: session.token,
          refreshToken: session.refreshToken,
          method: "POST",
          body: registerUserPayload(),
        })
        setSuccess("User registered successfully. ₹100 commission added to your wallet.")
        setStep("done")
        return
      }

      const orderData = await vleAuthFetch("/dashboard/users/create-payment-order", {
        token: session.token,
        refreshToken: session.refreshToken,
        method: "POST",
        body: { phoneNumber: form.phoneNumber },
      })

      const razorpayOrder = orderData.order
      const amountPaise = Number(razorpayOrder?.amount)
      const amountInr = orderData.amountInr ?? (amountPaise ? amountPaise / 100 : 200)

      if (!razorpayOrder?.id || !amountPaise) {
        throw new Error("Could not create payment order.")
      }

      setPaymentOrder({
        keyId: resolveRazorpayKeyId(orderData.keyId),
        orderId: razorpayOrder.id,
        amountPaise,
        amountInr,
        currency: razorpayOrder.currency || "INR",
      })
      setSuccess(`Phone verified. Pay ₹${amountInr} to complete registration.`)
      setStep("pay")
    } catch (err) {
      setError(err.message || "OTP verification failed.")
    } finally {
      setLoading(false)
    }
  }

  const handlePay = async () => {
    if (!paymentOrder) {
      setError("Payment session expired. Go back and verify OTP again.")
      return
    }

    setError("")
    setPaying(true)
    try {
      const payment = await openRazorpayCheckout({
        key: paymentOrder.keyId,
        amount: paymentOrder.amountPaise,
        currency: paymentOrder.currency,
        name: "SETU",
        description: "User registration fee",
        order_id: paymentOrder.orderId,
        prefill: buildRazorpayPrefill({
          name: form.name,
          email: form.email,
          contact: form.phoneNumber,
        }),
        theme: { color: "#1C39BB" },
      })

      setLoading(true)
      await vleAuthFetch("/dashboard/users/register", {
        token: session.token,
        refreshToken: session.refreshToken,
        method: "POST",
        body: {
          ...registerUserPayload(),
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
        },
      })

      setSuccess(
        `User registered successfully. Payment of ₹${paymentOrder.amountInr} confirmed. ₹100 commission added to your wallet.`,
      )
      setStep("done")
    } catch (err) {
      if (err.message === "Payment cancelled") {
        setError("Payment was cancelled. Tap Pay again when ready.")
      } else {
        setError(err.message || "Payment failed.")
      }
    } finally {
      setPaying(false)
      setLoading(false)
    }
  }

  return (
    <div className="page-safe-bottom mx-auto max-w-lg px-4 py-6 app-safe-x sm:py-8">
        <div className="rounded-2xl border border-[#D2DEFF] bg-white p-6 shadow-sm">
          <h1 className="font-serif text-xl text-setu-charcoal">Register user</h1>
          <p className="mt-1 text-sm text-setu-muted">
            Required: phone, name, age, gender. OTP verification + one-time ₹
            {VLE_REGISTRATION_FEE_INR} registration payment (not annual).
          </p>

          {step === "details" && (
            <form onSubmit={handleSendOtp} className="mt-6 space-y-3">
              <input
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5"
                placeholder="Full name *"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5"
                placeholder="Mobile number *"
                value={form.phoneNumber}
                onChange={(e) => update("phoneNumber", e.target.value.replace(/\D/g, ""))}
                maxLength={10}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5"
                  placeholder="Age *"
                  value={form.age}
                  onChange={(e) => update("age", e.target.value)}
                />
                <select
                  className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5"
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <input
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5"
                placeholder="Email (optional)"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5"
                placeholder="State (optional)"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5"
                  placeholder="Pincode"
                  value={form.pincode}
                  onChange={(e) => update("pincode", e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Send OTP
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-3">
              <p className="text-sm text-setu-muted">
                OTP sent to +91 {form.phoneNumber}
              </p>
              <input
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3 text-center text-lg tracking-widest"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && !error && <p className="text-sm text-[#1C39BB]">{success}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Verifying…" : "Verify OTP"}
              </button>
            </form>
          )}

          {step === "pay" && paymentOrder && (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-setu-muted">
                Registering +91 {form.phoneNumber} · {form.name.trim()}
              </p>
              <div className="rounded-xl border border-[#D2DEFF] bg-[#F7FAFF] px-4 py-3 text-sm">
                <p className="font-medium text-setu-charcoal">One-time registration fee</p>
                <p className="mt-1 text-2xl font-semibold text-[#1C39BB]">
                  ₹{paymentOrder.amountInr ?? VLE_REGISTRATION_FEE_INR}
                </p>
                <p className="mt-1 text-setu-muted">
                  Paid once at registration — not an annual subscription. UPI, card, netbanking, and
                  wallet accepted.
                </p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && !error && <p className="text-sm text-[#1C39BB]">{success}</p>}
              <button
                type="button"
                onClick={handlePay}
                disabled={paying || loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {(paying || loading) && <Loader2 size={16} className="animate-spin" />}
                {paying ? "Opening Razorpay…" : loading ? "Completing registration…" : `Pay ₹${paymentOrder.amountInr}`}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="mt-6">
              <p className="text-sm text-green-700">{success}</p>
              <Link
                to="/vle/dashboard"
                className="mt-4 inline-block text-sm font-medium text-[#1C39BB] hover:underline"
              >
                Return to dashboard
              </Link>
            </div>
          )}
        </div>
    </div>
  )
}
