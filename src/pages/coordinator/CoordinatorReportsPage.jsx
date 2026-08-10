import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { coordinatorFetch } from "../../api/coordinatorApi"
import { CoordinatorPeriodFilter } from "../../components/coordinator/CoordinatorDashboardCharts"

function formatInr(value) {
  return Number(value || 0).toLocaleString("en-IN")
}

export default function CoordinatorReportsPage() {
  const { session } = useAuth()
  const [period, setPeriod] = useState("month")
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const data = await coordinatorFetch(`/coordinator/reports?period=${period}`, {
        token: session.token,
      })
      setReport(data)
    } catch (err) {
      setError(err.message || "Could not load report.")
    } finally {
      setLoading(false)
    }
  }, [session?.token, period])

  useEffect(() => {
    load()
  }, [load])

  const districts = report?.districts || []

  return (
    <div className="page-safe-bottom mx-auto max-w-5xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#1C39BB]">District reports</p>
          <h1 className="font-serif text-2xl text-setu-charcoal">Performance by district</h1>
          {report?.periodLabel && (
            <p className="mt-1 text-sm text-setu-muted">{report.periodLabel}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CoordinatorPeriodFilter value={period} onChange={setPeriod} />
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

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-setu-muted">
          <Loader2 className="animate-spin" size={18} />
          Loading report…
        </div>
      ) : districts.length === 0 ? (
        <p className="rounded-2xl border border-[#D2DEFF] bg-white p-8 text-center text-sm text-setu-muted">
          No district data available for your assigned territories.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {districts.map((d) => (
            <div
              key={d.districtId}
              className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm"
            >
              <h2 className="font-semibold text-setu-charcoal">
                {d.districtName || d.districtId}
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-setu-muted">Total VLEs</dt>
                  <dd className="font-medium">{d.totalVle ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-setu-muted">Active VLEs</dt>
                  <dd className="font-medium">{d.activeVle ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-setu-muted">Total registrations</dt>
                  <dd className="font-medium">{d.totalRegistrations ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-setu-muted">Period registrations</dt>
                  <dd className="font-medium">{d.periodRegistrations ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-setu-muted">Period revenue</dt>
                  <dd className="font-medium">₹{formatInr(d.periodRevenueInr)}</dd>
                </div>
                <div className="flex justify-between border-t border-[#EEF3FF] pt-2">
                  <dt className="text-setu-muted">Total revenue</dt>
                  <dd className="font-semibold text-[#1C39BB]">
                    ₹{formatInr(d.totalRevenueInr)}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
