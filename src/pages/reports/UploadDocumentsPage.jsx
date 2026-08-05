import { useCallback, useEffect, useState, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { ReportListSkeleton } from "../../components/AppSkeleton"
import { ReportsEmpty, ReportsError, ReportsShell } from "./ReportsShell"
import { Plus, Pencil, X, Trash2, Eye, Download, MoreVertical, Search, Filter, Upload, Camera, Image as ImageIcon, File, ChevronDown, Check } from "lucide-react"
import { reportsUrl } from "../../config/api"
import { authHeaders } from "../../api/http"

// CloudFront Asset Base URL
const ASSETS_BASE_URL = "https://d10pnqyli54qno.cloudfront.net/Reports/public/"
const HEADER_BLUE = "#1C39BB"
const MEDICAL_DOCUMENTS_EMPTY_IMAGE = `${ASSETS_BASE_URL}biomedical_implants_empty.png`

// Document type icons from CloudFront
const CAT_IMG = {
  allergy: `${ASSETS_BASE_URL}Allergy.png`,
  immunization: `${ASSETS_BASE_URL}Immune.png`,
  medication: `${ASSETS_BASE_URL}Medications.png`,
  ctScan: `${ASSETS_BASE_URL}CT-Scan.png`,
  labReport: `${ASSETS_BASE_URL}Lab-Reports.png`,
  mri: `${ASSETS_BASE_URL}MRI.png`,
  sonography: `${ASSETS_BASE_URL}Ultrasound-Sonography.png`,
  stressTest: `${ASSETS_BASE_URL}StressTest.png`,
  xRay: `${ASSETS_BASE_URL}X-Ray.png`,
  others: `${ASSETS_BASE_URL}Others.png`,
}

const CATEGORY_LABELS = {
  allergy: "Allergy",
  immunization: "Immune",
  medication: "Medication",
  ctScan: "CT Scan",
  labReport: "Lab Reports",
  mri: "MRI",
  sonography: "Sonography",
  stressTest: "Stress Test",
  xRay: "X-Ray",
  others: "Other",
}

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS)
const FOLDER_NAME = {
  allergy: "Allergy",
  immunization: "Immune",
  medication: "Medication",
  ctScan: "CT Scan",
  labReport: "Lab Reports",
  mri: "MRI",
  sonography: "Sonography",
  stressTest: "Stress Test",
  xRay: "X-Ray",
  others: "Other",
}

const typeIcons = {
  allergy: "bandage",
  ctScan: "scan",
  immunization: "shield",
  labReport: "flask",
  medication: "medkit",
  mri: "pulse",
  sonography: "radio",
  stressTest: "heart",
  xRay: "body",
  others: "file-text",
}

// ===================== API FUNCTIONS =====================

async function fetchStorageObjects(userId, prefix = "", { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/storage/list?prefix=${encodeURIComponent(prefix)}&maxKeys=100`), {
    headers: authHeaders(token, refreshToken),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.message || "Failed to fetch documents")
  return data?.data?.objects || []
}

async function deleteStorageObject(key, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl(`/storage/object`), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify({ key }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.message || "Failed to delete document")
  }
  return true
}

async function uploadStorageObject(file, key, { token, refreshToken } = {}) {
  const formData = new FormData()
  formData.append('key', key)
  formData.append('file', file)

  const response = await fetch(reportsUrl('/storage/upload'), {
    method: 'POST',
    headers: {
      ...authHeaders(token, refreshToken),
    },
    body: formData,
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.message || "Failed to upload document")
  }
  return data?.data || data
}

async function moveStorageObject(fromKey, toKey, { token, refreshToken } = {}) {
  const response = await fetch(reportsUrl('/storage/move'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token, refreshToken),
    },
    body: JSON.stringify({ fromKey, toKey, overwrite: false }),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.message || "Failed to move document")
  }
  return data?.data || data
}

// ===================== HELPERS =====================

const getFileExtension = (filename) => {
  return filename?.split('.').pop()?.toLowerCase() || ''
}

const isImage = (filename) => {
  const ext = getFileExtension(filename)
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)
}

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

const getCategoryFromKey = (key) => {
  const parts = key?.split('/') || []
  const rIdx = parts.findIndex(p => p.toLowerCase() === 'reports')
  if (rIdx >= 0 && parts.length > rIdx + 3) {
    const folder = parts[rIdx + 3]
    const lower = folder?.toLowerCase() || ''
    for (const [cat, folderName] of Object.entries(FOLDER_NAME)) {
      if (folderName.toLowerCase() === lower) return cat
    }
  }
  return 'others'
}

const getDisplayName = (key) => {
  const parts = key?.split('/') || []
  return parts[parts.length - 1] || 'Untitled'
}

// ===================== COMPONENTS =====================

function DocumentCard({ item, onEdit, onDelete, onDownload, onView }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const menuRef = useRef(null)
  const [imageError, setImageError] = useState(false)

  const category = item.category || 'others'
  const displayName = item.displayName || getDisplayName(item.key)
  const formattedDate = item.lastModified ? formatDate(item.lastModified) : ''

  const iconUrl = CAT_IMG[category]

  const handleDeleteClick = () => {
    setMenuOpen(false)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    setShowDeleteModal(false)
    onDelete(item.key)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const isImageFile = isImage(item.key)

  return (
    <>
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 shadow-sm hover:shadow-md transition-shadow relative">
        <div className="flex items-start gap-3">
          {/* Icon/Thumbnail */}
          <div className="w-14 h-14 rounded-xl bg-[#F1F6FF] border border-[#D7E3FF] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {isImageFile && !imageError ? (
              <img
                src={`${reportsUrl('/storage/download')}?key=${encodeURIComponent(item.key)}`}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <img
                src={iconUrl}
                alt={CATEGORY_LABELS[category]}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-medium text-[#6B7280]">
              {CATEGORY_LABELS[category] || 'Other'}
            </p>
            <p className="text-sm font-bold text-[#111827] truncate">
              {displayName}
            </p>
            {formattedDate && (
              <p className="text-xs text-[#9CA3AF] mt-0.5">{formattedDate}</p>
            )}
          </div>

          {/* Menu Button */}
          <div className="relative flex-shrink-0" ref={menuRef}>
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
                  onClick={() => { setMenuOpen(false); onDownload(item) }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-[#1C39BB] font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
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
              Delete Document
            </h3>
            <p className="text-sm text-[#6C7A8C] text-center mb-6">
              Are you sure you want to delete this document? This action cannot be undone.
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

// Document Upload Modal
function DocumentUploadModal({ isOpen, onClose, onSubmit, initialData = null, isSubmitting = false }) {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [documentName, setDocumentName] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [errors, setErrors] = useState({})
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const isEditing = !!initialData?.key

  useEffect(() => {
    if (initialData?.key) {
      const category = getCategoryFromKey(initialData.key)
      setSelectedCategory(category)
      const name = getDisplayName(initialData.key)
      setDocumentName(name.replace(/\.[^.]+$/, ''))
      setSelectedFile(null)
      setFilePreview(null)
    } else {
      setSelectedCategory(null)
      setDocumentName("")
      setSelectedFile(null)
      setFilePreview(null)
    }
    setErrors({})
  }, [initialData, isOpen])

  const handleCategorySelect = (category) => {
    setSelectedCategory(category)
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: null }))
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB.')
      e.target.value = ''
      return
    }

    setSelectedFile(file)
    
    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result)
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB.')
      e.target.value = ''
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setFilePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!selectedCategory) {
      newErrors.category = 'Please select a document type'
    }
    if (!documentName || documentName.trim() === '') {
      newErrors.documentName = 'Document name is required'
    }
    if (!isEditing && !selectedFile) {
      newErrors.file = 'Please select a file to upload'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const payload = {
      category: selectedCategory,
      documentName: documentName.trim(),
      file: selectedFile,
    }

    onSubmit(payload)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E6EEF5] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0E1C2F]">
            {isEditing ? 'Edit Document' : 'Upload Document'}
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
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-2">
              Select Document Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_KEYS.map((key) => {
                const isSelected = selectedCategory === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCategorySelect(key)}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-[#1C39BB] bg-[#E8EDFF]'
                        : 'border-[#E5E7EB] hover:border-[#1C39BB]'
                    }`}
                  >
                    <img
                      src={CAT_IMG[key]}
                      alt={CATEGORY_LABELS[key]}
                      className="w-8 h-8 object-contain"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <span className={`text-xs mt-1 text-center ${isSelected ? 'text-[#1C39BB] font-semibold' : 'text-[#6B7280]'}`}>
                      {CATEGORY_LABELS[key]}
                    </span>
                    {isSelected && <Check className="w-3 h-3 text-[#1C39BB] mt-0.5" />}
                  </button>
                )
              })}
            </div>
            {errors.category && (
              <p className="text-sm text-red-500 mt-1">{errors.category}</p>
            )}
          </div>

          {/* Document Name */}
          <div>
            <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => {
                setDocumentName(e.target.value)
                if (errors.documentName) {
                  setErrors(prev => ({ ...prev, documentName: null }))
                }
              }}
              placeholder="Enter document name"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                errors.documentName ? 'border-red-500' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.documentName && (
              <p className="text-sm text-red-500 mt-1">{errors.documentName}</p>
            )}
          </div>

          {/* File Upload */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-[#1D2B3A] mb-1">
                Upload File <span className="text-red-500">*</span>
              </label>
              
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />

              <div className="border-2 border-dashed border-[#D1D5DB] rounded-lg p-6 text-center hover:border-[#1C39BB] transition-colors">
                {filePreview ? (
                  <div>
                    <img 
                      src={filePreview} 
                      alt="Preview" 
                      className="max-h-40 mx-auto mb-3 rounded-lg object-contain" 
                    />
                    <p className="text-sm text-[#111827] font-medium mb-1">
                      {selectedFile?.name}
                    </p>
                    <p className="text-xs text-[#6B7280] mb-3">
                      {(selectedFile?.size / 1024).toFixed(1)} KB
                    </p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-5xl mb-3">📤</div>
                    <p className="text-sm text-[#6B7280] mb-2">
                      PDF or Image (JPG/PNG)
                    </p>
                    <p className="text-xs text-[#9CA3AF] mb-3">Max 2MB</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Gallery
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm"
                      >
                        <Camera className="w-4 h-4" />
                        Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {errors.file && (
                <p className="text-sm text-red-500 mt-1">{errors.file}</p>
              )}
            </div>
          )}

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
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Upload')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Filter Sheet Component
function FilterSheet({ isOpen, onClose, selectedFilters, onToggleFilter, onApply, onClear }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[70vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#111827]">Filter Documents</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1">
            {CATEGORY_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => onToggleFilter(key)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  selectedFilters.includes(key) ? 'bg-[#E8EDFF]' : 'hover:bg-gray-50'
                }`}
              >
                <img
                  src={CAT_IMG[key]}
                  alt={CATEGORY_LABELS[key]}
                  className="w-6 h-6 object-contain"
                  onError={(e) => e.target.style.display = 'none'}
                />
                <span className="flex-1 text-left text-sm text-[#111827]">
                  {CATEGORY_LABELS[key]}
                </span>
                {selectedFilters.includes(key) && (
                  <Check className="w-5 h-5 text-[#1C39BB]" />
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-4 pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={onClear}
              className="flex-1 px-4 py-2 border border-[#1C39BB] rounded-lg text-[#1C39BB] font-semibold hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={onApply}
              className="flex-1 px-4 py-2 bg-[#1C39BB] text-white rounded-lg font-semibold hover:bg-[#152a8a] transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Empty State Component
function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <img
        src={MEDICAL_DOCUMENTS_EMPTY_IMAGE}
        alt="No documents"
        className="w-48 h-48 object-contain mb-6"
        onError={(e) => e.target.style.display = 'none'}
      />
      <h3 className="text-xl font-bold text-[#111827] mb-2">No Documents Added</h3>
      <p className="text-sm text-[#6B7280] max-w-sm mb-6">
        Added documents medicine will appear here
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-2.5 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors font-medium"
      >
        Add Documents
      </button>
    </div>
  )
}

// ===================== MAIN COMPONENT =====================

export default function MedicalDocumentsPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [documents, setDocuments] = useState([])
  const [filteredDocuments, setFilteredDocuments] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [viewingItem, setViewingItem] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState([])
  const [appliedFilters, setAppliedFilters] = useState([])

  const load = useCallback(async () => {
    if (!session?.user_id) return
    setLoading(true)
    setError("")
    try {
      const prefix = `Reports/users/${session.user_id}/`
      const objects = await fetchStorageObjects(session.user_id, prefix, {
        token: session.token,
        refreshToken: session.refreshToken,
      })

      // Filter out Allergies folder
      const filtered = objects.filter(obj => {
        const parts = obj.key?.split('/') || []
        const categorySeg = parts.length > 3 ? parts[3] : ''
        return categorySeg?.toLowerCase() !== 'allergies'
      })

      const mapped = filtered.map(obj => ({
        ...obj,
        category: getCategoryFromKey(obj.key),
        displayName: getDisplayName(obj.key),
      }))

      setDocuments(mapped)
      setFilteredDocuments(mapped)
    } catch (err) {
      setError(err?.message || "Failed to load documents")
      setDocuments([])
      setFilteredDocuments([])
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  // Apply filters and search
  useEffect(() => {
    let result = [...documents]

    // Apply category filters
    if (appliedFilters.length > 0) {
      result = result.filter(doc => appliedFilters.includes(doc.category))
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(doc =>
        doc.displayName?.toLowerCase().includes(query) ||
        CATEGORY_LABELS[doc.category]?.toLowerCase().includes(query)
      )
    }

    setFilteredDocuments(result)
  }, [documents, appliedFilters, searchQuery])

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

  const handleDownload = async (item) => {
    try {
      const url = `${reportsUrl('/storage/download')}?key=${encodeURIComponent(item.key)}`
      window.open(url, '_blank')
    } catch (err) {
      setError(err?.message || "Failed to download document")
    }
  }

  const handleDelete = async (key) => {
    try {
      await deleteStorageObject(key, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      await load()
    } catch (err) {
      setError(err?.message || "Failed to delete document")
    }
  }

  const handleSubmit = async (payload) => {
    if (!session?.user_id) return
    
    setIsSubmitting(true)
    try {
      if (editingItem?.key) {
        // Edit mode - rename/move document
        const oldKey = editingItem.key
        const folder = FOLDER_NAME[payload.category] || 'Other'
        const newKey = `Reports/users/${session.user_id}/${folder}/${payload.documentName}`
        
        if (oldKey !== newKey) {
          await moveStorageObject(oldKey, newKey, {
            token: session.token,
            refreshToken: session.refreshToken,
          })
        }
      } else {
        // Create mode
        const folder = FOLDER_NAME[payload.category] || 'Other'
        const ext = payload.file?.name?.split('.').pop() || 'pdf'
        const key = `Reports/users/${session.user_id}/${folder}/${payload.documentName}.${ext}`
        
        await uploadStorageObject(payload.file, key, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      }
      
      await load()
      setIsModalOpen(false)
      setEditingItem(null)
    } catch (err) {
      setError(err?.message || "Failed to save document")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApplyFilters = () => {
    setAppliedFilters([...selectedFilters])
    setShowFilterSheet(false)
  }

  const handleClearFilters = () => {
    setSelectedFilters([])
    setAppliedFilters([])
    setShowFilterSheet(false)
  }

  const handleToggleFilter = (filter) => {
    setSelectedFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

  const hasData = filteredDocuments.length > 0

  return (
    <>
      <ReportsShell>
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0E1C2F]">Medical Documents</h1>
            <p className="text-sm text-[#6C7A8C]">Health records</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Document</span>
          </button>
        </div>

        {/* Search and Filter */}
        {!loading && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 flex items-center bg-[#F3F4F6] rounded-xl border border-[#E5E7EB] px-3 py-2">
              <Search className="w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Reports"
                className="flex-1 ml-2 text-sm bg-transparent outline-none text-[#111827]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X className="w-4 h-4 text-[#9CA3AF]" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setSelectedFilters([...appliedFilters])
                setShowFilterSheet(true)
              }}
              className="w-10 h-10 rounded-lg border border-[#BFDBFE] bg-[#E8EDFF] flex items-center justify-center hover:bg-[#D7E3FF] transition-colors"
            >
              <Filter className="w-5 h-5 text-[#1C39BB]" />
            </button>
          </div>
        )}

        {/* Filter Chips */}
        {appliedFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {appliedFilters.map((filter) => (
              <div
                key={filter}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#1C39BB] bg-[#E8EDFF]"
              >
                <span className="text-xs font-semibold text-[#1C39BB]">
                  {CATEGORY_LABELS[filter]}
                </span>
                <button
                  onClick={() => {
                    const next = appliedFilters.filter(f => f !== filter)
                    setAppliedFilters(next)
                    setSelectedFilters(next)
                  }}
                  className="p-0.5 hover:bg-[#D7E3FF] rounded-full"
                >
                  <X className="w-3 h-3 text-[#1C39BB]" />
                </button>
              </div>
            ))}
            <button
              onClick={handleClearFilters}
              className="px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#1C39BB] transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {loading ? (
          <ReportListSkeleton count={3} />
        ) : error ? (
          <ReportsError message={error} onRetry={load} />
        ) : !hasData ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((item) => (
              <DocumentCard
                key={item.key}
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
      <DocumentUploadModal
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
                Document Details
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
                  {viewingItem.displayName || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">Category</p>
                <p className="text-base text-[#0E1C2F]">
                  {CATEGORY_LABELS[viewingItem.category] || "—"}
                </p>
              </div>
              {viewingItem.lastModified && (
                <div>
                  <p className="text-xs text-[#9CA3AF] font-medium">Uploaded</p>
                  <p className="text-base text-[#0E1C2F]">
                    {formatDate(viewingItem.lastModified)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleDownload(viewingItem)}
                className="flex-1 px-4 py-2.5 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[#6C7A8C] hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Sheet */}
      <FilterSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        selectedFilters={selectedFilters}
        onToggleFilter={handleToggleFilter}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />
    </>
  )
}