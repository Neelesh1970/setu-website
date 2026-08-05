import { useCallback, useEffect, useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { 
  getVitalSigns, 
  createVitalSigns, 
  updateVitalSigns 
} from "../../api/reports"
import { ReportListSkeleton } from "../../components/AppSkeleton"
import { ReportsEmpty, ReportsError, ReportsShell } from "./ReportsShell"
import { Plus, Pencil, X } from "lucide-react"

// CloudFront Asset Base URL - same as React Native
const ASSETS_BASE_URL = "https://d10pnqyli54qno.cloudfront.net/Reports/public/"

// Icon mapping - using CloudFront assets like RN
const VITAL_ICONS = {
  height: `${ASSETS_BASE_URL}height.png`,
  weight: `${ASSETS_BASE_URL}weight.png`,
  bmi: `${ASSETS_BASE_URL}bmi.png`,
  temperature: `${ASSETS_BASE_URL}temperature.png`,
  bloodPressure: `${ASSETS_BASE_URL}blood_pressure.png`,
  heartRate: `${ASSETS_BASE_URL}heart_rate.png`,
  respiratoryRate: `${ASSETS_BASE_URL}respiratory_rate.png`,
  oxygenSaturation: `${ASSETS_BASE_URL}oxygen_saturation.png`,
}

// Empty state image
const VITAL_SIGNS_EMPTY_IMAGE = `${ASSETS_BASE_URL}vital_signs_empty.png`

// Metric Card - matches RN MeasurementCard with CloudFront image
function MetricCard({ icon, label, value, unit }) {
  return (
    <div className="rounded-xl border border-[#E6EEF5] bg-[#F8F9FB] p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-1.5 mb-1.5">
        <img 
          src={icon} 
          alt={label}
          className="w-[22px] h-[22px] object-contain"
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
        <p className="text-xs text-[#6B7280] font-normal flex-1">{label}</p>
      </div>
      <p className="text-xl font-bold text-[#111111]">
        {value ?? "—"}
        {unit && <span className="text-sm font-semibold text-[#111111] ml-0.5"> {unit}</span>}
      </p>
    </div>
  )
}

// Vital Sign Card - For 2-column grid layout
function VitalSignCard({ icon, label, value, unit, showStatus = false, statusLabel = "Normal" }) {
  return (
    <div className="bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#EEF2F6] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-[42px] h-[42px] rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
          <img 
            src={icon} 
            alt={label}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-[#111111]">
            {value}
            {unit && <span className="text-sm font-bold text-[#374151] ml-0.5"> {unit}</span>}
          </p>
          <p className="text-xs text-[#6B7280] truncate">{label}</p>
        </div>
        {showStatus && (
          <div className="flex items-center flex-shrink-0">
            <div className="relative w-3.5 h-3.5 rounded-full bg-[#22C55E] mr-1.5 border border-[#16A34A] overflow-hidden">
              <div className="absolute top-0.5 left-1 w-1.5 h-1 rounded-sm bg-white/70" />
            </div>
            <p className="text-sm font-bold text-[#374151]">{statusLabel}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Vital Form Modal Component
function VitalFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData = null,
  isSubmitting = false 
}) {
  const [formData, setFormData] = useState({
    height: "",
    weight: "",
    bmi: "",
    temperature: "",
    pulse: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    respiration: "",
    oxygenSaturation: "",
  })
  const [errors, setErrors] = useState({})

  const calculateBMI = (heightCm, weightKg) => {
    const height = parseFloat(heightCm)
    const weight = parseFloat(weightKg)
    if (!height || !weight || height <= 0 || weight <= 0) return ""
    const heightInMeters = height / 100
    const bmi = weight / (heightInMeters * heightInMeters)
    return bmi.toFixed(2)
  }

  useEffect(() => {
    if (initialData) {
      setFormData({
        height: initialData.height?.toString() || "",
        weight: initialData.weight?.toString() || "",
        bmi: initialData.bmi?.toString() || "",
        temperature: initialData.temperature?.toString() || "",
        pulse: initialData.pulse?.toString() || "",
        bloodPressureSystolic: initialData.bloodPressureSystolic?.toString() || "",
        bloodPressureDiastolic: initialData.bloodPressureDiastolic?.toString() || "",
        respiration: initialData.respiration?.toString() || "",
        oxygenSaturation: initialData.oxygenSaturation?.toString() || "",
      })
    } else {
      setFormData({
        height: "",
        weight: "",
        bmi: "",
        temperature: "",
        pulse: "",
        bloodPressureSystolic: "",
        bloodPressureDiastolic: "",
        respiration: "",
        oxygenSaturation: "",
      })
    }
    setErrors({})
  }, [initialData, isOpen])

  const handleChange = (key, value) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value }
      
      if (key === "height" || key === "weight") {
        const heightVal = key === "height" ? value : prev.height
        const weightVal = key === "weight" ? value : prev.weight
        next.bmi = calculateBMI(heightVal, weightVal)
      }
      
      return next
    })

    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    const requiredFields = [
      'height', 'weight', 'temperature', 'pulse', 
      'bloodPressureSystolic', 'bloodPressureDiastolic', 
      'respiration', 'oxygenSaturation'
    ]

    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = 'This field is required'
      }
    })

    const ranges = {
      height: { min: 50, max: 250, label: 'Height' },
      weight: { min: 20, max: 300, label: 'Weight' },
      temperature: { min: 30, max: 45, label: 'Temperature' },
      pulse: { min: 20, max: 250, label: 'Pulse' },
      bloodPressureSystolic: { min: 50, max: 300, label: 'Systolic BP' },
      bloodPressureDiastolic: { min: 30, max: 200, label: 'Diastolic BP' },
      respiration: { min: 5, max: 80, label: 'Respiration' },
      oxygenSaturation: { min: 70, max: 100, label: 'SpO₂' },
    }

    Object.keys(ranges).forEach(field => {
      if (formData[field] && formData[field].trim() !== '') {
        const value = parseFloat(formData[field])
        const { min, max, label } = ranges[field]
        if (isNaN(value) || value < min || value > max) {
          newErrors[field] = `${label} must be between ${min} and ${max}`
        }
      }
    })

    const systolic = parseFloat(formData.bloodPressureSystolic)
    const diastolic = parseFloat(formData.bloodPressureDiastolic)
    if (systolic && diastolic && diastolic >= systolic) {
      newErrors.bloodPressureDiastolic = 'Diastolic must be lower than systolic'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const payload = {
      height: parseFloat(formData.height),
      weight: parseFloat(formData.weight),
      bmi: parseFloat(formData.bmi || calculateBMI(formData.height, formData.weight)),
      temperature: parseFloat(formData.temperature),
      pulse: parseFloat(formData.pulse),
      bloodPressureSystolic: parseFloat(formData.bloodPressureSystolic),
      bloodPressureDiastolic: parseFloat(formData.bloodPressureDiastolic),
      respiration: parseFloat(formData.respiration),
      oxygenSaturation: parseFloat(formData.oxygenSaturation),
    }

    onSubmit(payload)
  }

  if (!isOpen) return null

  const isEditing = !!initialData?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="sticky top-0 bg-white border-b border-[#E6EEF5] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0E1C2F]">
            {isEditing ? 'Update Vital Signs' : 'Add Vital Signs'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[#6C7A8C]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
                Height (cm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="e.g. 165"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                  errors.height ? 'border-red-500' : 'border-[#E6EEF5]'
                }`}
              />
              {errors.height && (
                <p className="text-sm text-red-500 mt-1">{errors.height}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
                Weight (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                placeholder="e.g. 65"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                  errors.weight ? 'border-red-500' : 'border-[#E6EEF5]'
                }`}
              />
              {errors.weight && (
                <p className="text-sm text-red-500 mt-1">{errors.weight}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
              BMI (Auto-calculated)
            </label>
            <input
              type="text"
              value={formData.bmi || '—'}
              disabled
              className="w-full px-3 py-2 border border-[#E6EEF5] rounded-lg bg-gray-50 text-[#6C7A8C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
                Temperature (°C) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => handleChange('temperature', e.target.value)}
                placeholder="e.g. 37"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                  errors.temperature ? 'border-red-500' : 'border-[#E6EEF5]'
                }`}
              />
              {errors.temperature && (
                <p className="text-sm text-red-500 mt-1">{errors.temperature}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
                Pulse (bpm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.pulse}
                onChange={(e) => handleChange('pulse', e.target.value)}
                placeholder="e.g. 72"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                  errors.pulse ? 'border-red-500' : 'border-[#E6EEF5]'
                }`}
              />
              {errors.pulse && (
                <p className="text-sm text-red-500 mt-1">{errors.pulse}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
                Systolic BP (mmHg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                value={formData.bloodPressureSystolic}
                onChange={(e) => handleChange('bloodPressureSystolic', e.target.value)}
                placeholder="e.g. 120"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                  errors.bloodPressureSystolic ? 'border-red-500' : 'border-[#E6EEF5]'
                }`}
              />
              {errors.bloodPressureSystolic && (
                <p className="text-sm text-red-500 mt-1">{errors.bloodPressureSystolic}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
                Diastolic BP (mmHg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                value={formData.bloodPressureDiastolic}
                onChange={(e) => handleChange('bloodPressureDiastolic', e.target.value)}
                placeholder="e.g. 80"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                  errors.bloodPressureDiastolic ? 'border-red-500' : 'border-[#E6EEF5]'
                }`}
              />
              {errors.bloodPressureDiastolic && (
                <p className="text-sm text-red-500 mt-1">{errors.bloodPressureDiastolic}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
                Respiration (breaths/min) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.respiration}
                onChange={(e) => handleChange('respiration', e.target.value)}
                placeholder="e.g. 16"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                  errors.respiration ? 'border-red-500' : 'border-[#E6EEF5]'
                }`}
              />
              {errors.respiration && (
                <p className="text-sm text-red-500 mt-1">{errors.respiration}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0E1C2F] mb-1">
                SpO₂ (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.oxygenSaturation}
                onChange={(e) => handleChange('oxygenSaturation', e.target.value)}
                placeholder="e.g. 98"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C39BB] ${
                  errors.oxygenSaturation ? 'border-red-500' : 'border-[#E6EEF5]'
                }`}
              />
              {errors.oxygenSaturation && (
                <p className="text-sm text-red-500 mt-1">{errors.oxygenSaturation}</p>
              )}
            </div>
          </div>

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

export default function VitalSignsPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [vitals, setVitals] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingData, setEditingData] = useState(null)

  const load = useCallback(async () => {
    if (!session?.user_id) return
    setLoading(true)
    setError("")
    try {
      const data = await getVitalSigns(session.user_id, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      setVitals(data)
    } catch (err) {
      setError(err?.message || "Failed to load vital signs")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  const handleAdd = () => {
    setEditingData(null)
    setIsModalOpen(true)
  }

  const handleEdit = () => {
    setEditingData(vitals)
    setIsModalOpen(true)
  }

  const handleSubmit = async (payload) => {
    if (!session?.user_id) return
    
    setIsSubmitting(true)
    try {
      const submitPayload = {
        ...payload,
        userId: Number(session.user_id)
      }

      if (editingData?.id) {
        await updateVitalSigns(editingData.id, submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      } else {
        await createVitalSigns(submitPayload, {
          token: session.token,
          refreshToken: session.refreshToken,
        })
      }
      
      await load()
      setIsModalOpen(false)
      setEditingData(null)
    } catch (err) {
      setError(err?.message || "Failed to save vital signs")
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasData = vitals && (
    vitals.height ||
    vitals.weight ||
    vitals.bmi ||
    vitals.temperature ||
    vitals.bloodPressureSystolic ||
    vitals.pulse ||
    vitals.respiration ||
    vitals.oxygenSaturation
  )

  // Create array of vitals for 2-column grid
  const vitalsList = [
    {
      icon: VITAL_ICONS.temperature,
      label: "Body Temperature",
      value: vitals?.temperature ?? "--",
      unit: vitals?.temperature ? "°C" : "",
      showStatus: !!vitals?.temperature,
    },
    {
      icon: VITAL_ICONS.bloodPressure,
      label: "Blood Pressure",
      value: (vitals?.bloodPressureSystolic || vitals?.bloodPressureDiastolic)
        ? `${vitals?.bloodPressureSystolic ?? "--"}/${vitals?.bloodPressureDiastolic ?? "--"}`
        : "--",
      unit: (vitals?.bloodPressureSystolic || vitals?.bloodPressureDiastolic) ? "mmHg" : "",
      showStatus: !!(vitals?.bloodPressureSystolic || vitals?.bloodPressureDiastolic),
    },
    {
      icon: VITAL_ICONS.heartRate,
      label: "Heart Rate",
      value: vitals?.pulse ?? "--",
      unit: vitals?.pulse ? "bpm" : "",
      showStatus: !!vitals?.pulse,
    },
    {
      icon: VITAL_ICONS.respiratoryRate,
      label: "Respiratory Rate",
      value: vitals?.respiration ?? "--",
      unit: vitals?.respiration ? "breaths/min" : "",
      showStatus: !!vitals?.respiration,
    },
    {
      icon: VITAL_ICONS.oxygenSaturation,
      label: "Oxygen Saturation (SpO2)",
      value: vitals?.oxygenSaturation ?? "--",
      unit: vitals?.oxygenSaturation ? "%" : "",
      showStatus: !!vitals?.oxygenSaturation,
    },
  ]

  return (
    <>
      <ReportsShell>
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0E1C2F]">Vital Signs</h1>
            <p className="text-sm text-[#6C7A8C]">Health metrics</p>
          </div>
          <button
            onClick={hasData ? handleEdit : handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors text-sm font-medium"
          >
            {hasData ? (
              <>
                <Pencil className="w-4 h-4" />
                <span>Update Vitals</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Vitals</span>
              </>
            )}
          </button>
        </div>

        {loading ? (
          <ReportListSkeleton count={3} />
        ) : error ? (
          <ReportsError message={error} onRetry={load} />
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <img 
              src={VITAL_SIGNS_EMPTY_IMAGE}
              alt="No vitals"
              className="w-48 h-48 object-contain mb-6"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
            <h3 className="text-xl font-semibold text-[#0E1C2F] mb-2">
              No Vitals Recorded
            </h3>
            <p className="text-sm text-[#6C7A8C] max-w-sm mb-6">
              Add your blood pressure, pulse, temperature, oxygen level, and other vital signs.
            </p>
            <button
              onClick={handleAdd}
              className="px-6 py-2.5 bg-[#1C39BB] text-white rounded-lg hover:bg-[#152a8a] transition-colors font-medium"
            >
              Add Vitals
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Body Measurements Section - 3 columns */}
            <div>
              <h2 className="text-lg font-black text-[#111111] mb-2">
                Body Measurements
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <MetricCard
                  icon={VITAL_ICONS.height}
                  label="Height"
                  value={vitals.height ?? "--"}
                  unit={vitals.height ? "cm" : ""}
                />
                <MetricCard
                  icon={VITAL_ICONS.weight}
                  label="Weight"
                  value={vitals.weight ?? "--"}
                  unit={vitals.weight ? "kg" : ""}
                />
                <MetricCard
                  icon={VITAL_ICONS.bmi}
                  label="BMI"
                  value={vitals.bmi ?? "--"}
                  unit={vitals.bmi ? "kg/m²" : ""}
                />
              </div>
            </div>

            {/* Vitals Section - 2 columns grid with centered content */}
            <div>
              <h2 className="text-lg font-black text-[#111111] mb-2">
                Vitals
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {vitalsList.map((vital, index) => (
                  <VitalSignCard
                    key={index}
                    icon={vital.icon}
                    label={vital.label}
                    value={vital.value}
                    unit={vital.unit}
                    showStatus={vital.showStatus}
                    statusLabel="Normal"
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </ReportsShell>

      {/* Modal */}
      <VitalFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingData(null)
        }}
        onSubmit={handleSubmit}
        initialData={editingData}
        isSubmitting={isSubmitting}
      />
    </>
  )
}