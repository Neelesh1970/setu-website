import { useEffect, useState } from "react"
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom"
import { ArrowLeft, ChevronDown, Loader2, Smartphone } from "lucide-react"
import { assets } from "../data/content"
import {
  loginWithOtp,
  sendLoginOtp,
  sendRegistrationOtp,
  verifyRegistrationOtp,
} from "../api/auth"
import { loginCoordinator } from "../api/coordinatorApi"
import { loginSuperAdmin, loginVle, registerVle } from "../api/roleAuth"
import VleLocationFields from "../components/coordinator/VleLocationFields"
import PasswordInput from "../components/PasswordInput"
import { useAuth } from "../context/AuthContext"

const OTP_LENGTH = 6

const ACCOUNT_ROLES = [
  { value: "user", label: "User", hint: "Mobile OTP — patient app access" },
  { value: "vle", label: "VLE", hint: "VLE ID + password — register users & wallet" },
  {
    value: "district_coordinator",
    label: "District Coordinator",
    hint: "Email or mobile + password — district portal",
  },
  {
    value: "super_admin",
    label: "Super Admin",
    hint: "Email + password — manage district coordinators",
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, login, isAuthenticated, loading: authLoading } = useAuth()
  const isRegister = location.pathname.startsWith("/register")

  const [accountRole, setAccountRole] = useState("user")
  const [step, setStep] = useState("credentials")
  const [mobile, setMobile] = useState("")
  const [otp, setOtp] = useState("")
  const [flow, setFlow] = useState("login")
  const [receiveUpdates, setReceiveUpdates] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errorCode, setErrorCode] = useState("")

  // VLE / coordinator fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [vleId, setVleId] = useState("")
  const [vleDistrictId, setVleDistrictId] = useState("")
  const [vleDistrictLabel, setVleDistrictLabel] = useState("")
  const [vleState, setVleState] = useState("")
  const [vleCity, setVleCity] = useState("")
  const [vleVillage, setVleVillage] = useState("")
  const [vlePincode, setVlePincode] = useState("")

  const notice = location.state?.notice || ""

  useEffect(() => {
    const prefilled = location.state?.mobile
    if (prefilled && /^[6-9][0-9]{9}$/.test(String(prefilled))) {
      setMobile(String(prefilled))
    }
  }, [location.state?.mobile])

  useEffect(() => {
    setStep("credentials")
    setOtp("")
    setError("")
    setErrorCode("")
  }, [accountRole, isRegister])

  const redirectTo = location.state?.from || "/app"

  if (!authLoading && isAuthenticated) {
    const type = session?.accountType || "user"
    if (type === "vle") return <Navigate to="/vle/dashboard" replace />
    if (type === "district_coordinator") {
      return <Navigate to="/coordinator/dashboard" replace />
    }
    if (type === "super_admin") {
      return <Navigate to="/super-admin/coordinators" replace />
    }
    return <Navigate to={redirectTo} replace />
  }

  const handleUserSendOtp = async (e) => {
    e.preventDefault()
    setError("")
    setErrorCode("")
    const trimmed = mobile.trim()
    if (!/^[6-9][0-9]{9}$/.test(trimmed)) {
      setError("Enter a valid 10-digit Indian mobile number.")
      return
    }
    setLoading(true)
    try {
      const result = isRegister
        ? await sendRegistrationOtp(trimmed, receiveUpdates)
        : await sendLoginOtp(trimmed)
      setMobile(trimmed)
      setFlow(result.kind)
      if (result.kind === "profile") {
        navigate("/register/profile", {
          state: {
            mobile: trimmed,
            mobileAlreadyVerified: result.mobileAlreadyVerified,
          },
        })
        return
      }
      setStep("otp")
    } catch (err) {
      setError(err.message || "Failed to send OTP.")
      setErrorCode(err.code || "")
    } finally {
      setLoading(false)
    }
  }

  const handleUserVerifyOtp = async (e) => {
    e.preventDefault()
    setError("")
    if (otp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit OTP.")
      return
    }
    setLoading(true)
    try {
      if (flow === "login") {
        const userSession = await loginWithOtp(mobile, otp)
        login({ ...userSession, accountType: "user" })
        navigate(redirectTo, { replace: true })
        return
      }
      await verifyRegistrationOtp(mobile, otp)
      navigate("/register/profile", { state: { mobile } })
    } catch (err) {
      setError(err.message || "OTP verification failed.")
    } finally {
      setLoading(false)
    }
  }

  const handleVleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (isRegister) {
      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }
      if (!/^[6-9][0-9]{9}$/.test(mobile.trim())) {
        setError("Enter a valid 10-digit mobile number.")
        return
      }
      if (!name.trim()) {
        setError("Name is required.")
        return
      }
      if (!vleDistrictId) {
        setError("Enter a valid pincode — district could not be detected.")
        return
      }
      if (!/^\d{6}$/.test(vlePincode)) {
        setError("Enter a valid 6-digit pincode.")
        return
      }
      if (!vleCity.trim()) {
        setError("City / taluka is required.")
        return
      }
    } else if (!vleId.trim()) {
      setError("VLE ID is required.")
      return
    }

    setLoading(true)
    try {
      const vleResult = isRegister
        ? await registerVle({
            name: name.trim(),
            phone: mobile.trim(),
            email: email.trim() || undefined,
            password,
            district_id: vleDistrictId,
            state: vleState,
            city: vleCity.trim(),
            village: vleVillage.trim() || undefined,
            pincode: vlePincode || undefined,
          })
        : await loginVle({ vleId: vleId.trim(), password })
      login(vleResult)
      navigate("/vle/dashboard", { replace: true })
    } catch (err) {
      setError(err.message || "VLE authentication failed.")
    } finally {
      setLoading(false)
    }
  }

  const handleCoordinatorSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (isRegister) {
      setError(
        "District Coordinator accounts are created by a Super Admin. Sign in with your assigned credentials.",
      )
      return
    }
    const trimmedEmail = email.trim()
    const trimmedMobile = mobile.trim()
    if ((!trimmedEmail && !trimmedMobile) || !password) {
      setError("Email or mobile, and password are required.")
      return
    }

    setLoading(true)
    try {
      const coordinatorSession = await loginCoordinator({
        email: trimmedEmail || undefined,
        phone: trimmedMobile || undefined,
        password,
      })
      login(coordinatorSession)
      navigate("/coordinator/dashboard", { replace: true })
    } catch (err) {
      setError(err.message || "Authentication failed.")
    } finally {
      setLoading(false)
    }
  }

  const handleSuperAdminSubmit = async (e) => {
    e.preventDefault()
    setError("")
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError("Email and password are required.")
      return
    }
    setLoading(true)
    try {
      const adminSession = await loginSuperAdmin({ email: trimmedEmail, password })
      login(adminSession)
      navigate("/super-admin/coordinators", { replace: true })
    } catch (err) {
      setError(err.message || "Authentication failed.")
    } finally {
      setLoading(false)
    }
  }

  const roleMeta = ACCOUNT_ROLES.find((r) => r.value === accountRole)

  return (
    <div className="auth-page-shell">
      <div className="auth-page-inner">
        <Link
          to="/"
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm text-setu-muted transition-colors hover:text-setu-charcoal sm:mb-8"
        >
          <ArrowLeft size={16} />
          Back to website
        </Link>

        <div className="overflow-hidden rounded-[1.75rem] border border-[#D2DEFF] bg-white shadow-sm">
          <div className="bg-[#1C39BB] px-5 py-5 text-white sm:px-8 sm:py-6">
            <img
              src={assets.logo}
              alt="SETU"
              className="mb-3 h-8 w-auto brightness-0 invert sm:mb-4 sm:h-9"
            />
            <h1 className="font-serif text-xl sm:text-3xl">
              {isRegister ? "Create account" : "Sign in to SETU"}
            </h1>
            <p className="mt-1 text-sm text-white/80">{roleMeta?.hint}</p>
          </div>

          <div className="p-5 sm:p-8">
            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-medium text-setu-charcoal">
                Account type
              </span>
              <div className="relative">
                <select
                  value={accountRole}
                  onChange={(e) => setAccountRole(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-[#D2DEFF] bg-white px-3 py-3 pr-10 text-setu-charcoal outline-none focus:border-[#1C39BB]"
                >
                  {ACCOUNT_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-setu-muted"
                />
              </div>
            </label>

            {accountRole === "user" && step === "credentials" && (
              <form onSubmit={handleUserSendOtp} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-setu-charcoal">
                    Mobile number
                  </span>
                  <div className="flex overflow-hidden rounded-xl border border-[#D2DEFF] focus-within:border-[#1C39BB]">
                    <span className="flex items-center bg-[#EEF3FF] px-3 text-sm text-[#1C39BB]">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-3 py-3 text-setu-charcoal outline-none"
                      placeholder="10-digit number"
                      autoComplete="tel"
                    />
                  </div>
                </label>

                {isRegister && (
                  <label className="flex items-start gap-3 text-sm text-setu-muted">
                    <input
                      type="checkbox"
                      checked={receiveUpdates}
                      onChange={(e) => setReceiveUpdates(e.target.checked)}
                      className="mt-1"
                    />
                    <span>Receive health updates and SETU program notifications</span>
                  </label>
                )}

                {notice && !error && <p className="text-sm text-[#1C39BB]">{notice}</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}

                {errorCode === "USER_NOT_FOUND" && !isRegister && (
                  <Link
                    to="/register"
                    state={{
                      mobile: mobile.trim(),
                      notice: "Create your SETU account to continue.",
                    }}
                    className="inline-flex w-full items-center justify-center rounded-full border border-[#1C39BB] bg-white px-5 py-3 text-sm font-semibold text-[#1C39BB]"
                  >
                    Create account
                  </Link>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Send OTP
                </button>
              </form>
            )}

            {accountRole === "user" && step === "otp" && (
              <form onSubmit={handleUserVerifyOtp} className="space-y-4">
                <p className="text-sm text-setu-muted">
                  OTP sent to <strong className="text-setu-charcoal">+91 {mobile}</strong>
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={OTP_LENGTH}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
                  }
                  className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-[#1C39BB]"
                  placeholder="••••••"
                  autoComplete="one-time-code"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Verify & continue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("credentials")
                    setOtp("")
                    setError("")
                  }}
                  className="w-full text-sm text-setu-muted hover:text-setu-charcoal"
                >
                  Change mobile number
                </button>
              </form>
            )}

            {accountRole === "vle" && (
              <form onSubmit={handleVleSubmit} className="space-y-4">
                {isRegister ? (
                  <>
                    <input
                      className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3 outline-none focus:border-[#1C39BB]"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <div className="flex overflow-hidden rounded-xl border border-[#D2DEFF] focus-within:border-[#1C39BB]">
                      <span className="flex items-center bg-[#EEF3FF] px-3 text-sm text-[#1C39BB]">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                        className="w-full px-3 py-3 outline-none"
                        placeholder="Mobile number"
                      />
                    </div>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3 outline-none focus:border-[#1C39BB]"
                      placeholder="Email (optional)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <VleLocationFields
                      state={vleState}
                      city={vleCity}
                      village={vleVillage}
                      pincode={vlePincode}
                      districtLabel={vleDistrictLabel}
                      onChange={(patch) => {
                        if (patch.state != null) setVleState(patch.state)
                        if (patch.city != null) setVleCity(patch.city)
                        if (patch.village != null) setVleVillage(patch.village)
                        if (patch.pincode != null) {
                          setVlePincode(patch.pincode)
                          if (patch.pincode.length < 6) {
                            setVleDistrictId("")
                            setVleDistrictLabel("")
                          }
                        }
                      }}
                      onDistrictMatch={(districtId, district) => {
                        setVleDistrictId(districtId || "")
                        setVleDistrictLabel(district?.label || "")
                        if (district?.state) setVleState(district.state)
                      }}
                    />
                    <p className="rounded-xl border border-[#EEF3FF] bg-[#F8FAFF] px-3 py-2.5 text-xs text-setu-muted">
                      Register with your pincode — your district is set automatically and you can
                      sign in immediately.
                    </p>
                  </>
                ) : (
                  <input
                    className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3 outline-none focus:border-[#1C39BB]"
                    placeholder="VLE ID (e.g. VLE000001)"
                    value={vleId}
                    onChange={(e) => setVleId(e.target.value.toUpperCase())}
                  />
                )}
                <PasswordInput
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {isRegister && (
                  <PasswordInput
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {isRegister ? "Register as VLE" : "Sign in to VLE dashboard"}
                </button>
              </form>
            )}

            {accountRole === "district_coordinator" && (
              <>
                {isRegister ? (
                  <div className="space-y-4">
                    <p className="rounded-xl bg-[#EEF3FF] px-4 py-3 text-sm text-setu-charcoal">
                      District Coordinator profiles are created by a Super Admin after you
                      register as a SETU user. Use your assigned email or mobile to sign in.
                    </p>
                    <Link
                      to="/login"
                      className="tap-target inline-flex w-full items-center justify-center rounded-full bg-[#1C39BB] px-5 py-3 text-sm font-semibold text-white"
                    >
                      Go to sign in
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleCoordinatorSubmit} className="space-y-4">
                    <input
                      type="email"
                      className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3 outline-none focus:border-[#1C39BB]"
                      placeholder="Email (optional if mobile provided)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <div className="flex overflow-hidden rounded-xl border border-[#D2DEFF] focus-within:border-[#1C39BB]">
                      <span className="flex items-center bg-[#EEF3FF] px-3 text-sm text-[#1C39BB]">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                        className="w-full px-3 py-3 outline-none"
                        placeholder="Mobile (optional if email provided)"
                      />
                    </div>
                    <PasswordInput
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {loading && <Loader2 size={16} className="animate-spin" />}
                      Sign in to coordinator portal
                    </button>
                  </form>
                )}
              </>
            )}

            {accountRole === "super_admin" && (
              <>
                {isRegister ? (
                  <div className="space-y-4">
                    <p className="rounded-xl bg-[#EEF3FF] px-4 py-3 text-sm text-setu-charcoal">
                      Super Admin accounts are provisioned internally. Sign in with your assigned
                      email and password.
                    </p>
                    <Link
                      to="/login"
                      className="tap-target inline-flex w-full items-center justify-center rounded-full bg-[#1C39BB] px-5 py-3 text-sm font-semibold text-white"
                    >
                      Go to sign in
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSuperAdminSubmit} className="space-y-4">
                    <input
                      required
                      type="email"
                      className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3 outline-none focus:border-[#1C39BB]"
                      placeholder="Super Admin email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <PasswordInput
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {loading && <Loader2 size={16} className="animate-spin" />}
                      Sign in to Super Admin portal
                    </button>
                  </form>
                )}
              </>
            )}

            <div className="mt-6 rounded-2xl bg-setu-sand/70 p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="mt-0.5 shrink-0 text-[#1C39BB]" size={18} />
                <p className="text-sm leading-relaxed text-setu-muted">
                  {accountRole === "user" &&
                    (isRegister
                      ? "Verify mobile, add your name, and access the SETU web app."
                      : "Sign in with the same mobile OTP as the SETU app.")}
                  {accountRole === "vle" &&
                    (isRegister
                      ? "Register as a VLE in your district with pincode — sign in right away with your VLE ID."
                      : "VLE portal — register users, track commissions, and manage wallet.")}
                  {accountRole === "district_coordinator" &&
                    "Manage VLEs, view district metrics, handle support tickets, and run campaigns in your assigned districts."}
                  {accountRole === "super_admin" &&
                    "Create District Coordinator profiles, assign territories, and activate or deactivate coordinator access."}
                </p>
              </div>
            </div>

            <p className="mt-4 text-center text-sm text-setu-muted">
              {isRegister ? (
                <>
                  Already have an account?{" "}
                  <Link to="/login" className="font-medium text-[#1C39BB] hover:underline">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  New to SETU?{" "}
                  <Link to="/register" className="font-medium text-[#1C39BB] hover:underline">
                    Create account
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
