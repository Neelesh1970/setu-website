import { useCallback, useEffect, useState, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { ReportListSkeleton } from "../../components/AppSkeleton"
import { ReportsEmpty, ReportsError, ReportsShell } from "./ReportsShell"
import { Plus, Pencil, X, Trash2, Eye, MoreVertical, FileText, RefreshCw, Clock, Calendar } from "lucide-react"
import { reportsUrl } from "../../config/api"
import { authHeaders } from "../../api/http"

// CloudFront Asset Base URL
const ASSETS_BASE_URL = "https://d10pnqyli54qno.cloudfront.net/Reports/public/"
const HEADER_BLUE = "#1C39BB"
const MEDICATION_EMPTY_IMAGE = `${ASSETS_BASE_URL}medication_empty.png`

// ===================== API FUNCTIONS =====================

async function getMedications(userId, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/prescription-reports/user/${encodeURIComponent(userId)}`), {
    headers: authHeaders(token, refreshToken),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.message || "Failed to load medications")
  return data?.data || data || []
}

async function createMedication(data, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl("/prescription-reports"), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || "Failed to create medication")
  }
  return result?.data || result
}

async function updateMedication(id, data, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/prescription-reports/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || "Failed to update medication")
  }
  return result?.data || result
}

async function deleteMedication(id, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/prescription-reports/${id}`), {
    method: 'DELETE',
    headers: {
      ...authHeaders(token, refreshToken),
    },
  })
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result?.message || "Failed to delete medication")
  }
  return true
}

// ===================== COMPONENTS =====================

// Medication Type Icons
const MEDICATION_TYPE_ICONS = {
  Tablet: "tablet.png",
  Capsule: "capsule.png",
  Syrup: "syrup.png",
  Injection: "injection.png",
  Inhaler: "inhalator.png",
  Ointment: "cream.png",
  Cream: "cream.png",
  "Eye Drops": "drop.png",
  "Ear Drops": "drop.png",
  Other: "others1.png",
}

const getMedicationTypeIcon = (medicationType = "") => {
  const type = String(medicationType || "").trim()
  const fileName = MEDICATION_TYPE_ICONS[type] || "others1.png"
  return `${ASSETS_BASE_URL}${fileName}`
}

// Status Colors
const STATUS_COLORS = {
  Active: { bg: "#E8F8EF", text: "#15803D", dot: "#16D12F" },
  Completed: { bg: "#EEF2FF", text: "#3730A3", dot: "#6366F1" },
  Paused: { bg: "#FEF9C3", text: "#A16207", dot: "#F7A62B" },
  Discontinued: { bg: "#FEE2E2", text: "#B91C1C", dot: "#FF6666" },
}

const SUMMARY_STATUSES = [
  { key: "Active", label: "Active", color: "#16D12F" },
  { key: "Completed", label: "Completed", color: "#6366F1" },
  { key: "Paused", label: "Paused", color: "#F7A62B" },
  { key: "Discontinued", label: "Stopped", color: "#FF6666" },
]

const formatDate = (value) => {
  if (!value) return ""
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const formatDosageWithType = (dosage, medicationType) => {
  const dosageText = String(dosage || "").trim()
  const typeText = String(medicationType || "").trim()
  if (!dosageText) return typeText || "—"
  if (!typeText) return dosageText
  return `${dosageText} ${typeText}`
}

// Medication Summary Component
function MedicationSummary({ medications }) {
  const counts = medications.reduce((result, item) => {
    const status = String(item?.medicationStatus || "").trim()
    if (status === "Active") result.Active += 1
    else if (status === "Completed") result.Completed += 1
    else if (status === "Paused") result.Paused += 1
    else if (status === "Discontinued" || status === "Stopped") result.Discontinued += 1
    return result
  }, { Active: 0, Completed: 0, Paused: 0, Discontinued: 0 })

  return (
    <div className="bg-gradient-to-br from-[#2E80FC] to-[#0B2445] rounded-2xl p-4 mb-4">
      <p className="text-sm text-white/80">Select document type</p>
      <p className="text-3xl font-bold text-white mt-1 mb-4">{medications.length}</p>
      
      <div className="grid grid-cols-4 gap-2">
        {SUMMARY_STATUSES.map((status) => (
          <div key={status.key} className="bg-white/25 rounded-xl p-2 text-center">
            <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: status.color }} />
            <p className="text-lg font-bold text-white">{counts[status.key] || 0}</p>
            <p className="text-xs text-white/80">{status.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Medication Card Component
function MedicationCard({ item, onEdit, onDelete, onView }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [imageError, setImageError] = useState(false)
  const menuRef = useRef(null)

  const status = item?.medicationStatus || "Active"
  const statusColors = STATUS_COLORS[status] || STATUS_COLORS.Active
  const startedLabel = formatDate(item?.startDate)
  const typeIcon = getMedicationTypeIcon(item?.medicationType)
  const dosageLabel = formatDosageWithType(item?.dosage, item?.medicationType)

  const handleDeleteClick = () => {
    setMenuOpen(false)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    setShowDeleteModal(false)
    onDelete(item.id)
  }

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <>
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 shadow-sm hover:shadow-md transition-shadow relative">
        {/* Top Row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center flex-1 min-w-0 mr-2">
            <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center mr-3 flex-shrink-0">
              {!imageError ? (
                <img 
                  src={typeIcon} 
                  alt={item?.medicationType}
                  className="w-6 h-6 object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <FileText className="w-5 h-5 text-[#1C39BB]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#111827] truncate">
                {item?.medicationName || "—"}
              </p>
              <p className="text-xs text-[#6B7280] truncate">
                {item?.strength || "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span 
              className="rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
            >
              {status}
            </span>

            {/* Menu Button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-[#6B7280]" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-[#E5E7EB] shadow-lg min-w-[120px] z-50 py-1">
                  <button
                    onClick={() => { setMenuOpen(false); onView(item) }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-[#1C39BB] font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(item) }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-[#1C39BB] font-medium"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-sm text-red-600 font-medium border-t border-[#E5E7EB]"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="ml-[52px] space-y-1">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="text-xs text-[#4B5563]">{dosageLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="text-xs text-[#4B5563]">{item?.frequency || "—"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-xs text-[#4B5563]">{item?.timeInDay || "—"}</span>
          </div>
          <div className="border-t border-[#E5E7EB] pt-1 mt-1">
            <span className="text-xs text-[#9CA3AF]">
              {startedLabel ? `Started ${startedLabel}` : "Start date unavailable"}
            </span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[#0E1C2F] text-center mb-2">
              Delete Medication
            </h3>
            <p className="text-sm text-[#6C7A8C] text-center mb-6">
              Are you sure you want to delete "{item?.medicationName || "this medication"}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[#6C7A8C] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Medication Form Modal
function MedicationFormModal({ isOpen, onClose, onSubmit, initialData = null, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    medicationName: "",
    medicationType: "",
    strength: "",
    dosage: "",
    frequency: "",
    timeInDay: "",
    startDate: "",
    medicationStatus: "",
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const MEDICATION_TYPES = ["Tablet", "Capsule", "Syrup", "Injection", "Inhaler", "Ointment", "Cream", "Eye Drops", "Ear Drops", "Other"]
  const FREQUENCIES = ["Once Daily", "Twice Daily", "Three Times Daily", "Every 6 Hours", "Every 8 Hours", "Weekly", "As Needed"]
  const TIMES_IN_DAY = ["Morning", "Afternoon", "Evening", "Night", "Before Meals", "After Meals", "Bedtime"]
  const MEDICATION_STATUSES = ["Active", "Completed", "Paused", "Discontinued"]

  useEffect(() => {
    if (initialData) {
      setFormData({
        medicationName: initialData.medicationName || "",
        medicationType: initialData.medicationType || "",
        strength: initialData.strength || "",
        dosage: initialData.dosage || "",
        frequency: initialData.frequency || "",
        timeInDay: initialData.timeInDay || "",
        startDate: initialData.startDate || "",
        medicationStatus: initialData.medicationStatus || "",
      })
    } else {
      setFormData({
        medicationName: "",
        medicationType: "",
        strength: "",
        dosage: "",
        frequency: "",
        timeInDay: "",
        startDate: "",
        medicationStatus: "",
      })
    }
    setErrors({})
    setTouched({})
  }, [initialData, isOpen])

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    if (touched[key]) {
      validateField(key, value)
    }
  }

  const validateField = (key, value) => {
    const trimmed = String(value || "").trim()
    const error = trimmed ? "" : `${key.replace(/([A-Z])/g, ' $1').trim()} is required`
    setErrors(prev => ({ ...prev, [key]: error }))
    return error
  }

  const handleBlur = (key) => {
    setTouched(prev => ({ ...prev, [key]: true }))
    validateField(key, formData[key])
  }

  const validateForm = () => {
    const newErrors = {}
    const requiredFields = ['medicationName', 'medicationType', 'strength', 'dosage', 'frequency', 'timeInDay', 'startDate', 'medicationStatus']
    
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`
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

    const payload = {
      medicationName: formData.medicationName.trim(),
      medicationType: formData.medicationType,
      strength: formData.strength.trim(),
      dosage: formData.dosage.trim(),
      frequency: formData.frequency,
      timeInDay: formData.timeInDay,
      startDate: formData.startDate,
      medicationStatus: formData.medicationStatus,
    }

    onSubmit(payload)
  }

  if (!isOpen) return null

  const isEditing = !!initialData?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E6EEF5] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0E1C2F]">
            {isEditing ? 'Edit Medication' : 'Add Medication'}
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
          {/* Medication Name */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Medication Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.medicationName}
              onChange={(e) => handleChange('medicationName', e.target.value)}
              onBlur={() => handleBlur('medicationName')}
              placeholder="Enter medication name"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.medicationName && touched.medicationName ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.medicationName && touched.medicationName && (
              <p className="text-sm text-red-500 mt-1">{errors.medicationName}</p>
            )}
          </div>

          {/* Medication Type */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Medication Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.medicationType}
              onChange={(e) => handleChange('medicationType', e.target.value)}
              onBlur={() => handleBlur('medicationType')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.medicationType && touched.medicationType ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            >
              <option value="">Select medication type</option>
              {MEDICATION_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.medicationType && touched.medicationType && (
              <p className="text-sm text-red-500 mt-1">{errors.medicationType}</p>
            )}
          </div>

          {/* Strength */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Strength <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.strength}
              onChange={(e) => handleChange('strength', e.target.value)}
              onBlur={() => handleBlur('strength')}
              placeholder="e.g., 500 mg, 250 mcg, 5 mL"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.strength && touched.strength ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.strength && touched.strength && (
              <p className="text-sm text-red-500 mt-1">{errors.strength}</p>
            )}
          </div>

          {/* Dosage */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Dosage <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.dosage}
              onChange={(e) => handleChange('dosage', e.target.value)}
              onBlur={() => handleBlur('dosage')}
              placeholder="e.g., 1 tablet, 2 capsules, 5 mL"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.dosage && touched.dosage ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.dosage && touched.dosage && (
              <p className="text-sm text-red-500 mt-1">{errors.dosage}</p>
            )}
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => handleChange('frequency', e.target.value)}
              onBlur={() => handleBlur('frequency')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.frequency && touched.frequency ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            >
              <option value="">Select frequency</option>
              {FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>{freq}</option>
              ))}
            </select>
            {errors.frequency && touched.frequency && (
              <p className="text-sm text-red-500 mt-1">{errors.frequency}</p>
            )}
          </div>

          {/* Time in Day - Chips */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Time in Day <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TIMES_IN_DAY.map((option) => {
                const selected = formData.timeInDay === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleChange('timeInDay', option)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selected 
                        ? 'border-[#1C39BB] bg-[#EEF2FF] text-[#1C39BB] font-semibold' 
                        : 'border-[#D1D5DB] text-[#4B5563] hover:border-[#1C39BB]'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
            {errors.timeInDay && touched.timeInDay && (
              <p className="text-sm text-red-500 mt-1">{errors.timeInDay}</p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              onBlur={() => handleBlur('startDate')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.startDate && touched.startDate ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.startDate && touched.startDate && (
              <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>
            )}
          </div>

          {/* Medication Status */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Medication Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.medicationStatus}
              onChange={(e) => handleChange('medicationStatus', e.target.value)}
              onBlur={() => handleBlur('medicationStatus')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.medicationStatus && touched.medicationStatus ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            >
              <option value="">Select medication status</option>
              {MEDICATION_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            {errors.medicationStatus && touched.medicationStatus && (
              <p className="text-sm text-red-500 mt-1">{errors.medicationStatus}</p>
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
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main Component
export default function MedicationsPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [items, setItems] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [viewingItem, setViewingItem] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)

  const load = useCallback(async () => {
    if (!session?.user_id) return
    setLoading(true)
    setError("")
    try {
      const list = await getMedications(session.user_id, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      setItems(list || [])
    } catch (err) {
      setError(err?.message || "Failed to load medications")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  const handleAdd = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleView = (item) => {
    setViewingItem(item)
    setShowViewModal(true)
  }

  const handleDelete = async (id) => {
    try {
      await deleteMedication(id, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      await load()
    } catch (err) {
      setError(err?.message || "Failed to delete medication")
    }
  }

  const handleSubmit = async (payload) => {
    if (!session?.user_id) return
    
    setIsSubmitting(true)
    try {
      const submitPayload = {
        ...payload,
        userId: Number(session.user_id)
      }

      if (editingItem?.id) {
        await updateMedication(editingItem.id, submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      } else {
        await createMedication(submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      }
      
      await load()
      setIsModalOpen(false)
      setEditingItem(null)
    } catch (err) {
      setError(err?.message || "Failed to save medication")
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasData = items && items.length > 0

  return (
    <>
      <ReportsShell>
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0E1C2F]">Medications</h1>
            <p className="text-sm text-[#6C7A8C]">Prescriptions</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medication</span>
          </button>
        </div>

        {loading ? (
          <ReportListSkeleton count={3} />
        ) : error ? (
          <ReportsError message={error} onRetry={load} />
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <img 
              src={MEDICATION_EMPTY_IMAGE}
              alt="No medications"
              className="w-48 h-48 object-contain mb-6"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
            <h3 className="text-xl font-semibold text-[#0E1C2F] mb-2">
              No Medicines Added
            </h3>
            <p className="text-sm text-[#6C7A8C] max-w-sm mb-6">
              Your prescribed medicines will appear here.
            </p>
            <button
              onClick={handleAdd}
              className="px-6 py-2.5 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors font-medium"
            >
              Add Medication
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Card */}
            <MedicationSummary medications={items} />
            
            {/* All Medications Title */}
            <h2 className="text-base font-bold text-[#111827]">All medications</h2>
            
            {/* Medication Cards */}
            {items.map((item) => (
              <MedicationCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </ReportsShell>

      {/* Form Modal */}
      <MedicationFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(null)
        }}
        onSubmit={handleSubmit}
        initialData={editingItem}
        isSubmitting={isSubmitting}
      />

      {/* View Modal */}
      {showViewModal && viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#0E1C2F]">
                Medication Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#6C7A8C]" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Medication Name</p>
                <p className="text-base font-semibold text-[#0E1C2F]">
                  {viewingItem.medicationName || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Type</p>
                <p className="text-base text-[#0E1C2F]">
                  {viewingItem.medicationType || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Strength</p>
                <p className="text-base text-[#0E1C2F]">
                  {viewingItem.strength || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Dosage</p>
                <p className="text-base text-[#0E1C2F]">
                  {formatDosageWithType(viewingItem.dosage, viewingItem.medicationType) || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Frequency</p>
                <p className="text-base text-[#0E1C2F]">
                  {viewingItem.frequency || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Time in Day</p>
                <p className="text-base text-[#0E1C2F]">
                  {viewingItem.timeInDay || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Start Date</p>
                <p className="text-base text-[#0E1C2F]">
                  {formatDate(viewingItem.startDate) || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Status</p>
                <p className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium`}
                   style={STATUS_COLORS[viewingItem.medicationStatus] || STATUS_COLORS.Active}>
                  {viewingItem.medicationStatus || "—"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 px-4 py-2.5 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}