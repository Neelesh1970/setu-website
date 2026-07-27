import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2 } from "lucide-react"
import { assets } from "../data/content"
import { completeRegistrationProfile } from "../api/auth"
import { useAuth } from "../context/AuthContext"

export default function RegisterProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { mobile, mobileAlreadyVerified, preferredFirstName } = location.state || {}

  const [firstName, setFirstName] = useState(
    () => (preferredFirstName ? String(preferredFirstName) : ""),
  )
  const [lastName, setLastName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!mobile) {
    return (
      <div className="auth-page-shell bg-setu-cream">
        <div className="auth-page-inner items-center justify-center text-center">
          <p className="text-setu-muted">Start registration with your mobile number first.</p>
          <Link to="/register" className="mt-4 inline-block text-setu-teal hover:underline">
            Go to register
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return

    setError("")
    setLoading(true)
    try {
      const session = await completeRegistrationProfile({
        mobile,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      login({ ...session, accountType: "user" })
      // Session is live — go straight into the web app. Never /register/complete.
      navigate("/app", { replace: true })
    } catch (err) {
      if (err?.code === "USER_ALREADY_EXISTS") {
        navigate("/login", {
          replace: true,
          state: { from: "/app", notice: err.message },
        })
        return
      }
      setError(
        err.message ||
          "Could not complete registration. Check your connection and try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-shell">
      <div className="auth-page-inner">
        <Link
          to="/register"
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm text-setu-muted transition-colors hover:text-setu-charcoal sm:mb-8"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="overflow-hidden rounded-[1.75rem] border border-[#D2DEFF] bg-white shadow-sm">
          <div className="bg-[#1C39BB] px-6 py-6 text-white sm:px-8">
            <img
              src={assets.logo}
              alt="SETU"
              className="mb-4 h-9 w-auto brightness-0 invert"
            />
            <h1 className="font-serif text-2xl sm:text-3xl">Hey there!</h1>
            <p className="mt-1 text-sm text-white/80">
              {mobileAlreadyVerified
                ? "Your mobile is verified. Tell us your name to continue."
                : "We need a few details to get you started."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6 sm:p-8">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-setu-charcoal">First name</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3 outline-none focus:border-[#1C39BB]"
                autoComplete="given-name"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-setu-charcoal">Last name</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3 outline-none focus:border-[#1C39BB]"
                autoComplete="family-name"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || !firstName.trim() || !lastName.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Continue to SETU
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
