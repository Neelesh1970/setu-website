import { useCallback, useEffect, useState, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { ReportListSkeleton } from "../../components/AppSkeleton"
import { ReportsEmpty, ReportsError, ReportsShell } from "./ReportsShell"
import { Plus, Pencil, X, Trash2, Eye, MoreVertical, Calendar, User, MapPin, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { reportsUrl } from "../../config/api"
import { authHeaders } from "../../api/http"

// CloudFront Asset Base URL
const ASSETS_BASE_URL = "https://d10pnqyli54qno.cloudfront.net/Reports/public/"
const HEADER_BLUE = "#1C39BB"

// ===================== API FUNCTIONS =====================

async function getImmunizations(userId, status, { token, refreshToken } = {}) {
  const url = status 
    ? reportsUrl(`/immunizations/user/${encodeURIComponent(userId)}?status=${status}`)
    : reportsUrl(`/immunizations/user/${encodeURIComponent(userId)}`)
  
  const response = await fetch(url, {
    headers: authHeaders(token, refreshToken),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.message || "Failed to load immunizations")
  
  let result = data?.data || data || []
  if (result && typeof result === 'object' && !Array.isArray(result) && result.data) {
    result = result.data
  }
  return Array.isArray(result) ? result : []
}

async function createImmunization(data, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl("/immunizations"), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || "Failed to create immunization")
  }
  return result?.data || result
}

async function updateImmunization(id, data, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/immunizations/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || "Failed to update immunization")
  }
  return result?.data || result
}

async function deleteImmunization(id, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/immunizations/${id}`), {
    method: 'DELETE',
    headers: {
      ...authHeaders(token, refreshToken),
    },
  })
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result?.message || "Failed to delete immunization")
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

const getStatusColor = (status) => {
  const s = String(status || "").toLowerCase()
  if (s === "confirmed" || s === "completed") {
    return { bg: "#E8F8EF", text: "#15803D", dot: "#16D12F" }
  }
  if (s === "pending" || s === "upcoming") {
    return { bg: "#FEF9C3", text: "#A16207", dot: "#F7A62B" }
  }
  if (s === "cancelled" || s === "missed") {
    return { bg: "#FEE2E2", text: "#B91C1C", dot: "#FF6666" }
  }
  return { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" }
}

// ===================== COMPONENTS =====================

// Immunization Card Component with Status on Right Side
function ImmunizationCard({ item, onEdit, onDelete, onView, onStatusUpdate, isUpcoming = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [actionType, setActionType] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const menuRef = useRef(null)

  const status = item?.status || "pending"
  const statusColors = getStatusColor(status)
  const formattedDate = formatDate(item?.dateOfVaccination)
  const location = item?.vaccinationLocation || "—"
  const prescribedBy = item?.prescribedBy || "—"

  const handleDeleteClick = () => {
    setMenuOpen(false)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    setShowDeleteModal(false)
    onDelete(item.id)
  }

  const handleStatusAction = (type) => {
    setActionType(type)
    setShowStatusModal(true)
  }

  const confirmStatusUpdate = () => {
    setShowStatusModal(false)
    setIsProcessing(true)
    onStatusUpdate(item.id, actionType)
    setTimeout(() => setIsProcessing(false), 500)
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
        {/* Header Row - Name on Left, Status + Menu on Right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[#111827] truncate">
              {item?.vaccineName || item?.name || "Vaccine"}
            </p>
          </div>

          {/* Status Chip + Menu Button on Right */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status Chip */}
            <span 
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColors.dot }} />
              {status.charAt(0).toUpperCase() + status.slice(1)}
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
          <div className="flex items-center gap-2 text-sm text-[#4B5563]">
            <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>{formattedDate || "Date not set"}</span>
          </div>
          {location && location !== "—" && (
            <div className="flex items-center gap-2 text-sm text-[#4B5563]">
              <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="truncate">{location}</span>
            </div>
          )}
          {prescribedBy && prescribedBy !== "—" && (
            <div className="flex items-center gap-2 text-sm text-[#4B5563]">
              <User className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="truncate">By: {prescribedBy}</span>
            </div>
          )}
        </div>

        {/* Action Buttons - Only for Upcoming/Pending items */}
        {isUpcoming && (
          <div className="mt-3 flex justify-end gap-2 border-t border-[#E5E7EB] pt-3">
            <button
              onClick={() => handleStatusAction("confirmed")}
              disabled={isProcessing}
              className="px-4 py-1.5 bg-[#1C39BB] text-white rounded-lg text-xs font-semibold hover:bg-[#152a8a] transition-colors disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => handleStatusAction("cancelled")}
              disabled={isProcessing}
              className="px-4 py-1.5 bg-[#EEF2FF] text-[#1C39BB] rounded-lg text-xs font-semibold hover:bg-[#E0E7FF] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
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
              Delete Immunization
            </h3>
            <p className="text-sm text-[#6C7A8C] text-center mb-6">
              Are you sure you want to delete "{item?.vaccineName || "this immunization"}"?
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

      {/* Status Update Confirmation Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex justify-center mb-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                actionType === "confirmed" ? "bg-green-100" : "bg-red-100"
              }`}>
                {actionType === "confirmed" ? (
                  <CheckCircle className="w-10 h-10 text-green-600" />
                ) : (
                  <AlertCircle className="w-10 h-10 text-red-600" />
                )}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[#0E1C2F] text-center mb-2">
              {actionType === "confirmed" ? "Mark as Completed" : "Cancel Immunization"}
            </h3>
            <p className="text-sm text-[#6C7A8C] text-center mb-6">
              {actionType === "confirmed" 
                ? `Are you sure you want to mark "${item?.vaccineName}" as completed?`
                : `Are you sure you want to cancel "${item?.vaccineName}"?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[#6C7A8C] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusUpdate}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors ${
                  actionType === "confirmed" 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionType === "confirmed" ? "Complete" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Immunization Form Modal
function ImmunizationFormModal({ isOpen, onClose, onSubmit, initialData = null, isSubmitting = false, addMode = "upcoming" }) {
  const [formData, setFormData] = useState({
    vaccineName: "",
    dateOfVaccination: "",
    prescribedBy: "",
    vaccinationLocation: "",
    status: "",
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const STATUS_OPTIONS = ["pending", "confirmed"]

  useEffect(() => {
    if (initialData) {
      setFormData({
        vaccineName: initialData.vaccineName || "",
        dateOfVaccination: initialData.dateOfVaccination || "",
        prescribedBy: initialData.prescribedBy || "",
        vaccinationLocation: initialData.vaccinationLocation || "",
        status: initialData.status || "pending",
      })
    } else {
      setFormData({
        vaccineName: "",
        dateOfVaccination: "",
        prescribedBy: "",
        vaccinationLocation: "",
        status: addMode === "completed" ? "confirmed" : "pending",
      })
    }
    setErrors({})
    setTouched({})
  }, [initialData, isOpen, addMode])

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
    if (key === "dateOfVaccination" && trimmed) {
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
    const requiredFields = ['vaccineName', 'dateOfVaccination', 'prescribedBy', 'vaccinationLocation', 'status']
    
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`
      }
    })

    if (formData.dateOfVaccination) {
      const date = new Date(formData.dateOfVaccination)
      if (isNaN(date.getTime())) {
        newErrors.dateOfVaccination = "Please enter a valid date"
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
      vaccineName: formData.vaccineName.trim(),
      dateOfVaccination: formData.dateOfVaccination,
      prescribedBy: formData.prescribedBy.trim(),
      vaccinationLocation: formData.vaccinationLocation.trim(),
      status: formData.status,
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
            {isEditing ? 'Edit Vaccination Record' : 'Add Vaccination Record'}
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
          {/* Vaccine Name */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Vaccine Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.vaccineName}
              onChange={(e) => handleChange('vaccineName', e.target.value)}
              onBlur={() => handleBlur('vaccineName')}
              placeholder="Enter vaccine name"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.vaccineName && touched.vaccineName ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.vaccineName && touched.vaccineName && (
              <p className="text-sm text-red-500 mt-1">{errors.vaccineName}</p>
            )}
          </div>

          {/* Date of Vaccination */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Date of Vaccination <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.dateOfVaccination}
              onChange={(e) => handleChange('dateOfVaccination', e.target.value)}
              onBlur={() => handleBlur('dateOfVaccination')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.dateOfVaccination && touched.dateOfVaccination ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.dateOfVaccination && touched.dateOfVaccination && (
              <p className="text-sm text-red-500 mt-1">{errors.dateOfVaccination}</p>
            )}
          </div>

          {/* Vaccination Location */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Vaccination Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.vaccinationLocation}
              onChange={(e) => handleChange('vaccinationLocation', e.target.value)}
              onBlur={() => handleBlur('vaccinationLocation')}
              placeholder="Enter hospital or clinic name"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.vaccinationLocation && touched.vaccinationLocation ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.vaccinationLocation && touched.vaccinationLocation && (
              <p className="text-sm text-red-500 mt-1">{errors.vaccinationLocation}</p>
            )}
          </div>

          {/* Prescribed By */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Prescribed By <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.prescribedBy}
              onChange={(e) => handleChange('prescribedBy', e.target.value)}
              onBlur={() => handleBlur('prescribedBy')}
              placeholder="Doctor name"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.prescribedBy && touched.prescribedBy ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.prescribedBy && touched.prescribedBy && (
              <p className="text-sm text-red-500 mt-1">{errors.prescribedBy}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Vaccination Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              onBlur={() => handleBlur('status')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.status && touched.status ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            >
              <option value="pending">Upcoming</option>
              <option value="confirmed">Completed</option>
            </select>
            {errors.status && touched.status && (
              <p className="text-sm text-red-500 mt-1">{errors.status}</p>
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
export default function ImmunizationPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("confirmed")
  const [pending, setPending] = useState([])
  const [confirmed, setConfirmed] = useState([])
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
      const [p, c] = await Promise.all([
        getImmunizations(session.user_id, "pending", {
          token: session.token,
          refreshToken: session.refreshToken,
        }),
        getImmunizations(session.user_id, "confirmed", {
          token: session.token,
          refreshToken: session.refreshToken,
        }),
      ])
      setPending(Array.isArray(p) ? p : [])
      setConfirmed(Array.isArray(c) ? c : [])
    } catch (err) {
      setError(err?.message || "Failed to load immunizations")
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
      await deleteImmunization(id, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      await load()
    } catch (err) {
      setError(err?.message || "Failed to delete immunization")
    }
  }

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateImmunization(id, { status }, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      await load()
    } catch (err) {
      setError(err?.message || "Failed to update immunization status")
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
        await updateImmunization(editingItem.id, submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      } else {
        await createImmunization(submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      }
      
      await load()
      setIsModalOpen(false)
      setEditingItem(null)
    } catch (err) {
      setError(err?.message || "Failed to save immunization")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ensure list is always an array
  const list = tab === "pending" ? (Array.isArray(pending) ? pending : []) : (Array.isArray(confirmed) ? confirmed : [])
  const isUpcoming = tab === "pending"

  return (
    <>
      <ReportsShell>
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0E1C2F]">Immunizations</h1>
            <p className="text-sm text-[#6C7A8C]">Vaccination history</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vaccination</span>
          </button>
        </div>

        {/* Tabs - Properly Styled with Border for Both Active and Inactive */}
        <div className="flex items-center gap-2 mb-4">
          {[
            { id: "confirmed", label: "Confirmed" },
            { id: "pending", label: "Pending" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-5 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${
                tab === t.id
                  ? "bg-[#1C39BB] text-white border-[#1C39BB] shadow-sm"
                  : "bg-white text-[#6C7A8C] border-[#D1D5DB] hover:border-[#1C39BB] hover:text-[#0E1C2F]"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${
                tab === t.id ? "bg-white/20 text-white" : "bg-gray-100 text-[#6C7A8C]"
              }`}>
                {t.id === "pending" ? (Array.isArray(pending) ? pending.length : 0) : (Array.isArray(confirmed) ? confirmed.length : 0)}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <ReportListSkeleton count={3} />
        ) : error ? (
          <ReportsError message={error} onRetry={load} />
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#0E1C2F] mb-2">
              No {tab} Immunizations
            </h3>
            <p className="text-sm text-[#6C7A8C] max-w-sm mb-6">
              {tab === "pending" 
                ? "No upcoming vaccinations scheduled." 
                : "No completed vaccinations recorded."}
            </p>
            <button
              onClick={handleAdd}
              className="px-6 py-2.5 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors font-medium"
            >
              Add Vaccination
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((item) => (
              <ImmunizationCard
                key={item.id || Math.random().toString()}
                item={item}
                isUpcoming={isUpcoming}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </ReportsShell>

      {/* Form Modal */}
      <ImmunizationFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(null)
        }}
        onSubmit={handleSubmit}
        initialData={editingItem}
        isSubmitting={isSubmitting}
        addMode={tab}
      />

      {/* View Modal */}
      {showViewModal && viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#0E1C2F]">
                Immunization Details
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
                <p className="text-xs text-[#9CA3AF] font-medium">Vaccine Name</p>
                <p className="text-base font-semibold text-[#0E1C2F]">
                  {viewingItem.vaccineName || viewingItem.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Date</p>
                <p className="text-base text-[#0E1C2F]">
                  {formatDate(viewingItem.dateOfVaccination) || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Location</p>
                <p className="text-base text-[#0E1C2F]">
                  {viewingItem.vaccinationLocation || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Prescribed By</p>
                <p className="text-base text-[#0E1C2F]">
                  {viewingItem.prescribedBy || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Status</p>
                <p className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium`}
                   style={getStatusColor(viewingItem.status)}>
                  {viewingItem.status || "—"}
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