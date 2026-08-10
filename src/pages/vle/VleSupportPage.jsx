import { useCallback, useEffect, useState } from "react"
import { ChevronDown, Loader2, Mail, MessageCircle, Phone, Send, Ticket } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { vleAuthFetch } from "../../api/roleAuth"

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

function statusBadge(status) {
  const colors = {
    open: "bg-amber-50 text-amber-800",
    in_progress: "bg-blue-50 text-blue-800",
    resolved: "bg-green-50 text-green-800",
    escalated: "bg-red-50 text-red-800",
  }
  return colors[status] || "bg-gray-50 text-gray-700"
}

export default function VleSupportPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [support, setSupport] = useState(null)
  const [tickets, setTickets] = useState([])
  const [ticketsTotal, setTicketsTotal] = useState(0)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [submitting, setSubmitting] = useState(false)

  const [expandedId, setExpandedId] = useState(null)
  const [ticketDetails, setTicketDetails] = useState({})
  const [loadingDetailId, setLoadingDetailId] = useState(null)

  const loadTickets = useCallback(async () => {
    if (!session?.token) return
    const data = await vleAuthFetch("/dashboard/support/tickets?limit=20", {
      token: session.token,
      refreshToken: session.refreshToken,
    })
    setTickets(data.tickets || [])
    setTicketsTotal(data.total ?? 0)
  }, [session?.token, session?.refreshToken])

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const [supportData] = await Promise.all([
        vleAuthFetch("/dashboard/support", {
          token: session.token,
          refreshToken: session.refreshToken,
        }),
        loadTickets(),
      ])
      setSupport(supportData)
    } catch (err) {
      setError(err.message || "Could not load support info.")
    } finally {
      setLoading(false)
    }
  }, [session?.token, session?.refreshToken, loadTickets])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)
    try {
      await vleAuthFetch("/dashboard/support/tickets", {
        token: session.token,
        refreshToken: session.refreshToken,
        method: "POST",
        body: { subject, description, priority },
      })
      setSubject("")
      setDescription("")
      setPriority("medium")
      setSuccess("Ticket raised. Your District Coordinator will see it in their inbox.")
      await loadTickets()
    } catch (err) {
      setError(err.message || "Could not raise ticket.")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTicket = async (ticketId) => {
    if (expandedId === ticketId) {
      setExpandedId(null)
      return
    }
    setExpandedId(ticketId)
    if (ticketDetails[ticketId]) return

    setLoadingDetailId(ticketId)
    setError("")
    try {
      const detail = await vleAuthFetch(`/dashboard/support/tickets/${ticketId}`, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      setTicketDetails((prev) => ({ ...prev, [ticketId]: detail }))
    } catch (err) {
      setError(err.message || "Could not load ticket details.")
    } finally {
      setLoadingDetailId(null)
    }
  }

  return (
    <div className="page-safe-bottom mx-auto max-w-4xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[#1C39BB]">Support</p>
        <h1 className="font-serif text-2xl text-setu-charcoal">VLE help & tickets</h1>
        <p className="mt-1 text-sm text-setu-muted">
          Raise a ticket for your District Coordinator or use the helpline below.
        </p>
      </div>

      {loading && (
        <div className="mb-6 flex items-center gap-2 text-setu-muted">
          <Loader2 className="animate-spin" size={18} />
          Loading…
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{success}</p>
      )}

      {!loading && (
        <>
          <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2">
              <Ticket className="text-[#1C39BB]" size={20} />
              <h2 className="font-semibold text-setu-charcoal">Raise a support ticket</h2>
            </div>
            <p className="mb-4 text-sm text-setu-muted">
              Your District Coordinator will receive this in their support inbox.
            </p>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Wallet withdrawal not received"
                maxLength={255}
                required
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
              />
            </label>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-[#D2DEFF] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-medium">Description</span>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue in detail…"
                required
                minLength={10}
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#1C39BB] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Submit ticket
            </button>
          </form>

          <div className="mb-8">
            <h2 className="mb-3 font-semibold text-setu-charcoal">
              My tickets{ticketsTotal > 0 ? ` (${ticketsTotal})` : ""}
            </h2>
            {tickets.length === 0 ? (
              <p className="rounded-2xl border border-[#D2DEFF] bg-white p-6 text-center text-sm text-setu-muted">
                No tickets yet. Use the form above to contact your District Coordinator.
              </p>
            ) : (
              <ul className="space-y-3">
                {tickets.map((ticket) => {
                  const detail = ticketDetails[ticket.id]
                  const expanded = expandedId === ticket.id
                  return (
                    <li
                      key={ticket.id}
                      className="rounded-2xl border border-[#D2DEFF] bg-white p-4 shadow-sm"
                    >
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-2 text-left"
                        onClick={() => toggleTicket(ticket.id)}
                      >
                        <div>
                          <p className="font-medium text-setu-charcoal">{ticket.subject}</p>
                          <p className="mt-0.5 text-xs text-setu-muted">
                            {ticket.createdAt
                              ? new Date(ticket.createdAt).toLocaleString("en-IN")
                              : "—"}
                            {ticket.priority ? ` · ${ticket.priority} priority` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(ticket.status)}`}
                          >
                            {ticket.status?.replace("_", " ")}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-setu-muted transition-transform ${expanded ? "rotate-180" : ""}`}
                          />
                        </div>
                      </button>

                      {expanded && (
                        <div className="mt-4 border-t border-[#EEF3FF] pt-4">
                          <p className="mb-3 whitespace-pre-wrap text-sm text-setu-charcoal">
                            {ticket.description}
                          </p>
                          {loadingDetailId === ticket.id && (
                            <div className="flex items-center gap-2 text-sm text-setu-muted">
                              <Loader2 size={14} className="animate-spin" />
                              Loading replies…
                            </div>
                          )}
                          {detail?.replies?.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-setu-muted">
                                Coordinator replies
                              </p>
                              {detail.replies.map((reply) => (
                                <div
                                  key={reply.id}
                                  className="rounded-xl bg-[#EEF3FF] px-3 py-2 text-sm text-setu-charcoal"
                                >
                                  <p>{reply.message}</p>
                                  <p className="mt-1 text-xs text-setu-muted">
                                    {reply.createdAt
                                      ? new Date(reply.createdAt).toLocaleString("en-IN")
                                      : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          {detail && !detail.replies?.length && loadingDetailId !== ticket.id && (
                            <p className="text-sm text-setu-muted">
                              No replies yet. Your coordinator will respond here.
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {!loading && support && (
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
