import { useCallback, useEffect, useState, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { ReportListSkeleton } from "../../components/AppSkeleton"
import { ReportsEmpty, ReportsError, ReportsShell } from "./ReportsShell"
import { Plus, Pencil, X, Trash2, Eye, Download, MoreVertical } from "lucide-react"
import { reportsUrl } from "../../config/api"
import { authHeaders } from "../../api/http"

// CloudFront Asset Base URL
const ASSETS_BASE_URL = "https://d10pnqyli54qno.cloudfront.net/Reports/public/"

const ALLERGIES_EMPTY_IMAGE = `${ASSETS_BASE_URL}vital_signs_empty.png`
const HEADER_BLUE = "#1C39BB"

// ===================== API FUNCTIONS (built-in) =====================

/**
 * Get all allergies for a user
 */
async function getAllergies(userId, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/allergies-reports/user/${encodeURIComponent(userId)}`), {
    headers: authHeaders(token, refreshToken),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.message || "Failed to load allergies")
  return data?.data || data || []
}

/**
 * Upload image to server
 */
async function uploadImage(file, userId, { token, refreshToken } = {}) {
  if (!file) return null

  const formData = new FormData()
  formData.append('file', file)
  formData.append('userId', userId)

  const response = await fetch(reportsUrl('/allergies-reports/upload'), {
    method: 'POST',
    headers: {
      ...authHeaders(token, refreshToken),
    },
    body: formData,
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || "Failed to upload image")
  }
  return result?.data?.iconURL || result?.iconURL || null
}

/**
 * Create a new allergy
 */
async function createAllergy(data, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl("/allergies-reports"), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || "Failed to create allergy")
  }
  return result?.data || result
}

/**
 * Update an allergy
 */
async function updateAllergy(id, data, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/allergies-reports/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || "Failed to update allergy")
  }
  return result?.data || result
}

/**
 * Delete an allergy
 */
async function deleteAllergy(id, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/allergies-reports/${id}`), {
    method: 'DELETE',
    headers: {
      ...authHeaders(token, refreshToken),
    },
  })
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result?.message || "Failed to delete allergy")
  }
  return true
}

// ===================== COMPONENTS =====================

// Severity color mapping
const severityClass = (severity) => {
  const s = String(severity || "").toLowerCase()
  if (s.includes("severe") || s.includes("high")) {
    return "bg-red-100 text-red-700"
  }
  if (s.includes("moderate") || s.includes("medium")) {
    return "bg-yellow-100 text-yellow-700"
  }
  if (s.includes("mild") || s.includes("low")) {
    return "bg-green-100 text-green-700"
  }
  return "bg-gray-100 text-gray-700"
}

// Allergy Card Component with Menu
function AllergyCard({ item, onEdit, onDelete, onView, onDownload }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [imageError, setImageError] = useState(false)
  const menuRef = useRef(null)

  const severityLabel = item.severity || "Unknown"
  const severityColor = severityClass(severityLabel)

  // Get icon URL from CloudFront
  const iconUrl = item.iconURL 
    ? `${ASSETS_BASE_URL}${item.iconURL.replace(/^\/+/, '')}`
    : null

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
        <div className="flex items-center gap-3">
          {/* Icon/Thumbnail */}
          <div className="w-[72px] h-[72px] rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
            {iconUrl && !imageError ? (
              <img
                src={iconUrl}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#1C39BB]/10">
                <span className="text-2xl font-bold text-[#1C39BB]">
                  {item.name?.charAt(0) || "A"}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#9CA3AF] font-medium mb-0.5">
              {item.category || item.allergen || "Allergy"}
            </p>
            <p className="text-lg font-bold text-[#111827] truncate">
              {item.name || "Allergy"}
            </p>
            {severityLabel && (
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${severityColor}`}>
                {severityLabel}
              </span>
            )}
          </div>

          {/* Menu Button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-[#111827]" />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-[#E5E7EB] shadow-lg min-w-[150px] z-50 py-1">
                <button
                  onClick={() => { setMenuOpen(false); onView(item) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm text-[#1C39BB] font-medium"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onEdit(item) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm text-[#1C39BB] font-medium"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDownload(item) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm text-[#1C39BB] font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 text-sm text-red-600 font-medium border-t border-[#E5E7EB]"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
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
              Are you sure?
            </h3>
            <p className="text-sm text-[#6C7A8C] text-center mb-6">
              This will permanently delete this allergy record.
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

// Allergy Form Modal with Working Image Upload
function AllergyFormModal({ isOpen, onClose, onSubmit, initialData = null, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    name: "",
    allergen: "",
    severity: "",
    reaction: "",
    notes: "",
  })
  const [errors, setErrors] = useState({})
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        allergen: initialData.allergen || "",
        severity: initialData.severity || "",
        reaction: initialData.reaction || "",
        notes: initialData.notes || "",
      })
      if (initialData.iconURL) {
        setSelectedImage(`${ASSETS_BASE_URL}${initialData.iconURL.replace(/^\/+/, '')}`)
      }
    } else {
      setFormData({
        name: "",
        allergen: "",
        severity: "",
        reaction: "",
        notes: "",
      })
      setSelectedImage(null)
      setSelectedFile(null)
    }
    setErrors({})
  }, [initialData, isOpen])

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }))
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image (JPEG, PNG, GIF, WEBP) or PDF file.')
      e.target.value = ''
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.')
      e.target.value = ''
      return
    }

    setSelectedFile(file)
    
    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const validateForm = () => {
    const newErrors = {}
    const requiredFields = ['name', 'allergen', 'severity', 'reaction']
    
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = 'This field is required'
      }
    })

    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = 'Notes must be 500 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsUploading(true)

    try {
      const payload = {
        name: formData.name.trim(),
        allergen: formData.allergen.trim(),
        severity: formData.severity,
        reaction: formData.reaction.trim(),
        notes: formData.notes.trim(),
      }

      // If there's a new file, upload it first
      if (selectedFile) {
        // You need to pass userId and auth tokens here
        // This will be handled in the parent component
        payload.file = selectedFile
      }

      onSubmit(payload)
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  const isEditing = !!initialData?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E6EEF5] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0E1C2F]">
            {isEditing ? 'Edit Allergy Details' : 'Add Allergy Details'}
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
          {/* Allergy Name */}
          <div>
            <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
              Allergy Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter allergy name"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.name ? 'border-red-500' : 'border-[#E6EEF5]'
              }`}
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Allergen Type */}
          <div>
            <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
              Allergen Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.allergen}
              onChange={(e) => handleChange('allergen', e.target.value)}
              placeholder="Select allergen type"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.allergen ? 'border-red-500' : 'border-[#E6EEF5]'
              }`}
            />
            {errors.allergen && <p className="text-sm text-red-500 mt-1">{errors.allergen}</p>}
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
              Severity <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.severity}
              onChange={(e) => handleChange('severity', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.severity ? 'border-red-500' : 'border-[#E6EEF5]'
              }`}
            >
              <option value="">Select severity</option>
              <option value="Severe">Severe</option>
              <option value="Moderate">Moderate</option>
              <option value="Mild">Mild</option>
            </select>
            {errors.severity && <p className="text-sm text-red-500 mt-1">{errors.severity}</p>}
          </div>

          {/* Reaction/Symptoms */}
          <div>
            <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
              Reaction / Symptoms <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reaction}
              onChange={(e) => handleChange('reaction', e.target.value)}
              placeholder="Enter reaction or symptoms"
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] resize-none ${
                errors.reaction ? 'border-red-500' : 'border-[#E6EEF5]'
              }`}
            />
            {errors.reaction && <p className="text-sm text-red-500 mt-1">{errors.reaction}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add any additional notes about this allergy"
              rows={2}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] resize-none ${
                errors.notes ? 'border-red-500' : 'border-[#E6EEF5]'
              }`}
            />
            {errors.notes && <p className="text-sm text-red-500 mt-1">{errors.notes}</p>}
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
              Upload Image / Document (Optional)
            </label>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="border-2 border-dashed border-[#E6EEF5] rounded-lg p-6 text-center hover:border-[#1C39BB] transition-colors">
              {selectedImage ? (
                <div>
                  <img 
                    src={selectedImage} 
                    alt="Preview" 
                    className="max-h-48 mx-auto mb-3 rounded-lg object-contain" 
                  />
                  <div className="flex gap-3 justify-center flex-wrap">
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm"
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-[#6C7A8C] mt-2">
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-5xl mb-3">📤</div>
                  <p className="text-sm text-[#6C7A8C] mb-2">
                    Upload allergy-related report, prescription, or image if available.
                  </p>
                  <p className="text-xs text-[#9CA3AF] mb-3">
                    Supports: JPEG, PNG, GIF, WEBP, PDF (Max 5MB)
                  </p>
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="px-6 py-2.5 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm font-medium"
                  >
                    Choose File
                  </button>
                </div>
              )}
            </div>
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
              disabled={isSubmitting || isUploading}
              className="flex-1 px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isUploading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main Component
export default function AllergiesPage() {
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
      const list = await getAllergies(session.user_id, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      setItems(list || [])
    } catch (err) {
      setError(err?.message || "Failed to load allergies")
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

  const handleDownload = (item) => {
    console.log("Downloading:", item.name)
  }

  const handleDelete = async (id) => {
    try {
      await deleteAllergy(id, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      await load()
    } catch (err) {
      setError(err?.message || "Failed to delete allergy")
    }
  }

  const handleSubmit = async (payload) => {
    if (!session?.user_id) return
    
    setIsSubmitting(true)
    try {
      let iconURL = editingItem?.iconURL || null

      // Upload image if there's a file
      if (payload.file) {
        try {
          const uploadedUrl = await uploadImage(payload.file, session.user_id, {
            token: session.token,
            refreshToken: session.refreshToken,
          })
          if (uploadedUrl) {
            iconURL = uploadedUrl
          }
        } catch (err) {
          console.error("Image upload failed:", err)
          // Continue without image if upload fails
        }
      }

      const submitPayload = {
        name: payload.name,
        allergen: payload.allergen,
        severity: payload.severity,
        reaction: payload.reaction,
        notes: payload.notes || "",
        userId: Number(session.user_id),
        ...(iconURL && { iconURL }),
      }

      // Remove file from payload
      delete submitPayload.file

      if (editingItem?.id) {
        await updateAllergy(editingItem.id, submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      } else {
        await createAllergy(submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      }
      
      await load()
      setIsModalOpen(false)
      setEditingItem(null)
    } catch (err) {
      setError(err?.message || "Failed to save allergy")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <ReportsShell>
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0E1C2F]">Allergies</h1>
            <p className="text-sm text-[#6C7A8C]">Health records</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Allergy</span>
          </button>
        </div>

        {loading ? (
          <ReportListSkeleton count={3} />
        ) : error ? (
          <ReportsError message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <img 
              src={ALLERGIES_EMPTY_IMAGE}
              alt="No allergies"
              className="w-48 h-48 object-contain mb-6"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
            <h3 className="text-xl font-semibold text-[#0E1C2F] mb-2">
              No Allergies Recorded
            </h3>
            <p className="text-sm text-[#6C7A8C] max-w-sm mb-6">
              Add your allergy details to stay safe and informed.
            </p>
            <button
              onClick={handleAdd}
              className="px-6 py-2.5 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors font-medium"
            >
              Add Allergy
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <AllergyCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </ReportsShell>

      {/* Form Modal */}
      <AllergyFormModal
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
                Allergy Details
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
                <p className="text-xs text-[#9CA3AF] font-medium">Name</p>
                <p className="text-base font-semibold text-[#0E1C2F]">
                  {viewingItem.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Allergen Type</p>
                <p className="text-base text-[#0E1C2F]">
                  {viewingItem.allergen || viewingItem.category || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Severity</p>
                <p className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${severityClass(viewingItem.severity)}`}>
                  {viewingItem.severity || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Reaction / Symptoms</p>
                <p className="text-base text-[#0E1C2F]">
                  {viewingItem.reaction || "—"}
                </p>
              </div>
              {viewingItem.notes && (
                <div>
                  <p className="text-xs text-[#9CA3AF] font-medium">Notes</p>
                  <p className="text-base text-[#0E1C2F]">{viewingItem.notes}</p>
                </div>
              )}
              {viewingItem.iconURL && (
                <div>
                  <p className="text-xs text-[#9CA3AF] font-medium">Image</p>
                  <img 
                    src={`${ASSETS_BASE_URL}${viewingItem.iconURL.replace(/^\/+/, '')}`}
                    alt={viewingItem.name}
                    className="mt-1 max-h-40 rounded-lg object-contain"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
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