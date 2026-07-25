import { useCallback, useEffect, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { vleAuthFetch } from "../../api/roleAuth"

const BADGE_STYLES = {
  "app pending": "bg-amber-100 text-amber-800",
  "app opened": "bg-green-100 text-green-800",
  "annual paid": "bg-green-100 text-green-800",
  trial: "bg-blue-100 text-blue-800",
  expired: "bg-red-100 text-red-700",
  active: "bg-green-100 text-green-800",
  none: "bg-gray-100 text-gray-600",
  "paid ₹200": "bg-emerald-100 text-emerald-800",
  paid: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-700",
}

function StatusBadge({ label }) {
  const key = String(label || "").toLowerCase()
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[key] || BADGE_STYLES.none}`}
      title={label}
    >
      {label}
    </span>
  )
}

export default function VleCustomersPage() {
  const { session } = useAuth()
  const [query, setQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [summary, setSummary] = useState(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const [searchData, downloadData] = await Promise.all([
        vleAuthFetch(`/dashboard/customers/search?q=${encodeURIComponent(query)}`, {
          token: session.token,
          refreshToken: session.refreshToken,
        }),
        vleAuthFetch("/dashboard/customers/download-status?limit=100", {
          token: session.token,
          refreshToken: session.refreshToken,
        }),
      ])
      setCustomers(searchData?.customers || [])
      setTotal(searchData?.total || 0)
      setSummary(downloadData?.summary || null)
    } catch (err) {
      setError(err.message || "Could not load customers.")
    } finally {
      setLoading(false)
    }
  }, [session?.token, session?.refreshToken, query])

  useEffect(() => {
    load()
  }, [load])

  const handleSearch = (e) => {
    e.preventDefault()
    setQuery(searchInput.trim())
  }

  return (
    <div className="page-safe-bottom mx-auto max-w-4xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[#1C39BB]">Customer Search</p>
        <h1 className="font-serif text-2xl text-setu-charcoal">Your registered citizens</h1>
        <p className="mt-1 text-xs text-setu-muted">
          ₹200 paid registration = 1 year annual membership · App pending = not logged into app yet
        </p>
      </div>

      {summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#D2DEFF] bg-white p-4 text-center">
            <p className="text-2xl font-semibold">{summary.total}</p>
            <p className="text-xs text-setu-muted">Total</p>
          </div>
          <div className="rounded-xl border border-[#D2DEFF] bg-white p-4 text-center">
            <p className="text-2xl font-semibold text-green-700">{summary.downloaded}</p>
            <p className="text-xs text-setu-muted">App opened</p>
          </div>
          <div className="rounded-xl border border-[#D2DEFF] bg-white p-4 text-center">
            <p className="text-2xl font-semibold text-amber-700">{summary.pending}</p>
            <p className="text-xs text-setu-muted">App pending</p>
          </div>
          <div className="rounded-xl border border-[#D2DEFF] bg-white p-4 text-center">
            <p className="text-2xl font-semibold">{summary.downloadRatePercent}%</p>
            <p className="text-xs text-setu-muted">App open rate</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-setu-muted" size={18} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, phone, or UHID"
            className="w-full rounded-xl border border-[#D2DEFF] py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-[#1C39BB] px-4 py-2.5 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>

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
        <div className="rounded-2xl border border-[#D2DEFF] bg-white shadow-sm">
          <div className="border-b border-[#EEF3FF] px-4 py-3 text-sm text-setu-muted">
            {total} customer{total !== 1 ? "s" : ""} found
          </div>
          {customers.length === 0 ? (
            <p className="p-6 text-sm text-setu-muted">No customers match your search.</p>
          ) : (
            <ul className="divide-y divide-[#EEF3FF]">
              {customers.map((c) => (
                <li key={c.userId} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-setu-charcoal">{c.name || "—"}</p>
                      <p className="text-sm text-setu-muted">
                        {c.phone} · {c.uhid}
                      </p>
                      {c.city && (
                        <p className="text-xs text-setu-muted">
                          {c.city}
                          {c.state ? `, ${c.state}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge label={c.downloadLabel || c.downloadStatus} />
                      <StatusBadge label={c.membershipLabel || c.membershipStatus} />
                      <StatusBadge label={c.paymentLabel || c.paymentStatus} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
