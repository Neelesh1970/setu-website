import { useCallback, useEffect, useState, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { ReportListSkeleton } from "../../components/AppSkeleton"
import { ReportsEmpty, ReportsError, ReportsShell } from "./ReportsShell"
import { Plus, Pencil, X, Trash2, Eye, MoreVertical, Calendar, MapPin, Activity } from "lucide-react"
import { reportsUrl } from "../../config/api"
import { authHeaders } from "../../api/http"

// CloudFront Asset Base URL
const ASSETS_BASE_URL = "https://d10pnqyli54qno.cloudfront.net/Reports/public/"
const HEADER_BLUE = "#1C39BB"
const BIOMEDICAL_IMPLANTS_EMPTY_IMAGE = `${ASSETS_BASE_URL}biomedical_implants_empty.png`

// ===================== API FUNCTIONS =====================

async function getBiomedicalImplants(userId, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/biomedical-implants/user/${encodeURIComponent(userId)}`), {
    headers: authHeaders(token, refreshToken),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.message || "Failed to load biomedical implants")
  
  let result = data?.data || data || []
  if (result && typeof result === 'object' && !Array.isArray(result) && result.data) {
    result = result.data
  }
  return Array.isArray(result) ? result : []
}

async function createBiomedicalImplant(data, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl("/biomedical-implants"), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || "Failed to create implant")
  }
  return result?.data || result
}

async function updateBiomedicalImplant(id, data, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/biomedical-implants/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || "Failed to update implant")
  }
  return result?.data || result
}

async function deleteBiomedicalImplant(id, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/biomedical-implants/${id}`), {
    method: 'DELETE',
    headers: {
      ...authHeaders(token, refreshToken),
    },
  })
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result?.message || "Failed to delete implant")
  }
  return true
}

// ===================== HELPERS =====================

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

const IMPLANT_TYPE_OPTIONS = [
  "Pacemaker",
  "Coronary Stent",
  "Hip Replacement",
  "Knee Replacement",
  "Dental Implant",
  "Cochlear Implant",
  "Artificial Heart Valve",
  "Neurostimulator",
  "Bone Plate / Screw",
]

const IMPLANT_STATUS_OPTIONS = [
  "Active",
  "Replaced",
  "Removed",
  "Under Observation",
]

const getStatusColor = (status) => {
  const s = String(status || "").toLowerCase()
  if (s === "active") {
    return { bg: "#E8F8EF", text: "#15803D" }
  }
  if (s === "replaced") {
    return { bg: "#EEF2FF", text: "#3730A3" }
  }
  if (s === "removed") {
    return { bg: "#FEE2E2", text: "#B91C1C" }
  }
  if (s === "under observation") {
    return { bg: "#FEF9C3", text: "#A16207" }
  }
  return { bg: "#F3F4F6", text: "#6B7280" }
}

// ===================== COMPONENTS =====================

// Implant Card Component
function ImplantCard({ item, onEdit, onDelete, onView }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const menuRef = useRef(null)

  const statusColors = getStatusColor(item?.implantStatus)
  const formattedDate = formatDate(item?.dateOfImplant)

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
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm hover:shadow-md transition-shadow relative">
        {/* Header Row with Status Chip on Right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[#111827] truncate">
              {item?.implantName || "Implant"}
            </p>
            {item?.implantType && (
              <p className="text-sm text-[#6B7280] mt-0.5">
                {item.implantType}
              </p>
            )}
          </div>

          {/* Status Chip and Menu Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {item?.implantStatus && (
              <span 
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
              >
                {item.implantStatus}
              </span>
            )}

            {/* Menu Button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-[#6B7280]" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-[#E5E7EB] shadow-lg min-w-[140px] z-50 py-1">
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
        <div className="mt-3 space-y-1.5">
          {item?.bodyLocation && (
            <div className="flex items-center gap-2 text-sm text-[#4B5563]">
              <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>{item.bodyLocation}</span>
            </div>
          )}
          {formattedDate && (
            <div className="flex items-center gap-2 text-sm text-[#4B5563]">
              <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Implanted: {formattedDate}</span>
            </div>
          )}
          {item?.reasonForImplant && (
            <div className="flex items-start gap-2 text-sm text-[#4B5563]">
              <Activity className="w-3.5 h-3.5 text-[#6B7280] mt-0.5" />
              <span className="flex-1">{item.reasonForImplant}</span>
            </div>
          )}
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
              Delete Implant Record
            </h3>
            <p className="text-sm text-[#6C7A8C] text-center mb-6">
              Are you sure you want to delete "{item?.implantName || "this implant"}"?
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

// Implant Form Modal
function ImplantFormModal({ isOpen, onClose, onSubmit, initialData = null, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    implantName: "",
    dateOfImplant: "",
    reasonForImplant: "",
    implantType: "",
    bodyLocation: "",
    implantStatus: "",
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        implantName: initialData.implantName || "",
        dateOfImplant: initialData.dateOfImplant || "",
        reasonForImplant: initialData.reasonForImplant || "",
        implantType: initialData.implantType || "",
        bodyLocation: initialData.bodyLocation || "",
        implantStatus: initialData.implantStatus || "",
      })
    } else {
      setFormData({
        implantName: "",
        dateOfImplant: "",
        reasonForImplant: "",
        implantType: "",
        bodyLocation: "",
        implantStatus: "",
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
    let error = ""
    if (!trimmed) {
      error = `${key.replace(/([A-Z])/g, ' $1').trim()} is required`
    }
    if (key === "dateOfImplant" && trimmed) {
      const date = new Date(trimmed)
      if (isNaN(date.getTime())) {
        error = "Please enter a valid date"
      }
    }
    setErrors(prev => ({ ...prev, [key]: error }))
    return error
  }

  const handleBlur = (key) => {
    setTouched(prev => ({ ...prev, [key]: true }))
    validateField(key, formData[key])
  }

  const validateForm = () => {
    const newErrors = {}
    const requiredFields = ['implantName', 'dateOfImplant', 'reasonForImplant', 'implantType', 'bodyLocation', 'implantStatus']
    
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`
      }
    })

    if (formData.dateOfImplant) {
      const date = new Date(formData.dateOfImplant)
      if (isNaN(date.getTime())) {
        newErrors.dateOfImplant = "Please enter a valid date"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    setTouched(allTouched)
    if (!validateForm()) return

    const payload = {
      implantName: formData.implantName.trim(),
      dateOfImplant: formData.dateOfImplant,
      reasonForImplant: formData.reasonForImplant.trim(),
      implantType: formData.implantType,
      bodyLocation: formData.bodyLocation.trim(),
      implantStatus: formData.implantStatus,
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
            {isEditing ? 'Edit Implant Record' : 'Add Implant Record'}
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
          {/* Implant Name */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Implant Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.implantName}
              onChange={(e) => handleChange('implantName', e.target.value)}
              onBlur={() => handleBlur('implantName')}
              placeholder="e.g., Cardiac Pacemaker"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.implantName && touched.implantName ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.implantName && touched.implantName && (
              <p className="text-sm text-red-500 mt-1">{errors.implantName}</p>
            )}
          </div>

          {/* Implant Type */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Implant Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.implantType}
              onChange={(e) => handleChange('implantType', e.target.value)}
              onBlur={() => handleBlur('implantType')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.implantType && touched.implantType ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            >
              <option value="">Select implant type</option>
              {IMPLANT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.implantType && touched.implantType && (
              <p className="text-sm text-red-500 mt-1">{errors.implantType}</p>
            )}
          </div>

          {/* Body Location */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Body Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.bodyLocation}
              onChange={(e) => handleChange('bodyLocation', e.target.value)}
              onBlur={() => handleBlur('bodyLocation')}
              placeholder="e.g., Left Chest, Right Knee"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.bodyLocation && touched.bodyLocation ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.bodyLocation && touched.bodyLocation && (
              <p className="text-sm text-red-500 mt-1">{errors.bodyLocation}</p>
            )}
          </div>

          {/* Reason / Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Reason / Diagnosis <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reasonForImplant}
              onChange={(e) => handleChange('reasonForImplant', e.target.value)}
              onBlur={() => handleBlur('reasonForImplant')}
              placeholder="e.g., Heart Block, Hip Arthritis"
              rows={2}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] resize-none ${
                errors.reasonForImplant && touched.reasonForImplant ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.reasonForImplant && touched.reasonForImplant && (
              <p className="text-sm text-red-500 mt-1">{errors.reasonForImplant}</p>
            )}
          </div>

          {/* Date of Implant */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Date of Implant <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.dateOfImplant}
              onChange={(e) => handleChange('dateOfImplant', e.target.value)}
              onBlur={() => handleBlur('dateOfImplant')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.dateOfImplant && touched.dateOfImplant ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.dateOfImplant && touched.dateOfImplant && (
              <p className="text-sm text-red-500 mt-1">{errors.dateOfImplant}</p>
            )}
          </div>

          {/* Implant Status */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Implant Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.implantStatus}
              onChange={(e) => handleChange('implantStatus', e.target.value)}
              onBlur={() => handleBlur('implantStatus')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.implantStatus && touched.implantStatus ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            >
              <option value="">Select implant status</option>
              {IMPLANT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            {errors.implantStatus && touched.implantStatus && (
              <p className="text-sm text-red-500 mt-1">{errors.implantStatus}</p>
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
export default function ImplantsPage() {
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
      const list = await getBiomedicalImplants(session.user_id, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      setItems(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err?.message || "Failed to load implants")
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
      await deleteBiomedicalImplant(id, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      await load()
    } catch (err) {
      setError(err?.message || "Failed to delete implant")
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
        await updateBiomedicalImplant(editingItem.id, submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      } else {
        await createBiomedicalImplant(submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      }
      
      await load()
      setIsModalOpen(false)
      setEditingItem(null)
    } catch (err) {
      setError(err?.message || "Failed to save implant")
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
            <h1 className="text-2xl font-bold text-[#0E1C2F]">Biomedical Implants</h1>
            <p className="text-sm text-[#6C7A8C]">Health records</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Implant</span>
          </button>
        </div>

        {loading ? (
          <ReportListSkeleton count={3} />
        ) : error ? (
          <ReportsError message={error} onRetry={load} />
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <img 
              src={BIOMEDICAL_IMPLANTS_EMPTY_IMAGE}
              alt="No implants"
              className="w-48 h-48 object-contain mb-6"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
            <h3 className="text-xl font-semibold text-[#0E1C2F] mb-2">
              No Implants Recorded
            </h3>
            <p className="text-sm text-[#6C7A8C] max-w-sm mb-6">
              Add implant details to track your biomedical implants.
            </p>
            <button
              onClick={handleAdd}
              className="px-6 py-2.5 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors font-medium"
            >
              Add Implant
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <ImplantCard
                key={item.id || Math.random().toString()}
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
      <ImplantFormModal
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
                Implant Details
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
                <p className="text-xs text-[#9CA3AF] font-medium">Implant Name</p>
                <p className="text-base font-semibold text-[#0E1C2F]">
                  {viewingItem.implantName || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Type</p>
                <p className="text-base text-[#0E1C2F]">
                  {viewingItem.implantType || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Body Location</p>
                <p className="text-base text-[#0E1C2F]">
                  {viewingItem.bodyLocation || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Reason / Diagnosis</p>
                <p className="text-base text-[#0E1C2F]">
                  {viewingItem.reasonForImplant || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Date of Implant</p>
                <p className="text-base text-[#0E1C2F]">
                  {formatDate(viewingItem.dateOfImplant) || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Status</p>
                <p className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium`}
                   style={getStatusColor(viewingItem.implantStatus)}>
                  {viewingItem.implantStatus || "—"}
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