import { useCallback, useEffect, useState } from "react"
import { Loader2, Mail, MessageCircle, Phone } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { vleAuthFetch } from "../../api/roleAuth"

export default function VleSupportPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [support, setSupport] = useState(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const data = await vleAuthFetch("/dashboard/support", {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      setSupport(data)
    } catch (err) {
      setError(err.message || "Could not load support info.")
    } finally {
      setLoading(false)
    }
  }, [session?.token, session?.refreshToken])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page-safe-bottom mx-auto max-w-4xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[#1C39BB]">Support</p>
        <h1 className="font-serif text-2xl text-setu-charcoal">VLE help & FAQ</h1>
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

      {!loading && !error && support && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <a
              href={`tel:${support.helpline}`}
              className="flex items-center gap-3 rounded-2xl border border-[#D2DEFF] bg-white p-4 shadow-sm hover:border-[#1C39BB]/40"
            >
              <Phone className="text-[#1C39BB]" size={22} />
              <div>
                <p className="text-xs text-setu-muted">Helpline</p>
                <p className="font-medium">{support.helpline}</p>
              </div>
            </a>
            <a
              href={`mailto:${support.email}`}
              className="flex items-center gap-3 rounded-2xl border border-[#D2DEFF] bg-white p-4 shadow-sm hover:border-[#1C39BB]/40"
            >
              <Mail className="text-[#1C39BB]" size={22} />
              <div>
                <p className="text-xs text-setu-muted">Email</p>
                <p className="font-medium text-sm">{support.email}</p>
              </div>
            </a>
            <a
              href={`https://wa.me/${String(support.whatsapp).replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-[#D2DEFF] bg-white p-4 shadow-sm hover:border-[#1C39BB]/40"
            >
              <MessageCircle className="text-[#1C39BB]" size={22} />
              <div>
                <p className="text-xs text-setu-muted">WhatsApp</p>
                <p className="font-medium">{support.whatsapp}</p>
              </div>
            </a>
          </div>

          <p className="mb-4 text-sm text-setu-muted">Support hours: {support.hours}</p>

          <div className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Frequently asked questions</h2>
            <ul className="space-y-4">
              {(support.faq || []).map((item, i) => (
                <li key={i} className="border-b border-[#EEF3FF] pb-4 last:border-0 last:pb-0">
                  <p className="font-medium text-setu-charcoal">{item.q}</p>
                  <p className="mt-1 text-sm text-setu-muted">{item.a}</p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
