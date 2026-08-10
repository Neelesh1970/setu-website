import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Loader2, RefreshCw, UserCheck } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { coordinatorFetch } from "../../api/coordinatorApi"
import {
  CoordinatorPeriodFilter,
  CoordinatorRegistrationsBar,
  CoordinatorRevenueBar,
} from "../../components/coordinator/CoordinatorDashboardCharts"

function formatInr(value) {
  return Number(value || 0).toLocaleString("en-IN")
}

function StatCard({ label, value, prefix = "", accent = false, sublabel }) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        accent
          ? "border-[#1C39BB]/30 bg-gradient-to-br from-[#1C39BB] to-[#2B5BFF] text-white"
          : "border-[#D2DEFF] bg-white"
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${accent ? "text-white/80" : "text-setu-muted"}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? "text-white" : "text-setu-charcoal"}`}>
        {prefix}
        {typeof value === "number" ? formatInr(value) : value}
      </p>
      {sublabel && (
        <p className={`mt-1 text-xs ${accent ? "text-white/70" : "text-setu-muted"}`}>{sublabel}</p>
      )}
    </div>
  )
}

export default function CoordinatorDashboardPage() {
  const { session } = useAuth()
  const [period, setPeriod] = useState("month")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState("")

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!session?.token) return
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const [metricsData, analyticsData] = await Promise.all([
        coordinatorFetch("/coordinator/metrics", { token: session.token }),
        coordinatorFetch(`/coordinator/analytics?period=${period}`, { token: session.token }),
      ])
      setMetrics(metricsData)
      setAnalytics(analyticsData)
    } catch (err) {
      setError(err.message || "Could not load dashboard.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [session?.token, period])

  useEffect(() => {
    load()
  }, [load])

  const revenue = metrics?.districtRevenue || {}
  const districts = session?.assignedDistricts || []

  return (
    <div className="page-safe-bottom mx-auto max-w-6xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#1C39BB]">District Coordinator</p>
          <h1 className="font-serif text-2xl text-setu-charcoal">
            Welcome, {session?.name?.split(" ")[0] || "Coordinator"}
          </h1>
          {districts.length > 0 && (
            <p className="mt-1 text-sm text-setu-muted">
              Assigned: {districts.join(", ")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => load({ silent: true })}
            disabled={loading || refreshing}
            className="tap-target inline-flex items-center gap-2 rounded-xl border border-[#D2DEFF] bg-white px-3 py-2 text-sm font-medium text-setu-charcoal shadow-sm transition hover:border-[#1C39BB]/40 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <CoordinatorPeriodFilter value={period} onChange={setPeriod} />
        </div>
      </div>

      {loading && !metrics && (
        <div className="flex items-center gap-2 text-setu-muted">
          <Loader2 className="animate-spin" size={18} />
          Loading dashboard…
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {!loading && !error && metrics && (
        <>
          <p className="mb-3 text-sm text-setu-muted">
            Analytics for{" "}
            <span className="font-medium text-[#1C39BB]">
              {analytics?.periodLabel || period}
            </span>
          </p>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total VLEs" value={metrics.totalVle ?? 0} />
            <StatCard label="Active VLEs" value={metrics.activeVle ?? 0} accent />
            <StatCard label="Today registrations" value={metrics.todayRegistrations ?? 0} />
            <StatCard label="Total registrations" value={metrics.totalRegistrations ?? 0} />
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Month registrations" value={metrics.monthRegistrations ?? 0} />
            <StatCard
              label="Month revenue"
              value={revenue.monthInr ?? 0}
              prefix="₹"
            />
            <StatCard
              label="Total revenue"
              value={revenue.totalInr ?? 0}
              prefix="₹"
            />
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <CoordinatorRegistrationsBar
              data={analytics?.registrationsOverTime}
              period={analytics?.periodLabel}
            />
            <CoordinatorRevenueBar
              data={analytics?.revenueOverTime}
              period={analytics?.periodLabel}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              to="/coordinator/vle"
              className="flex flex-col items-center gap-2 rounded-2xl border border-[#D2DEFF] bg-white p-4 text-center shadow-sm transition hover:border-[#1C39BB]/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF3FF] text-[#1C39BB]">
                <UserCheck size={22} />
              </span>
              <span className="text-xs font-medium text-setu-charcoal">District VLEs</span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
