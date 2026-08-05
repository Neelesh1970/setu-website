import { Link, useNavigate } from "react-router-dom"
import { CalendarDays, ClipboardList, Stethoscope, CheckCircle } from "lucide-react"
import { MENTAL_ACCENT, resolveBandDisplayColor } from "../../api/mental"
import { useMentalHealth } from "../../context/MentalHealthContext"
import { MentalShell } from "./MentalShell"

// ===================== SCORE VISUALIZATION COMPONENT =====================

function AssessmentScoreVisualization({
  score,
  maxScore = 100,
  scoreBands,
  bandLabel,
  bandColor,
  assessmentName,
  recommendation,
  keyInsight,
  nextSteps,
  labels,
  gaugeSize = 180,
}) {
  const percentage = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0
  const radius = gaugeSize / 2 - 12
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const gaugeStyle = {
    width: gaugeSize,
    height: gaugeSize,
  }

  // Use provided scoreBands or create default ones
  const bands = scoreBands && scoreBands.length > 0 ? scoreBands : [
    { label: "Low", minScore: 0, maxScore: 33, color: "#22C55E" },
    { label: "Moderate", minScore: 34, maxScore: 66, color: "#F59E0B" },
    { label: "High", minScore: 67, maxScore: 100, color: "#EF4444" },
  ]

  const defaultLabels = {
    totalScore: "Total Score",
    assessmentName: assessmentName || "Assessment",
    recommendation: "Recommendations",
    keyInsight: "Key Insights",
    nextSteps: "Next Steps",
    scaleTitle: "Score interpretation",
    yourPosition: "Your score position on the wellness scale",
    scoreProgress: `${Math.round(percentage)}% progress`,
    healthSummary: "Wellness Assessment Summary",
    scoreOf: `of ${maxScore}`,
  }

  const finalLabels = { ...defaultLabels, ...labels }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
      {/* Gauge */}
      <div className="flex flex-col items-center">
        <div className="relative" style={gaugeStyle}>
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx={gaugeSize / 2}
              cy={gaugeSize / 2}
              r={radius}
              fill="none"
              stroke="#F3F4F6"
              strokeWidth="10"
            />
            <circle
              cx={gaugeSize / 2}
              cy={gaugeSize / 2}
              r={radius}
              fill="none"
              stroke={bandColor || "#6366F1"}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: bandColor || "#6366F1" }}>
              {score}
            </span>
            <span className="text-xs text-[#6B7280]">of {maxScore}</span>
          </div>
        </div>

        {/* Band Label */}
        {bandLabel && (
          <div
            className="mt-4 px-6 py-2 rounded-full text-white font-bold text-sm"
            style={{ backgroundColor: bandColor || "#6366F1" }}
          >
            {bandLabel}
          </div>
        )}
      </div>

      {/* Score Track */}
      <div className="mt-6">
        <div className="flex justify-between text-xs text-[#6B7280] mb-1">
          <span>0</span>
          <span>{finalLabels.scaleTitle}</span>
          <span>{maxScore}</span>
        </div>
        <div className="relative h-3 rounded-full bg-[#F3F4F6] overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${percentage}%`, backgroundColor: bandColor || "#6366F1" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-all duration-1000 ease-out"
            style={{ 
              left: `calc(${percentage}% - 8px)`,
              backgroundColor: bandColor || "#6366F1"
            }}
          />
        </div>
        <p className="mt-1 text-xs text-[#6B7280] text-center">
          {finalLabels.yourPosition}
        </p>
      </div>

      {/* Score Scale - Color legend */}
      {bands.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
          <p className="text-xs font-semibold text-[#0F172A] mb-2">Score Scale</p>
          <div className="flex gap-2">
            {bands.map((b) => (
              <div key={`${b.label}-${b.minScore}`} className="flex-1 text-center">
                <div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: resolveBandDisplayColor(b.color) }}
                />
                <span className="text-[10px] text-[#6B7280]">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Insight */}
      {keyInsight && (
        <div className="mt-5 p-4 bg-[#F0FDF4] rounded-xl border border-[#D1FAE5]">
          <p className="text-sm font-semibold text-[#0F172A]">
            {finalLabels.keyInsight}
          </p>
          <p className="mt-1 text-sm text-[#4B5563]">{keyInsight}</p>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="mt-4 p-4 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE]">
          <p className="text-sm font-semibold text-[#0F172A]">
            {finalLabels.recommendation}
          </p>
          <p className="mt-1 text-sm text-[#4B5563]">{recommendation}</p>
        </div>
      )}

      {/* Next Steps */}
      {nextSteps && nextSteps.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-[#0F172A] mb-2">
            {finalLabels.nextSteps}
          </p>
          <ul className="space-y-2">
            {nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-[#4B5563]">
                <span className="text-[#0F766E] font-bold">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ===================== DEVICE PROMO SECTION =====================

function DevicePromoSection({
  deviceTitle = "At-Home Wellness Device",
  deviceSubtitle = "Comprehensive wellness screening",
  deviceDescription = "Get detailed wellness insights from the comfort of your home.",
  features = [
    "Results in minutes",
    "Comfortable and non-invasive",
    "Conducted by a trained wellness technician",
    "Personalized wellness insights",
  ],
  benefits = ["🏠 At-Home", "💆 Non-Invasive", "⚡ Instant Results"],
  actionCheckNow = "Check Now",
  actionBookSpecialist = "Book a Specialist",
  onDeviceBooking,
  onBookSpecialist,
}) {
  return (
    <>
      <div className="mt-6 bg-[#F5F5F5] rounded-2xl border border-[#0F7C7A] p-4 shadow-sm">
        <div className="w-full flex items-center justify-center mb-4">
          <div className="text-6xl">🧠</div>
        </div>

        <h3 className="text-2xl font-extrabold text-[#0F7C7A] leading-8">
          {deviceTitle}
        </h3>

        <p className="mt-2 text-lg font-semibold text-[#111827]">
          {deviceSubtitle}
        </p>

        <p className="mt-2 text-sm text-[#4B5563] leading-6">
          {deviceDescription}
        </p>

        <div className="mt-4 space-y-2.5">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start">
              <CheckCircle className="w-4 h-4 text-[#0F7C7A] mt-0.5 mr-2.5 flex-shrink-0" />
              <span className="text-sm font-medium text-[#374151]">{feature}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-5 mb-5">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex flex-col items-center bg-white rounded-xl border border-[#E5E7EB] py-3 px-1.5"
            >
              <div className="text-2xl mb-1">{benefit.split(' ')[0]}</div>
              <span className="text-xs font-bold text-[#111827] text-center leading-4">
                {benefit.split(' ').slice(1).join(' ')}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onDeviceBooking}
          className="w-full h-11 bg-[#0F7C7A] text-white rounded-full font-bold text-base hover:bg-[#0D6B69] transition-colors"
        >
          {actionCheckNow}
        </button>
      </div>

      <button
        onClick={onBookSpecialist}
        className="w-full h-11 bg-[#0F7C7A] text-white rounded-full font-bold text-base mt-3 hover:bg-[#0D6B69] transition-colors"
      >
        {actionBookSpecialist}
      </button>
    </>
  )
}

// ===================== MAIN COMPONENT =====================

export default function MentalResults() {
  const navigate = useNavigate()
  const { lastResult } = useMentalHealth()

  if (!lastResult) {
    return (
      <MentalShell title="Results" backTo="/app/mental-health/assessments">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">📊</span>
          </div>
          <h3 className="text-xl font-semibold text-[#0E1C2F] mb-2">
            No Recent Result
          </h3>
          <p className="text-sm text-[#6B7280] max-w-sm mb-6">
            Take an assessment first to see your results here.
          </p>
          <Link
            to="/app/mental-health/assessments"
            className="px-6 py-2.5 text-white rounded-lg font-medium"
            style={{ backgroundColor: MENTAL_ACCENT }}
          >
            Browse assessments
          </Link>
        </div>
      </MentalShell>
    )
  }

  const bandColor = resolveBandDisplayColor(
    lastResult.bandColor || lastResult.band?.color || "#6366F1"
  )
  const bandLabel = lastResult.bandLabel || lastResult.band?.label || "Result"
  const recommendation = lastResult.bandRecommendation || lastResult.band?.recommendation || ""
  const score = lastResult.totalScore || lastResult.score || 0
  const maxScore = lastResult.maxScore || 100
  const bands = lastResult.scoreBands || lastResult.assessment?.scoreBands || []
  const keyInsight = lastResult.keyInsight || ""
  const nextSteps = lastResult.nextSteps || []
  const assessmentTitle = lastResult.assessmentTitle || lastResult.assessment?.title || "Assessment"

  const hasApiRecommendations = Boolean(recommendation) || nextSteps.length > 0

  // Device features
  const deviceFeatures = [
    "Results in minutes",
    "Comfortable and non-invasive",
    "Conducted by a trained wellness technician",
    "Personalized wellness insights",
  ]

  const deviceBenefits = ["🏠 At-Home", "💆 Non-Invasive", "⚡ Instant Results"]

  // Handle navigation
  const handleDeviceBooking = () => {
    navigate("/app/mental-health/device")
  }

  const handleBookSpecialist = () => {
    navigate("/app/telemedicine")
  }

  return (
    <MentalShell title="Your Results" backTo="/app/mental-health/assessments">
      {/* Assessment Title */}
      <p className="text-sm text-[#6B7280] mb-4">
        {assessmentTitle}
      </p>

      {/* Score Visualization */}
      <AssessmentScoreVisualization
        score={score}
        maxScore={maxScore}
        scoreBands={bands}
        bandLabel={bandLabel}
        bandColor={bandColor}
        assessmentName={assessmentTitle}
        recommendation={hasApiRecommendations ? recommendation : null}
        keyInsight={keyInsight}
        nextSteps={nextSteps}
      />

      {/* Fallback Recommendations (if no API recommendations) */}
      {!hasApiRecommendations && (
        <>
          <h3 className="text-lg font-bold text-[#111827] mt-6 mb-3">
            Recommendations
          </h3>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3.5 shadow-sm">
            <div className="flex items-center mb-3">
              <div
                className="w-11 h-11 rounded-full bg-white border flex items-center justify-center flex-shrink-0"
                style={{ borderColor: hexToRgba(bandColor, 0.3) }}
              >
                <BookOpen className="w-5 h-5" style={{ color: bandColor }} />
              </div>
              <div className="ml-3.5">
                <p className="font-semibold text-[#111827]">Stress Management Course</p>
                <p className="text-sm text-[#111827]">Learn techniques to manage daily stress.</p>
              </div>
            </div>

            <div className="flex items-center">
              <div
                className="w-11 h-11 rounded-full bg-white border flex items-center justify-center flex-shrink-0"
                style={{ borderColor: hexToRgba(bandColor, 0.3) }}
              >
                <Moon className="w-5 h-5" style={{ color: bandColor }} />
              </div>
              <div className="ml-3.5">
                <p className="font-semibold text-[#111827]">Sleep Improvement Program</p>
                <p className="text-sm text-[#111827]">Build better sleep habits over time.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Score Scale */}
      {bands.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#0F172A]">Score scale</p>
          <ul className="mt-3 space-y-2">
            {bands.map((b) => (
              <li key={`${b.label}-${b.minScore}`} className="flex items-center gap-3 text-sm">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: resolveBandDisplayColor(b.color) }}
                />
                <span className="font-medium text-[#0F172A]">{b.label}</span>
                <span className="text-[#6B7280]">
                  {b.minScore}–{b.maxScore}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Device Promotion */}
      <DevicePromoSection
        deviceTitle="At-Home Wellness Device"
        deviceSubtitle="Comprehensive wellness screening"
        deviceDescription="Get detailed wellness insights from the comfort of your home."
        features={deviceFeatures}
        benefits={deviceBenefits}
        actionCheckNow="Check Now"
        actionBookSpecialist="Book a Specialist"
        onDeviceBooking={handleDeviceBooking}
        onBookSpecialist={handleBookSpecialist}
      />

      {/* Quick Actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={handleDeviceBooking}
          className="flex items-center gap-3 rounded-2xl border border-[#D1FAE5] bg-white p-4 text-left hover:shadow-md transition-shadow"
        >
          <CalendarDays className="text-[#0F766E]" size={20} />
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Book stress device</p>
            <p className="text-xs text-[#6B7280]">At-home screening</p>
          </div>
        </button>

        <Link
          to="/app/telemedicine"
          className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 hover:shadow-md transition-shadow"
        >
          <Stethoscope className="text-[#0F766E]" size={20} />
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Talk to a doctor</p>
            <p className="text-xs text-[#6B7280]">Telemedicine</p>
          </div>
        </Link>

        <Link
          to="/app/mental-health/history"
          className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 hover:shadow-md transition-shadow"
        >
          <ClipboardList className="text-[#0F766E]" size={20} />
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">View history</p>
            <p className="text-xs text-[#6B7280]">Past submissions</p>
          </div>
        </Link>
      </div>
    </MentalShell>
  )
}

// ===================== HELPERS =====================

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(99, 102, 241, ${alpha})`
  const raw = String(hex).replace("#", "")
  if (raw.length !== 6) return `rgba(99, 102, 241, ${alpha})`
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function BookOpen({ className, style }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function Moon({ className, style }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}