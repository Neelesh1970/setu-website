import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { coordinatorFetch } from "../../api/coordinatorApi"

function formatInr(value) {
  return Number(value || 0).toLocaleString("en-IN")
}

function rankLabel(rank) {
  if (rank === 1) return "1st"
  if (rank === 2) return "2nd"
  if (rank === 3) return "3rd"
  return `#${rank}`
}

export default function CoordinatorLeaderboardPage() {
  const { session } = useAuth()
  const [sortBy, setSortBy] = useState("registrations")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const result = await coordinatorFetch(
        `/coordinator/leaderboard?limit=50&sort_by=${sortBy}`,
        { token: session.token },
      )
      setData(result)
    } catch (err) {
      setError(err.message || "Could not load leaderboard.")
    } finally {
      setLoading(false)
    }
  }, [session?.token, sortBy])

  useEffect(() => {
    load()
  }, [load])

  const entries = data?.leaderboard || []

  return (
    <div className="page-safe-bottom mx-auto max-w-4xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#1C39BB]">District leaderboard</p>
          <h1 className="font-serif text-2xl text-setu-charcoal">Top VLEs in your districts</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-[#D2DEFF] bg-white px-3 py-2 text-sm outline-none focus:border-[#1C39BB]"
          >
            <option value="registrations">By registrations</option>
            <option value="revenue">By revenue</option>
            <option value="activity">By activity</option>
          </select>
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

      {loading && (
        <div className="flex items-center gap-2 text-setu-muted">
          <Loader2 className="animate-spin" size={18} />
          Loading…
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-2xl border border-[#D2DEFF] bg-white shadow-sm">
          {entries.length === 0 ? (
            <p className="p-8 text-center text-sm text-setu-muted">No VLE data in your districts yet.</p>
          ) : (
            <ul className="divide-y divide-[#EEF3FF]">
              {entries.map((entry) => (
                <li
                  key={entry.vleCode}
                  className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-setu-charcoal">
                      {rankLabel(entry.rank)} · {entry.name}
                      <span className="ml-2 text-sm font-normal text-setu-muted">
                        ({entry.vleCode})
                      </span>
                    </p>
                    <p className="text-sm text-setu-muted">
                      {entry.districtName || entry.districtId}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>
                      <strong>{entry.registrations ?? 0}</strong> registrations
                    </span>
                    <span className="text-setu-muted">
                      ₹{formatInr(entry.revenueInr)}
                    </span>
                    {entry.lastActivity && (
                      <span className="text-setu-muted">
                        Last active: {new Date(entry.lastActivity).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data?.total != null && (
            <p className="border-t border-[#EEF3FF] px-4 py-3 text-xs text-setu-muted">
              Showing {entries.length} of {data.total} VLEs
            </p>
          )}
        </div>
      )}
    </div>
  )
}
