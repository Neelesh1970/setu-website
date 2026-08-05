import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { formatReportDate, getCasePaperDetail } from "../../api/reports"
import { ReportListSkeleton } from "../../components/AppSkeleton"
import { ReportsEmpty, ReportsError, ReportsShell } from "./ReportsShell"
import { Calendar, Clock, User, Stethoscope, ChevronLeft } from "lucide-react"

function Section({ title, children }) {
  return (
    <div className="rounded-xl bg-[#F3F4F6] p-3 mb-2">
      <h2 className="text-sm font-bold text-[#111827] mb-2">{title}</h2>
      {children}
    </div>
  )
}

function DetailRow({ label, value }) {
  if (!value || value === "—") return null
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-[#6B7280]">{label}</span>
      <span className="text-xs font-bold text-[#111827] text-right">{value}</span>
    </div>
  )
}

function Lines({ items, render }) {
  if (!items?.length) {
    return <p className="text-xs text-[#6C7A8C]">Not recorded</p>
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#111827] mt-1.5 flex-shrink-0" />
          <span className="text-xs text-[#111827]">{render(item, i)}</span>
        </li>
      ))}
    </ul>
  )
}

function VitalMetricCard({ label, value, unit }) {
  if (!value || value === "—") return null
  return (
    <div className="flex-1 min-w-[45%] bg-white rounded-lg border border-[#E5E7EB] p-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-3 h-3 text-[#1C39BB]" />
        </div>
        <div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm font-bold text-[#111827]">{value}</span>
            {unit && <span className="text-xs text-[#111827]">{unit}</span>}
          </div>
          <p className="text-[10px] text-[#111827]">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function CasePaperDetailPage() {
  const { id: visitId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const preview = location.state?.preview
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!visitId || !session?.user_id) return
      setLoading(true)
      setError("")
      try {
        const data = await getCasePaperDetail(visitId, session.user_id, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
        if (!cancelled) setDetail(data)
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load case paper")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [visitId, session])

  const handleBack = () => {
    navigate("/app/reports/case-paper")
  }

  const visit = detail?.visitInfo || preview || {}
  const patient = detail?.patient

  // Build vital metrics
  const buildVitalMetrics = (vitals = []) => {
    const vital = vitals[0] || {}
    const metrics = []

    if (vital.vitalBodyTemp) {
      metrics.push({
        label: "Body Temperature",
        value: String(vital.vitalBodyTemp),
        unit: "°F",
      })
    }
    if (vital.vitalSysBp || vital.vitalDiaBp) {
      metrics.push({
        label: "Blood Pressure",
        value: `${vital.vitalSysBp || "--"}/${vital.vitalDiaBp || "--"}`,
        unit: "mmHg",
      })
    }
    if (vital.vitalPulse) {
      metrics.push({
        label: "Heart Rate",
        value: String(vital.vitalPulse),
        unit: "bpm",
      })
    }
    const respiratory = vital.vitalRespiration || vital.vitalRespiratoryRate
    if (respiratory) {
      metrics.push({
        label: "Respiratory Rate",
        value: String(respiratory),
        unit: "breaths/min",
      })
    }
    if (vital.vitalSpo2) {
      metrics.push({
        label: "Oxygen Saturation (SpO2)",
        value: String(vital.vitalSpo2),
        unit: "%",
      })
    }
    return metrics
  }

  const vitalMetrics = buildVitalMetrics(detail?.vitals)

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

  const patientName = patient?.patientName ||
    [patient?.firstName, patient?.lastName].filter(Boolean).join(" ") ||
    "N/A"

  return (
    <ReportsShell
      title="Case Paper"
      subtitle={visit.doctor || "Visit detail"}
    >
      <button
        onClick={handleBack}
        className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#1C39BB] mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Case Papers
      </button>

      {loading ? (
        <ReportListSkeleton count={4} />
      ) : error ? (
        <ReportsError message={error} />
      ) : !detail ? (
        <ReportsEmpty title="Case paper not found" />
      ) : (
        <div className="space-y-3">
          {/* Patient & Doctor Card */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
            <p className="text-base font-bold text-[#111827]">
              Dr. {visit.doctor || "Doctor"}
            </p>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {visit.issue || "General"}
              {visit.visitDate ? ` · ${formatReportDate(visit.visitDate)}` : ""}
            </p>
            {patient && (
              <div className="mt-2 pt-2 border-t border-[#E5E7EB]">
                <p className="text-sm text-[#111827]">
                  <span className="text-[#6B7280]">Patient:</span> {patientName}
                </p>
                <div className="flex flex-wrap gap-3 mt-1">
                  {patient.gender && (
                    <p className="text-xs text-[#6B7280]">
                      Gender: <span className="text-[#111827] font-medium">{patient.gender}</span>
                    </p>
                  )}
                  {patient.age && (
                    <p className="text-xs text-[#6B7280]">
                      Age: <span className="text-[#111827] font-medium">{patient.age}</span>
                    </p>
                  )}
                  {patient.mrNo && (
                    <p className="text-xs text-[#6B7280]">
                      MR No: <span className="text-[#111827] font-medium">{patient.mrNo}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Visit Details */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
            <h2 className="text-sm font-bold text-[#111827] mb-2">Visit Details</h2>
            <div className="space-y-1">
              <DetailRow label="Visit No:" value={visit.visitNo} />
              <DetailRow label="Visit Date:" value={visit.visitDate ? formatReportDate(visit.visitDate) : null} />
              <DetailRow label="Visited On:" value={formatTimeSlot(visit.visitedOn)} />
            </div>
          </div>

          {/* Sections */}
          <Section title="Chief Complaint">
            <Lines
              items={detail.chiefComplaint}
              render={(item) => item.ccName || item.complaint || item.name || "—"}
            />
          </Section>

          <Section title="Symptoms">
            <Lines
              items={detail.symptoms}
              render={(item) => item.symptomName || item.symptom || item.name || "—"}
            />
          </Section>

          {/* Vitals with Grid */}
          {vitalMetrics.length > 0 && (
            <Section title="Vitals">
              <div className="flex flex-wrap gap-2">
                {vitalMetrics.map((metric, idx) => (
                  <VitalMetricCard
                    key={idx}
                    label={metric.label}
                    value={metric.value}
                    unit={metric.unit}
                  />
                ))}
              </div>
            </Section>
          )}

          <Section title="Diagnosis">
            <Lines
              items={detail.diagnosis}
              render={(item) => item.icDescription || item.diagnosisName || item.diagnosis || item.name || "—"}
            />
          </Section>

          <Section title="Investigations">
            <Lines
              items={detail.investigations}
              render={(item) => item.serviceName || item.investigationName || item.testName || item.name || "—"}
            />
          </Section>

          <Section title="Prescription">
            <Lines
              items={detail.prescriptions}
              render={(item) => {
                const inv = item?.ipInvItemId || {}
                const name = inv.itemName || item.medicineName || "Medicine"
                const strength = inv.itemStrength ? ` (${inv.itemStrength})` : ""
                const instruction = item?.ipDiId?.diName || ""
                const form = item?.ipDfId?.dfName || ""
                const qty = item.ipQuantity ? `Qty: ${item.ipQuantity}` : ""
                return `${name}${strength}${instruction ? ` — ${instruction}` : ""}${form ? ` — ${form}` : ""}${qty ? ` — ${qty}` : ""}`
              }}
            />
          </Section>
        </div>
      )}
    </ReportsShell>
  )
}