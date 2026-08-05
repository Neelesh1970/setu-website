import { useCallback, useEffect, useState, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { ReportListSkeleton } from "../../components/AppSkeleton"
import { ReportsEmpty, ReportsError, ReportsShell } from "./ReportsShell"
import { Plus, Pencil, X, Activity } from "lucide-react"
import { reportsUrl } from "../../config/api"
import { authHeaders } from "../../api/http"

// CloudFront Asset Base URL
const ASSETS_BASE_URL = "https://d10pnqyli54qno.cloudfront.net/Reports/public/"
const HEADER_BLUE = "#1C39BB"
const LIFESTYLE_EMPTY_IMAGE = `${ASSETS_BASE_URL}biomedical_empty.png`

// Icon mapping from CloudFront
const ICONS = {
  smoking: `${ASSETS_BASE_URL}Smoking.png`,
  alcohol: `${ASSETS_BASE_URL}Alcohol.png`,
  diet: `${ASSETS_BASE_URL}Diet.png`,
  exercise: `${ASSETS_BASE_URL}Exercise.png`,
  occupation: `${ASSETS_BASE_URL}Occupation.png`,
  pet: `${ASSETS_BASE_URL}Pet.png`,
  stressLevel: `${ASSETS_BASE_URL}stress.png`,
  waterIntake: `${ASSETS_BASE_URL}water.png`,
  sleepDuration: `${ASSETS_BASE_URL}Sleep.png`,
}

// Badge colors for status
const BADGE_COLORS = {
  Green: { bg: "#E8F8EF", text: "#15803D", border: "#86EFAC" },
  Yellow: { bg: "#FEF9C3", text: "#A16207", border: "#FDE047" },
  Orange: { bg: "#FFF4E5", text: "#C2410C", border: "#FDBA74" },
  Red: { bg: "#FEE2E2", text: "#B91C1C", border: "#FCA5A5" },
}

const getBadgeStyle = (badgeColor = "") =>
  BADGE_COLORS[String(badgeColor).trim()] || {
    bg: "#F3F4F6",
    text: "#4B5563",
    border: "#D1D5DB",
  }

// Lifestyle field definitions
const LIFESTYLE_EXTRA_FIELD_META = [
  { field_key: "stressLevel", label_en: "Stress Level", label_hi: "तनाव का स्तर" },
  { field_key: "waterIntake", label_en: "Water Intake", label_hi: "पानी का सेवन" },
  { field_key: "sleepDuration", label_en: "Sleep Duration", label_hi: "नींद की अवधि" },
]

const mergeLifestyleFieldDefinitions = (apiFields = []) => {
  const existingKeys = new Set(apiFields.map((field) => field.field_key))
  const extras = LIFESTYLE_EXTRA_FIELD_META.filter(
    (field) => !existingKeys.has(field.field_key)
  )
  return [...apiFields, ...extras]
}

const VISIBLE_FIELDS = [
  "smoking",
  "alcohol",
  "diet",
  "exercise",
  "sleepDuration",
  "stressLevel",
  "waterIntake",
]

// ===================== API FUNCTIONS =====================

async function getLifestyleFields({ token, refreshToken } = {}) {
  const response = await fetch(reportsUrl("/lifestyle-fields"), {
    headers: authHeaders(token, refreshToken),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.message || "Failed to load lifestyle fields")
  return data?.data || data || []
}

async function getLifestyleHistory(userId, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/lifestyle-history-reports/user/${encodeURIComponent(userId)}`), {
    headers: authHeaders(token, refreshToken),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.message || "Failed to load lifestyle history")
  const result = data?.data || data || []
  return Array.isArray(result) ? result[0] || {} : {}
}

async function createLifestyleHistory(data, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl("/lifestyle-history-reports"), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || "Failed to create lifestyle history")
  }
  return result?.data || result
}

async function updateLifestyleHistory(id, data, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/lifestyle-history-reports/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || "Failed to update lifestyle history")
  }
  return result?.data || result
}

// ===================== COMPONENTS =====================

// Lifestyle Card Component
function LifestyleCard({ title, value, fieldKey, status, badgeColor }) {
  const [imageError, setImageError] = useState(false)
  const chipColors = getBadgeStyle(badgeColor)

  return (
    <div className="flex items-center bg-white rounded-xl border border-[#E2E8F0] px-3.5 py-3.5 mb-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Icon */}
      <div className="w-11 h-11 rounded-full bg-[#EEF3FF] flex items-center justify-center flex-shrink-0">
        {!imageError && ICONS[fieldKey] ? (
          <img
            src={ICONS[fieldKey]}
            alt={title}
            className="w-6 h-6 object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <Activity className="w-5 h-5 text-[#1C39BB]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 ml-3.5 mr-2.5 min-w-0">
        <p className="text-xs text-[#7A7A7A] font-semibold tracking-wide uppercase">
          {title}
        </p>
        <p className="text-lg font-bold text-[#111111] mt-0.5">
          {value || "—"}
        </p>
      </div>

      {/* Status Chip */}
      {status && (
        <div
          className="max-w-[42%] border rounded-full px-2.5 py-1 flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: chipColors.bg,
            borderColor: chipColors.border,
          }}
        >
          <span className="text-xs font-bold" style={{ color: chipColors.text }}>
            {status}
          </span>
        </div>
      )}
    </div>
  )
}

// Lifestyle Form Modal
function LifestyleFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
  fields = [],
}) {
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const LIFESTYLE_DROPDOWN_OPTIONS = {
    smoking: ["Never", "Occasionally", "Regularly", "Former Smoker"],
    alcohol: ["Never", "Occasionally", "Regularly"],
    diet: ["Vegetarian", "Non-Vegetarian", "Vegan", "Mixed", "Other"],
    exercise: ["Sedentary", "Light", "Moderate", "Heavy"],
    pet: ["None", "Dog", "Cat", "Bird", "Fish", "Other"],
    stressLevel: ["Low", "Moderate", "High"],
    waterIntake: ["Less than 1L", "1–2L", "2–3L", "More than 3L"],
    sleepDuration: ["Less than 5 hrs", "5–6 hrs", "7–8 hrs", "More than 8 hrs"],
  }

  const requiredFields = ["smoking", "alcohol", "diet", "exercise"]

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const data = {}
      const allFields = [...fields, ...LIFESTYLE_EXTRA_FIELD_META]
      allFields.forEach((field) => {
        const key = field.field_key || field.key
        data[key] = initialData[key] || ""
      })
      setFormData(data)
    } else {
      const data = {}
      const allFields = [...fields, ...LIFESTYLE_EXTRA_FIELD_META]
      allFields.forEach((field) => {
        const key = field.field_key || field.key
        data[key] = ""
      })
      setFormData(data)
    }
    setErrors({})
    setTouched({})
  }, [initialData, fields, isOpen])

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    if (touched[key]) {
      validateField(key, value)
    }
  }

  const validateField = (key, value) => {
    const trimmed = String(value || "").trim()
    let error = ""
    if (requiredFields.includes(key) && !trimmed) {
      error = "This field is required"
    }
    setErrors((prev) => ({ ...prev, [key]: error }))
    return error
  }

  const handleBlur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    validateField(key, formData[key])
  }

  const validateForm = () => {
    const newErrors = {}
    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].trim() === "") {
        newErrors[field] = "This field is required"
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    setTouched(allTouched)
    if (!validateForm()) return

    const payload = {}
    Object.keys(formData).forEach((key) => {
      payload[key] = formData[key].trim()
    })

    onSubmit(payload)
  }

  if (!isOpen) return null

  const isEditing = !!(initialData && Object.keys(initialData).length > 0 && initialData.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E6EEF5] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0E1C2F]">
            {isEditing ? "Edit Life Style History" : "Add Life Style History"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[#6C7A8C]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Smoking */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Smoking <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.smoking || ""}
              onChange={(e) => handleChange("smoking", e.target.value)}
              onBlur={() => handleBlur("smoking")}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.smoking && touched.smoking ? "border-red-500" : "border-[#D1D5DB]"
              }`}
            >
              <option value="">Select smoking status</option>
              {LIFESTYLE_DROPDOWN_OPTIONS.smoking.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.smoking && touched.smoking && (
              <p className="text-sm text-red-500 mt-1">{errors.smoking}</p>
            )}
          </div>

          {/* Alcohol */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Alcohol <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.alcohol || ""}
              onChange={(e) => handleChange("alcohol", e.target.value)}
              onBlur={() => handleBlur("alcohol")}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.alcohol && touched.alcohol ? "border-red-500" : "border-[#D1D5DB]"
              }`}
            >
              <option value="">Select alcohol consumption</option>
              {LIFESTYLE_DROPDOWN_OPTIONS.alcohol.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.alcohol && touched.alcohol && (
              <p className="text-sm text-red-500 mt-1">{errors.alcohol}</p>
            )}
          </div>

          {/* Diet */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Diet <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.diet || ""}
              onChange={(e) => handleChange("diet", e.target.value)}
              onBlur={() => handleBlur("diet")}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.diet && touched.diet ? "border-red-500" : "border-[#D1D5DB]"
              }`}
            >
              <option value="">Select diet type</option>
              {LIFESTYLE_DROPDOWN_OPTIONS.diet.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.diet && touched.diet && (
              <p className="text-sm text-red-500 mt-1">{errors.diet}</p>
            )}
          </div>

          {/* Exercise */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Exercise <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.exercise || ""}
              onChange={(e) => handleChange("exercise", e.target.value)}
              onBlur={() => handleBlur("exercise")}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.exercise && touched.exercise ? "border-red-500" : "border-[#D1D5DB]"
              }`}
            >
              <option value="">Select exercise level</option>
              {LIFESTYLE_DROPDOWN_OPTIONS.exercise.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.exercise && touched.exercise && (
              <p className="text-sm text-red-500 mt-1">{errors.exercise}</p>
            )}
          </div>

          {/* Pet */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">Pet</label>
            <select
              value={formData.pet || ""}
              onChange={(e) => handleChange("pet", e.target.value)}
              onBlur={() => handleBlur("pet")}
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB]"
            >
              <option value="">Select pet</option>
              {LIFESTYLE_DROPDOWN_OPTIONS.pet.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Occupation */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">Occupation</label>
            <input
              type="text"
              value={formData.occupation || ""}
              onChange={(e) => handleChange("occupation", e.target.value)}
              onBlur={() => handleBlur("occupation")}
              placeholder="Enter your occupation"
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB]"
            />
          </div>

          {/* Stress Level */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Stress Level <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.stressLevel || ""}
              onChange={(e) => handleChange("stressLevel", e.target.value)}
              onBlur={() => handleBlur("stressLevel")}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.stressLevel && touched.stressLevel ? "border-red-500" : "border-[#D1D5DB]"
              }`}
            >
              <option value="">Select stress level</option>
              {LIFESTYLE_DROPDOWN_OPTIONS.stressLevel.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.stressLevel && touched.stressLevel && (
              <p className="text-sm text-red-500 mt-1">{errors.stressLevel}</p>
            )}
          </div>

          {/* Water Intake */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Water Intake <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.waterIntake || ""}
              onChange={(e) => handleChange("waterIntake", e.target.value)}
              onBlur={() => handleBlur("waterIntake")}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.waterIntake && touched.waterIntake ? "border-red-500" : "border-[#D1D5DB]"
              }`}
            >
              <option value="">Select water intake</option>
              {LIFESTYLE_DROPDOWN_OPTIONS.waterIntake.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.waterIntake && touched.waterIntake && (
              <p className="text-sm text-red-500 mt-1">{errors.waterIntake}</p>
            )}
          </div>

          {/* Sleep Duration */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Sleep Duration <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.sleepDuration || ""}
              onChange={(e) => handleChange("sleepDuration", e.target.value)}
              onBlur={() => handleBlur("sleepDuration")}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.sleepDuration && touched.sleepDuration ? "border-red-500" : "border-[#D1D5DB]"
              }`}
            >
              <option value="">Select sleep duration</option>
              {LIFESTYLE_DROPDOWN_OPTIONS.sleepDuration.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.sleepDuration && touched.sleepDuration && (
              <p className="text-sm text-red-500 mt-1">{errors.sleepDuration}</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[#E6EEF5]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#E6EEF5] rounded-lg text-[#6C7A8C] hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main Component
export default function LifestylePage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [fields, setFields] = useState([])
  const [history, setHistory] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!session?.user_id) return
    setLoading(true)
    setError("")
    try {
      const [fieldDefs, hist] = await Promise.all([
        getLifestyleFields({
          token: session.token,
          refreshToken: session.refreshToken,
        }),
        getLifestyleHistory(session.user_id, {
          token: session.token,
          refreshToken: session.refreshToken,
        }),
      ])
      setFields(Array.isArray(fieldDefs) ? fieldDefs : [])
      setHistory(hist || {})
    } catch (err) {
      setError(err?.message || "Failed to load lifestyle history")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  const handleAdd = () => {
    setIsModalOpen(true)
  }

  const handleSubmit = async (payload) => {
    if (!session?.user_id) return

    setIsSubmitting(true)
    try {
      const submitPayload = {
        ...payload,
        userId: Number(session.user_id),
      }

      if (history?.id) {
        await updateLifestyleHistory(history.id, submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      } else {
        await createLifestyleHistory(submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      }

      await load()
      setIsModalOpen(false)
    } catch (err) {
      setError(err?.message || "Failed to save lifestyle history")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Build rows for display
  const mergedFields = mergeLifestyleFieldDefinitions(fields)
  const rows = []
  const hasData = history && Object.keys(history).length > 0

  if (hasData && mergedFields.length) {
    mergedFields.forEach((field) => {
      const key = field.field_key || field.key
      const label = field.label_en || field.label || key
      const value = history[key]
      const status = history[`${key}Status`]
      const badgeColor = history[`${key}BadgeColor`]

      if (VISIBLE_FIELDS.includes(key) && value != null && String(value).trim() !== "") {
        rows.push({
          key,
          label,
          value: String(value),
          status,
          badgeColor,
        })
      }
    })
  }

  const hasDataToShow = rows.length > 0

  return (
    <>
      <ReportsShell>
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0E1C2F]">Lifestyle</h1>
            <p className="text-sm text-[#6C7A8C]">Habits &amp; wellness</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm font-medium"
          >
            {hasDataToShow ? (
              <>
                <Pencil className="w-4 h-4" />
                <span>Update Lifestyle</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Lifestyle</span>
              </>
            )}
          </button>
        </div>

        {loading ? (
          <ReportListSkeleton count={3} />
        ) : error ? (
          <ReportsError message={error} onRetry={load} />
        ) : !hasDataToShow ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <img
              src={LIFESTYLE_EMPTY_IMAGE}
              alt="No lifestyle data"
              className="w-48 h-48 object-contain mb-6"
              onError={(e) => {
                e.target.style.display = "none"
              }}
            />
            <h3 className="text-xl font-semibold text-[#0E1C2F] mb-2">
              No Life Style History Added
            </h3>
            <p className="text-sm text-[#6C7A8C] max-w-sm mb-6">
              Your details will appear here once added.
            </p>
            <button
              onClick={handleAdd}
              className="px-6 py-2.5 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors font-medium"
            >
              Add Life Style
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {rows.map((row) => (
              <LifestyleCard
                key={row.key}
                title={row.label}
                value={row.value}
                fieldKey={row.key}
                status={row.status}
                badgeColor={row.badgeColor}
              />
            ))}
          </div>
        )}
      </ReportsShell>

      {/* Form Modal */}
      <LifestyleFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
        }}
        onSubmit={handleSubmit}
        initialData={history}
        isSubmitting={isSubmitting}
        fields={fields}
      />
    </>
  )
}