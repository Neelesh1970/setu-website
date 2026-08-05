import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronRight, Calendar, Clock, User, Stethoscope } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { formatReportDate, getCasePapersForUser } from "../../api/reports"
import { ReportListSkeleton } from "../../components/AppSkeleton"
import { ReportsEmpty, ReportsError, ReportsShell } from "./ReportsShell"

export default function CasePapersPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    if (!session?.user_id) return
    setLoading(true)
    setError("")
    try {
      const list = await getCasePapersForUser(session.user_id, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      setItems(list || [])
    } catch (err) {
      setError(err?.message || "Failed to load case papers")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  const handleViewCasePaper = (visitId) => {
    navigate(`/app/reports/case-paper/${encodeURIComponent(visitId)}`)
  }

  const formatTimeSlot = (timeSlot) => {
    if (!timeSlot || timeSlot === "—") return "—"
    if (/[–-]/.test(timeSlot)) return timeSlot
    const match = timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/)
    if (!match) return timeSlot
    let hours = parseInt(match[1], 10)
    const minutes = match[2]
    const meridiem = match[3] ? match[3].toUpperCase() : hours >= 12 ? "PM" : "AM"
    hours = hours % 12 || 12
    return `${hours}:${minutes} ${meridiem}`
  }

  return (
    <ReportsShell title="Case Paper" subtitle="Clinical notes">
      {loading ? (
        <ReportListSkeleton count={3} />
      ) : error ? (
        <ReportsError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Stethoscope className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-[#0E1C2F] mb-2">
            No Case Papers Found
          </h3>
          <p className="text-sm text-[#6C7A8C] max-w-sm mb-6">
            Your case papers will appear here once available
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const visitId = item.visitNo || item.appointmentId
            const timeSlot = formatTimeSlot(item.visitedOn)
            return (
              <div
                key={String(item.id)}
                className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewCasePaper(visitId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-[#6B7280]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#111827] truncate">
                          Dr. {item.doctor || "Doctor"}
                        </p>
                        <p className="text-xs text-[#6B7280] truncate">
                          {item.issue || "General"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {item.appointmentId && (
                    <span className="text-xs font-bold text-[#1C39BB] flex-shrink-0 ml-2">
                      Case Paper #{item.appointmentId}
                    </span>
                  )}
                </div>

                <div className="border-t border-[#E5E7EB] my-2" />

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span className="text-xs font-semibold text-[#111827]">
                      {timeSlot || "—"}
                    </span>
                    <span className="text-[10px] text-[#6B7280] ml-0.5">Time slot</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span className="text-xs font-semibold text-[#111827]">
                      {item.visitDate ? formatReportDate(item.visitDate) : "—"}
                    </span>
                    <span className="text-[10px] text-[#6B7280] ml-0.5">Visit date</span>
                  </div>
                </div>

                <div className="mt-2.5 text-center">
                  <span className="text-sm font-bold text-[#1C39BB] hover:underline">
                    View case paper
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ReportsShell>
  )
}