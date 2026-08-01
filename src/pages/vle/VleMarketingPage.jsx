import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { vleAuthFetch } from "../../api/roleAuth"

export default function VleMarketingPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [kit, setKit] = useState(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const data = await vleAuthFetch("/dashboard/marketing-kit", {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      setKit(data)
    } catch (err) {
      setError(err.message || "Could not load marketing kit.")
    } finally {
      setLoading(false)
    }
  }, [session?.token, session?.refreshToken])

  useEffect(() => {
    load()
  }, [load])

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="page-safe-bottom mx-auto max-w-4xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[#1C39BB]">Marketing Kit</p>
        <h1 className="font-serif text-2xl text-setu-charcoal">Promote SETU in your area</h1>
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

      {!loading && !error && kit && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Posters & flyers</h2>
            <ul className="space-y-3">
              {(kit.posters || []).map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 rounded-xl bg-[#F7FAFF] p-3">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-sm text-setu-muted">{p.description}</p>
                    <p className="text-xs text-setu-muted">{p.format}</p>
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[#1C39BB]"
                  >
                    Download <ExternalLink size={14} />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">WhatsApp templates</h2>
            <ul className="space-y-3">
              {(kit.whatsappTemplates || []).map((t) => (
                <li key={t.id} className="rounded-xl bg-[#F7FAFF] p-3">
                  <p className="mb-1 font-medium">{t.title}</p>
                  <p className="mb-2 text-sm text-setu-muted whitespace-pre-wrap">{t.text}</p>
                  <button
                    type="button"
                    onClick={() => copyText(t.text)}
                    className="text-sm font-medium text-[#1C39BB] hover:underline"
                  >
                    Copy message
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Videos</h2>
            <ul className="space-y-3">
              {(kit.videos || []).map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-xl bg-[#F7FAFF] p-3">
                  <div>
                    <p className="font-medium">{v.title}</p>
                    <p className="text-sm text-setu-muted">{v.duration}</p>
                  </div>
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[#1C39BB]"
                  >
                    Watch →
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
