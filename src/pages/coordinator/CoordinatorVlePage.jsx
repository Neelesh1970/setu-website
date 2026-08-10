import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { coordinatorFetch } from "../../api/coordinatorApi"
import VleLocationFields, { formatVleLocation } from "../../components/coordinator/VleLocationFields"
import PasswordInput from "../../components/PasswordInput"

const SORT_OPTIONS = [
  { id: "registrations", label: "Registrations" },
  { id: "revenue", label: "Revenue" },
  { id: "activity", label: "Recent activity" },
]

function formatInr(value) {
  return Number(value || 0).toLocaleString("en-IN")
}

export default function CoordinatorVlePage() {
  const { session } = useAuth()
  const [sortBy, setSortBy] = useState("registrations")
  const [vles, setVles] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    district_id: "",
    districtLabel: "",
    state: "",
    city: "",
    village: "",
    pincode: "",
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createSuccess, setCreateSuccess] = useState("")
  const [districtOptions, setDistrictOptions] = useState([])

  const sessionDistricts = session?.assignedDistrictDetails || []

  const loadDistrictOptions = useCallback(async () => {
    if (!session?.token) return
    if (sessionDistricts.length) {
      setDistrictOptions(sessionDistricts)
      return
    }
    try {
      const data = await coordinatorFetch("/coordinator/districts", {
        token: session.token,
      })
      setDistrictOptions(data.districts || [])
    } catch {
      const fallback = (session?.assignedDistricts || []).map((id) => ({
        id,
        name: id,
        state: "",
        stateCode: "",
        label: id,
      }))
      setDistrictOptions(fallback)
    }
  }, [session?.token, session?.assignedDistricts, sessionDistricts])

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const data = await coordinatorFetch(
        `/coordinator/vle/district?sort_by=${sortBy}&limit=50`,
        { token: session.token },
      )
      setVles(data.vles || [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError(err.message || "Could not load district VLEs.")
    } finally {
      setLoading(false)
    }
  }, [session?.token, sortBy])

  useEffect(() => {
    loadDistrictOptions()
  }, [loadDistrictOptions])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreateLoading(true)
    setError("")
    setCreateSuccess("")
    try {
      const data = await coordinatorFetch("/coordinator/vle", {
        token: session.token,
        method: "POST",
        body: {
          name: createForm.name.trim(),
          phone: createForm.phone.trim(),
          email: createForm.email.trim() || undefined,
          password: createForm.password,
          district_id: createForm.district_id,
          state: createForm.state,
          city: createForm.city.trim(),
          village: createForm.village.trim() || undefined,
          pincode: createForm.pincode || undefined,
        },
      })
      setCreateSuccess(
        data.message || `VLE ${data.vleCode || ""} created successfully.`,
      )
      setCreateForm({
        name: "",
        phone: "",
        email: "",
        password: "",
        district_id: "",
        districtLabel: "",
        state: "",
        city: "",
        village: "",
        pincode: "",
      })
      setShowCreate(false)
      await load()
    } catch (err) {
      setError(err.message || "Could not create VLE.")
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <div className="page-safe-bottom mx-auto max-w-4xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#1C39BB]">VLE monitoring</p>
          <h1 className="font-serif text-2xl text-setu-charcoal">District VLEs</h1>
          <p className="mt-1 text-sm text-setu-muted">
            {total} VLE{total !== 1 ? "s" : ""} in your assigned districts · ranked by performance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCreate((s) => !s)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1C39BB] px-4 py-2 text-sm font-medium text-white"
          >
            <Plus size={16} />
            Create VLE
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#D2DEFF] bg-white px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSortBy(opt.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              sortBy === opt.id
                ? "border-[#1C39BB] bg-[#EEF3FF] text-[#1C39BB]"
                : "border-[#D2DEFF] bg-white text-setu-muted hover:border-[#1C39BB]/40"
            }`}
          >
            Sort: {opt.label}
          </button>
        ))}
      </div>

      {createSuccess && (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          {createSuccess}
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 space-y-3 rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm"
        >
          <h2 className="font-semibold text-setu-charcoal">Create VLE</h2>
          <p className="text-xs text-setu-muted">
            VLE can sign in and work immediately. Recorded as created by you (
            {session?.employeeCode || "DC"}).
          </p>
          <input
            required
            placeholder="Full name"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
          />
          <input
            required
            placeholder="Mobile (10 digits)"
            value={createForm.phone}
            onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
          />
          <input
            placeholder="Email (optional)"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
          />
          <PasswordInput
            value={createForm.password}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Password (min 6 chars)"
            required
            minLength={6}
            className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
          />
          <VleLocationFields
            districts={districtOptions}
            districtId={createForm.district_id}
            districtLabel={createForm.districtLabel}
            state={createForm.state}
            city={createForm.city}
            village={createForm.village}
            pincode={createForm.pincode}
            onChange={(patch) => setCreateForm((f) => ({ ...f, ...patch }))}
          />
          <button
            type="submit"
            disabled={createLoading}
            className="rounded-full bg-[#1C39BB] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {createLoading ? "Creating…" : "Create VLE"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-setu-muted">
          <Loader2 className="animate-spin" size={18} />
          Loading VLEs…
        </div>
      ) : vles.length === 0 ? (
        <p className="rounded-2xl border border-[#D2DEFF] bg-white p-8 text-center text-sm text-setu-muted">
          No VLEs in your districts yet. VLEs self-register with a pincode in your district, or
          you can create one above.
        </p>
      ) : (
        <ul className="space-y-3">
          {vles.map((vle) => (
            <li
              key={vle.vleProfileId}
              className="rounded-2xl border border-[#D2DEFF] bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF3FF] text-xs font-bold text-[#1C39BB]">
                      #{vle.rank}
                    </span>
                    <p className="font-medium text-setu-charcoal">{vle.name}</p>
                  </div>
                  <p className="mt-1 text-sm text-setu-muted">
                    {vle.vleCode} · {formatVleLocation(vle)}
                  </p>
                  <p className="text-xs text-setu-muted">
                    {vle.onboardingSource === "self_registered"
                      ? "Self-registered"
                      : "Created by coordinator"}
                    {vle.accountCreatedAt &&
                      ` · joined ${new Date(vle.accountCreatedAt).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
                  <div>
                    <dt className="text-xs text-setu-muted">Registrations</dt>
                    <dd className="font-semibold text-[#1C39BB]">{vle.registrations ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-setu-muted">Commission</dt>
                    <dd className="font-semibold">₹{formatInr(vle.revenueInr)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-setu-muted">Status</dt>
                    <dd className="font-medium capitalize">{vle.vleStatus || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-setu-muted">Last activity</dt>
                    <dd className="text-xs">
                      {vle.lastActivity
                        ? new Date(vle.lastActivity).toLocaleDateString("en-IN")
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
          {total > vles.length && (
            <p className="text-center text-xs text-setu-muted">
              Showing {vles.length} of {total} VLEs
            </p>
          )}
        </ul>
      )}
    </div>
  )
}
