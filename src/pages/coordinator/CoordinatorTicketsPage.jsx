import { useCallback, useEffect, useState } from "react"
import { ArrowUp, Loader2, RefreshCw, Send } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { coordinatorFetch } from "../../api/coordinatorApi"

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "escalated", label: "Escalated" },
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

export default function CoordinatorTicketsPage() {
  const { session } = useAuth()
  const [status, setStatus] = useState("")
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedId, setExpandedId] = useState(null)
  const [replyText, setReplyText] = useState("")
  const [resolveOnReply, setResolveOnReply] = useState(false)
  const [actionId, setActionId] = useState(null)

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const qs = status ? `?status=${status}&limit=30` : "?limit=30"
      const data = await coordinatorFetch(`/coordinator/tickets${qs}`, {
        token: session.token,
      })
      setTickets(data.tickets || [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError(err.message || "Could not load tickets.")
    } finally {
      setLoading(false)
    }
  }, [session?.token, status])

  useEffect(() => {
    load()
  }, [load])

  const handleReply = async (ticketId) => {
    if (!replyText.trim()) {
      setError("Reply message is required.")
      return
    }
    setActionId(ticketId)
    setError("")
    try {
      await coordinatorFetch(`/coordinator/tickets/${ticketId}/reply`, {
        token: session.token,
        method: "POST",
        body: { message: replyText.trim(), resolve: resolveOnReply },
      })
      setReplyText("")
      setResolveOnReply(false)
      setExpandedId(null)
      await load()
    } catch (err) {
      setError(err.message || "Reply failed.")
    } finally {
      setActionId(null)
    }
  }

  const handleEscalate = async (ticketId) => {
    setActionId(ticketId)
    setError("")
    try {
      await coordinatorFetch(`/coordinator/tickets/${ticketId}/escalate`, {
        token: session.token,
        method: "PATCH",
      })
      await load()
    } catch (err) {
      setError(err.message || "Escalation failed.")
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="page-safe-bottom mx-auto max-w-4xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#1C39BB]">Support tickets</p>
          <h1 className="font-serif text-2xl text-setu-charcoal">VLE support inbox</h1>
          <p className="mt-1 text-sm text-setu-muted">{total} ticket{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-[#D2DEFF] bg-white px-3 py-2 text-sm outline-none focus:border-[#1C39BB]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
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

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-setu-muted">
          <Loader2 className="animate-spin" size={18} />
          Loading tickets…
        </div>
      ) : tickets.length === 0 ? (
        <p className="rounded-2xl border border-[#D2DEFF] bg-white p-8 text-center text-sm text-setu-muted">
          No support tickets in your districts.
        </p>
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="rounded-2xl border border-[#D2DEFF] bg-white p-4 shadow-sm"
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() =>
                  setExpandedId((id) => (id === ticket.id ? null : ticket.id))
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-setu-charcoal">{ticket.subject}</p>
                    <p className="text-sm text-setu-muted">
                      {ticket.reporterName || "VLE"} · {ticket.vleCode || "—"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(ticket.status)}`}
                  >
                    {ticket.status?.replace("_", " ")}
                  </span>
                </div>
                {ticket.priority && (
                  <p className="mt-1 text-xs text-setu-muted">Priority: {ticket.priority}</p>
                )}
              </button>

              {expandedId === ticket.id && (
                <div className="mt-4 border-t border-[#EEF3FF] pt-4">
                  <p className="mb-3 whitespace-pre-wrap text-sm text-setu-charcoal">
                    {ticket.description}
                  </p>
                  <p className="mb-3 text-xs text-setu-muted">
                    Created {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("en-IN") : "—"}
                  </p>

                  <textarea
                    rows={3}
                    className="mb-2 w-full rounded-xl border border-[#D2DEFF] px-3 py-2 text-sm outline-none focus:border-[#1C39BB]"
                    placeholder="Your reply…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <label className="mb-3 flex items-center gap-2 text-sm text-setu-muted">
                    <input
                      type="checkbox"
                      checked={resolveOnReply}
                      onChange={(e) => setResolveOnReply(e.target.checked)}
                    />
                    Mark as resolved when replying
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={actionId === ticket.id}
                      onClick={() => handleReply(ticket.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1C39BB] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {actionId === ticket.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      Send reply
                    </button>
                    {ticket.status !== "escalated" && (
                      <button
                        type="button"
                        disabled={actionId === ticket.id}
                        onClick={() => handleEscalate(ticket.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
                      >
                        <ArrowUp size={14} />
                        Escalate to Super Admin
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
