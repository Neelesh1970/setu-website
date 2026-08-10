import { useCallback, useEffect, useState } from "react"
import { Download, Loader2, RefreshCw } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { coordinatorFetch } from "../../api/coordinatorApi"

export default function CoordinatorCampaignsPage() {
  const { session } = useAuth()
  const [campaigns, setCampaigns] = useState({ active: [], archived: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const data = await coordinatorFetch("/coordinator/campaigns", {
        token: session.token,
      })
      setCampaigns({
        active: data.active || [],
        archived: data.archived || [],
      })
    } catch (err) {
      setError(err.message || "Could not load campaigns.")
    } finally {
      setLoading(false)
    }
  }, [session?.token])

  useEffect(() => {
    load()
  }, [load])

  const renderCampaign = (campaign) => (
    <div
      key={campaign.id}
      className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm"
    >
      <h2 className="font-semibold text-setu-charcoal">{campaign.title}</h2>
      <p className="mt-2 text-sm text-setu-muted">{campaign.description}</p>
      <p className="mt-2 text-xs text-setu-muted">
        {campaign.startDate} — {campaign.endDate}
      </p>
      {Array.isArray(campaign.assets) && campaign.assets.length > 0 && (
        <ul className="mt-4 space-y-2">
          {campaign.assets.map((asset) => (
            <li key={asset.title}>
              {asset.url ? (
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#1C39BB] hover:underline"
                >
                  <Download size={14} />
                  {asset.title} ({asset.format || asset.type})
                </a>
              ) : (
                <span className="text-sm text-setu-muted">
                  {asset.title} ({asset.format || asset.type})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div className="page-safe-bottom mx-auto max-w-4xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#1C39BB]">Marketing campaigns</p>
          <h1 className="font-serif text-2xl text-setu-charcoal">District growth assets</h1>
        </div>
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

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-setu-muted">
          <Loader2 className="animate-spin" size={18} />
          Loading campaigns…
        </div>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-setu-muted">
              Active campaigns
            </h2>
            {campaigns.active.length === 0 ? (
              <p className="rounded-2xl border border-[#D2DEFF] bg-white p-6 text-sm text-setu-muted">
                No active campaigns right now.
              </p>
            ) : (
              <div className="space-y-4">{campaigns.active.map(renderCampaign)}</div>
            )}
          </section>

          {campaigns.archived.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-setu-muted">
                Archived
              </h2>
              <div className="space-y-4 opacity-80">
                {campaigns.archived.map(renderCampaign)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
