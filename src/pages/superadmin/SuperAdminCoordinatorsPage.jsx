import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, RefreshCw, Shield, X } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { adminFetch } from "../../api/adminApi"

const STATUS_OPTIONS = [
  { id: "", label: "All statuses" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
]

function statusClass(status) {
  return status === "active"
    ? "bg-green-50 text-green-800"
    : "bg-gray-100 text-gray-700"
}

export default function SuperAdminCoordinatorsPage() {
  const { session } = useAuth()
  const [coordinators, setCoordinators] = useState([])
  const [total, setTotal] = useState(0)
  const [districts, setDistricts] = useState([])
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionId, setActionId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [assignId, setAssignId] = useState(null)
  const [assignDistrictIds, setAssignDistrictIds] = useState([])
  const [createForm, setCreateForm] = useState({
    userId: "",
    employeeCode: "",
    stateCode: "",
    notes: "",
    districtIds: [],
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createSuccess, setCreateSuccess] = useState("")

  const districtOptions = useMemo(
    () =>
      districts.map((d) => ({
        id: d.id,
        name: d.name,
        state: d.state,
        label: `${d.name}, ${d.state}`,
      })),
    [districts],
  )

  const loadDistricts = useCallback(async () => {
    if (!session?.token) return
    try {
      const rows = await adminFetch("/admin/districts", { token: session.token })
      setDistricts(Array.isArray(rows) ? rows : rows?.districts || [])
    } catch (err) {
      setError(err.message || "Could not load districts.")
    }
  }, [session?.token])

  const loadCoordinators = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const qs = new URLSearchParams({ limit: "50", offset: "0" })
      if (statusFilter) qs.set("status", statusFilter)
      if (search.trim()) qs.set("search", search.trim())
      const data = await adminFetch(`/admin/coordinators?${qs}`, { token: session.token })
      setCoordinators(data.coordinators || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.message || "Could not load coordinators.")
    } finally {
      setLoading(false)
    }
  }, [session?.token, statusFilter, search])

  useEffect(() => {
    loadDistricts()
  }, [loadDistricts])

  useEffect(() => {
    loadCoordinators()
  }, [loadCoordinators])

  const toggleCreateDistrict = (districtId) => {
    setCreateForm((f) => {
      const has = f.districtIds.includes(districtId)
      const districtIds = has
        ? f.districtIds.filter((id) => id !== districtId)
        : [...f.districtIds, districtId]
      const picked = districtOptions.find((d) => d.id === districtId)
      const stateCode =
        !f.stateCode && picked?.state
          ? String(picked.state).slice(0, 2).toUpperCase()
          : f.stateCode
      return { ...f, districtIds, stateCode: f.stateCode || stateCode }
    })
  }

  const toggleAssignDistrict = (districtId) => {
    setAssignDistrictIds((ids) =>
      ids.includes(districtId) ? ids.filter((id) => id !== districtId) : [...ids, districtId],
    )
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError("")
    setCreateSuccess("")
    const userId = Number(createForm.userId)
    if (!userId) {
      setError("User ID is required.")
      return
    }
    if (!createForm.employeeCode.trim() || !createForm.stateCode.trim()) {
      setError("Employee code and state code are required.")
      return
    }
    setCreateLoading(true)
    try {
      await adminFetch("/admin/coordinators", {
        token: session.token,
        httpMethod: "POST",
        body: {
          userId,
          employeeCode: createForm.employeeCode.trim(),
          stateCode: createForm.stateCode.trim().toUpperCase(),
          notes: createForm.notes.trim() || undefined,
          districtIds: createForm.districtIds,
        },
      })
      setCreateSuccess("District Coordinator created.")
      setCreateForm({
        userId: "",
        employeeCode: "",
        stateCode: "",
        notes: "",
        districtIds: [],
      })
      setShowCreate(false)
      loadCoordinators()
    } catch (err) {
      setError(err.message || "Create failed.")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleStatus = async (coordinatorId, status) => {
    setActionId(coordinatorId)
    setError("")
    try {
      await adminFetch(`/admin/coordinators/${coordinatorId}/status`, {
        token: session.token,
        httpMethod: "PATCH",
        body: { status },
      })
      loadCoordinators()
    } catch (err) {
      setError(err.message || "Status update failed.")
    } finally {
      setActionId(null)
    }
  }

  const openAssign = (coordinator) => {
    setAssignId(coordinator.coordinatorId)
    setAssignDistrictIds(coordinator.districtIds || [])
    setError("")
  }

  const handleAssign = async () => {
    if (!assignId) return
    setActionId(assignId)
    setError("")
    try {
      await adminFetch(`/admin/coordinators/${assignId}/districts`, {
        token: session.token,
        httpMethod: "PUT",
        body: { districtIds: assignDistrictIds },
      })
      setAssignId(null)
      loadCoordinators()
    } catch (err) {
      setError(err.message || "District assignment failed.")
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-[#EEF3FF] px-3 py-1 text-xs font-medium text-[#1C39BB]">
            <Shield size={14} />
            Super Admin
          </div>
          <h1 className="font-serif text-2xl text-setu-charcoal sm:text-3xl">
            District Coordinators
          </h1>
          <p className="mt-1 text-sm text-setu-muted">
            Create coordinator profiles, assign districts, and manage access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadCoordinators}
            className="inline-flex items-center gap-2 rounded-full border border-[#D2DEFF] bg-white px-4 py-2 text-sm font-medium text-[#1C39BB]"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(true)
              setCreateSuccess("")
              setError("")
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#1C39BB] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            Create coordinator
          </button>
        </div>
      </div>

      {createSuccess && (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          {createSuccess}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[#D2DEFF] px-3 py-2 text-sm outline-none focus:border-[#1C39BB]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.id || "all"} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email or employee code"
          className="min-w-[14rem] flex-1 rounded-xl border border-[#D2DEFF] px-3 py-2 text-sm outline-none focus:border-[#1C39BB]"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#1C39BB]" size={32} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#D2DEFF] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#F7FAFF] text-xs uppercase tracking-wide text-setu-muted">
                <tr>
                  <th className="px-4 py-3">Coordinator</th>
                  <th className="px-4 py-3">Districts</th>
                  <th className="px-4 py-3">VLEs</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coordinators.map((c) => (
                  <tr key={c.coordinatorId} className="border-t border-[#EEF3FF]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-setu-charcoal">{c.name}</p>
                      <p className="text-xs text-setu-muted">{c.email}</p>
                      <p className="text-xs text-setu-muted">{c.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-setu-muted">
                      {(c.districtNames || []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {c.activeVle ?? 0} / {c.totalVle ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(c.status)}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openAssign(c)}
                          className="rounded-lg border border-[#D2DEFF] px-2.5 py-1 text-xs font-medium text-[#1C39BB]"
                        >
                          Districts
                        </button>
                        {c.status === "active" ? (
                          <button
                            type="button"
                            disabled={actionId === c.coordinatorId}
                            onClick={() => handleStatus(c.coordinatorId, "inactive")}
                            className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-800 disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionId === c.coordinatorId}
                            onClick={() => handleStatus(c.coordinatorId, "active")}
                            className="rounded-lg border border-green-200 px-2.5 py-1 text-xs font-medium text-green-800 disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!coordinators.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-setu-muted">
                      No coordinators found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#EEF3FF] px-4 py-3 text-xs text-setu-muted">
            Showing {coordinators.length} of {total}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-setu-charcoal">Create coordinator</h2>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                required
                type="number"
                min={1}
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
                placeholder="SETU user ID"
                value={createForm.userId}
                onChange={(e) => setCreateForm((f) => ({ ...f, userId: e.target.value }))}
              />
              <p className="text-xs text-setu-muted">
                User must already exist in SETU-AUTH and the VLE users table (register via app
                first, then use their user_id).
              </p>
              <input
                required
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
                placeholder="Employee code (e.g. DC-MH-PUN-001)"
                value={createForm.employeeCode}
                onChange={(e) => setCreateForm((f) => ({ ...f, employeeCode: e.target.value }))}
              />
              <input
                required
                maxLength={4}
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5 text-sm uppercase outline-none focus:border-[#1C39BB]"
                placeholder="State code (e.g. MH)"
                value={createForm.stateCode}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, stateCode: e.target.value.toUpperCase() }))
                }
              />
              <textarea
                rows={2}
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
                placeholder="Notes (optional)"
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
              />
              <div>
                <p className="mb-2 text-sm font-medium text-setu-charcoal">Assign districts</p>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[#D2DEFF] p-2">
                  {districtOptions.map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#F7FAFF]"
                    >
                      <input
                        type="checkbox"
                        checked={createForm.districtIds.includes(d.id)}
                        onChange={() => toggleCreateDistrict(d.id)}
                      />
                      <span className="text-sm">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={createLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {createLoading && <Loader2 size={16} className="animate-spin" />}
                Create coordinator
              </button>
            </form>
          </div>
        </div>
      )}

      {assignId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-setu-charcoal">Assign districts</h2>
              <button type="button" onClick={() => setAssignId(null)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[#D2DEFF] p-2">
              {districtOptions.map((d) => (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#F7FAFF]"
                >
                  <input
                    type="checkbox"
                    checked={assignDistrictIds.includes(d.id)}
                    onChange={() => toggleAssignDistrict(d.id)}
                  />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={actionId === assignId}
              onClick={handleAssign}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {actionId === assignId && <Loader2 size={16} className="animate-spin" />}
              Save districts
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
