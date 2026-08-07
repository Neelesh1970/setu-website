import { useEffect, useState, useCallback } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { CalendarDays, Loader2, CheckCircle, RefreshCw } from "lucide-react"
import axios from "axios"
import {
  exerciseImage,
  fetchExercise,
  fetchExercises,
  fetchMuscles,
  todayIstKey,
} from "../../api/fitness"
import { FitnessShell } from "./FitnessShell"
import { FitnessGateLoader, useFitnessGate } from "./useFitnessGate"

const FITNESS_BASE_URL = "https://staging.setuai.com/fitness"

// ------------------------------------------------------------------
// 1. Main Workout Browse (UNCHANGED)
// ------------------------------------------------------------------
export default function FitnessWorkout() {
  const { ready, auth } = useFitnessGate()
  const [muscles, setMuscles] = useState([])
  const [selected, setSelected] = useState("")
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const list = await fetchMuscles(auth)
        if (cancelled) return
        const names = list
          .map((m) => (typeof m === "string" ? m : m.name || m.muscle || m.title))
          .filter(Boolean)
        setMuscles(names)
        setSelected(names[0] || "")
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load muscles")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [ready, auth])

  useEffect(() => {
    if (!ready || !selected) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetchExercises(auth, { muscle: selected })
        if (!cancelled) setItems(res.items || [])
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load exercises")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [ready, auth, selected])

  if (!ready) {
    return (
      <FitnessShell title="Workout">
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  return (
    <FitnessShell
      title="Workout"
      rightAction={
        <Link
          to="/app/fitness/workout/daily"
          className="rounded-lg p-1.5 text-white/90 hover:bg-white/10"
        >
          <CalendarDays size={18} />
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="touch-scroll -mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
          {muscles.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelected(m)}
              className={`min-h-9 shrink-0 snap-start rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                selected === m
                  ? "bg-[#10B981] text-white shadow-sm"
                  : "bg-white text-[#374151] ring-1 ring-[#E5E7EB] hover:ring-[#10B981]/40"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-[#10B981]">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-[#6B7280]">No exercises found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((ex) => {
              const id = ex.id || ex.exercise_id
              const name = ex.name || ex.exercise_name || "Exercise"
              const equipment = ex.equipment || ex.Equipment || selected
              return (
                <Link
                  key={id}
                  to={`/app/fitness/workout/${encodeURIComponent(id)}`}
                  className="group flex flex-col rounded-2xl border border-[#E5E7EB] bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <div className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden">
                    <img
                      src={exerciseImage(ex.image || ex.image_url || name)}
                      alt={name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {ex.difficulty && (
                      <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        {ex.difficulty}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col flex-grow p-3">
                    <h3 className="font-semibold text-[#111827] line-clamp-1 text-sm sm:text-base">
                      {name}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#6B7280] flex items-center gap-1">
                      <span className="inline-block w-3 h-3">🏋️</span> {equipment}
                    </p>
                    {ex.target_muscle && (
                      <p className="mt-0.5 text-xs text-[#6B7280]">
                        🎯 {ex.target_muscle}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </FitnessShell>
  )
}

// ------------------------------------------------------------------
// 2. Exercise Detail – with DAY PICKER + SUCCESS POPUP
// ------------------------------------------------------------------
export function FitnessExerciseDetail() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const { ready, auth } = useFitnessGate()
  const [ex, setEx] = useState(null)
  const [sets, setSets] = useState("3")
  const [reps, setReps] = useState("12")
  const [duration, setDuration] = useState("30")
  const [weightKg, setWeightKg] = useState("")
  const [orderIndex, setOrderIndex] = useState("0")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  // Day picker state
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [availableDays, setAvailableDays] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)

  const WEEKDAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
  const getDayName = (w) => WEEKDAY_NAMES[w-1] || `Day ${w}`
  const getTodayWeekday = () => {
    const d = new Date()
    const day = d.getDay() // 0=Sunday
    return day === 0 ? 7 : day
  }

  // Fetch exercise details
  useEffect(() => {
    if (!ready || !exerciseId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await fetchExercise(auth, exerciseId)
        if (cancelled) return
        setEx(data)
        if (data?.Sets || data?.sets) setSets(String(data.Sets || data.sets))
        if (data?.Reps || data?.reps) setReps(String(data.Reps || data.reps))
        if (data?.Duration || data?.duration) setDuration(String(data.Duration || data.duration))
        if (data?.Weight || data?.weight_kg) setWeightKg(String(data.Weight || data.weight_kg || ""))
        if (data?.Order || data?.order_index) setOrderIndex(String(data.Order || data.order_index || "0"))
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load exercise")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [ready, auth, exerciseId])

  // Fetch plan to know existing days
  const fetchPlanDays = useCallback(async () => {
    setPlanLoading(true)
    try {
      const token = auth?.token
      const refreshToken = auth?.refreshToken
      const url = `${FITNESS_BASE_URL}/workout-plans/active`
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-REFRESH-TOKEN": refreshToken || "",
        },
        timeout: 15000,
      })
      const plan = res?.data?.data?.plan || res?.data?.plan || res?.data?.data || {}
      const days = Array.isArray(plan?.days) ? plan.days : []
      const existingWeekdays = days
        .filter(d => Array.isArray(d.exercises) && d.exercises.length > 0)
        .map(d => Number(d.weekday))
        .filter(w => w >= 1 && w <= 7)
      const allDays = [1,2,3,4,5,6,7].map(w => ({
        weekday: w,
        name: getDayName(w),
        exists: existingWeekdays.includes(w)
      }))
      setAvailableDays(allDays)
      const today = getTodayWeekday()
      const preferred = allDays.find(d => d.weekday === today && d.exists) || allDays.find(d => d.exists) || allDays[today-1]
      setSelectedDay(preferred || allDays[0])
    } catch {
      // fallback: all days available
      const allDays = [1,2,3,4,5,6,7].map(w => ({
        weekday: w,
        name: getDayName(w),
        exists: false
      }))
      setAvailableDays(allDays)
      setSelectedDay(allDays[getTodayWeekday()-1])
    } finally {
      setPlanLoading(false)
    }
  }, [auth])

  const openDayPicker = () => {
    fetchPlanDays()
    setShowDayPicker(true)
  }

  const closeDayPicker = () => setShowDayPicker(false)

  const addToSelectedDay = async () => {
    if (!selectedDay) {
      setError("Please select a day")
      return
    }
    const weekday = selectedDay.weekday
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const token = auth?.token
      const refreshToken = auth?.refreshToken
      if (!token) throw new Error("Authentication required")

      const exerciseData = {
        exercise_id: String(exerciseId),
        order_index: Number(orderIndex) || 0,
        sets: Number(sets) || 3,
        reps: Number(reps) || 12,
        weight_kg: weightKg ? Number(weightKg) : null,
        duration_seconds: Number(duration) || 30,
        notes: notes || null,
      }

      // Use the plan endpoint to add to a specific day
      const url = `${FITNESS_BASE_URL}/workout-plans/active/days/${weekday}/exercises`
      const payload = { ...exerciseData }

      console.log(`🟢 [Add Exercise] Adding to day ${weekday}:`, payload)

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-REFRESH-TOKEN": refreshToken || "",
          "Content-Type": "application/json",
        },
        timeout: 15000,
      })

      if (response?.data?.hasError) {
        throw new Error(response.data.message || "Failed to add exercise")
      }

      // Close day picker, show success popup, then navigate to workout browse
      closeDayPicker()
      setShowSuccessPopup(true)
      // Wait 1.5 seconds, then navigate
      setTimeout(() => {
        setShowSuccessPopup(false)
        navigate("/app/fitness/workout")
      }, 1500)
    } catch (err) {
      console.error("🔴 [Add Exercise] Error:", err)
      setError(err.message || "Failed to add exercise")
      setSaving(false)
    }
  }

  if (!ready) {
    return (
      <FitnessShell title="Exercise" backTo="/app/fitness/workout" showTabs={false}>
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  const name = ex?.name || ex?.exercise_name || "Exercise"
  const imageSrc = exerciseImage(ex?.image || ex?.image_url || name)

  return (
    <>
      <FitnessShell title={name} backTo="/app/fitness/workout" showTabs={false}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-16 text-[#10B981]">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : error && !ex ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : (
            <div className="space-y-5">
              <div className="relative w-full bg-gray-100 rounded-2xl overflow-hidden shadow-md">
                <img
                  src={imageSrc}
                  alt={name}
                  className="w-full max-h-72 sm:max-h-96 object-cover"
                />
                {ex?.difficulty && (
                  <span className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {ex.difficulty}
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                <h2 className="text-xl font-bold text-[#111827]">{name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#4B5563] whitespace-pre-line">
                  {ex?.instructions || ex?.description || ex?.Instructions || ""}
                </p>
                {(ex?.target_muscle || ex?.equipment) && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#6B7280]">
                    {ex.target_muscle && (
                      <span className="flex items-center gap-1">
                        <span>🎯</span> {ex.target_muscle}
                      </span>
                    )}
                    {ex.equipment && (
                      <span className="flex items-center gap-1">
                        <span className="w-4 h-4 inline-block">🏋️</span> {ex.equipment}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Num label="Sets" value={sets} onChange={setSets} />
                <Num label="Reps" value={reps} onChange={setReps} />
                <Num label="Sec" value={duration} onChange={setDuration} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Num label="Weight (kg)" value={weightKg} onChange={setWeightKg} placeholder="Optional" />
                <Num label="Order" value={orderIndex} onChange={setOrderIndex} placeholder="0" />
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition"
                rows={2}
              />

              {message && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle size={16} /> {message}
                </p>
              )}
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={openDayPicker}
                className="w-full rounded-xl bg-[#10B981] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#059669] disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Adding…
                  </span>
                ) : (
                  "Add to workout plan"
                )}
              </button>
            </div>
          )}
        </div>
      </FitnessShell>

      {/* Day Picker Modal – centered and all days same weight */}
      {showDayPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeDayPicker}>
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#111827]">Select a day</h3>
              <button onClick={closeDayPicker} className="p-1 text-gray-400 hover:text-gray-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {planLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-[#10B981]" size={24} />
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableDays.map(day => (
                  <button
                    key={day.weekday}
                    onClick={() => setSelectedDay(day)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                      selectedDay?.weekday === day.weekday
                        ? 'border-[#10B981] bg-emerald-50'
                        : 'border-[#E5E7EB] bg-white hover:border-[#10B981]/30'
                    }`}
                  >
                    <span className="font-medium text-[#111827]">{day.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={closeDayPicker}
                className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-sm font-medium text-[#6B7280] hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addToSelectedDay}
                disabled={saving || !selectedDay}
                className="flex-1 rounded-xl bg-[#10B981] py-2.5 text-sm font-semibold text-white hover:bg-[#059669] disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin inline" size={18} /> : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full mx-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-[#111827] mb-2">Exercise added!</h3>
            <p className="text-sm text-[#6B7280]">
              Successfully added to <strong>{selectedDay?.name}</strong>'s workout.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

function Num({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm hover:border-[#10B981]/40 transition">
      <span className="text-xs text-[#6B7280]">{label}</span>
      <input
        className="mt-1 w-full bg-transparent text-lg font-semibold outline-none"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder={placeholder}
      />
    </label>
  )
}

// ------------------------------------------------------------------
// 3. Daily Workout – PLAN-BASED with delete/complete commented out
// ------------------------------------------------------------------
export function FitnessDailyWorkout() {
  const { ready, auth } = useFitnessGate()
  const navigate = useNavigate()

  const [folders, setFolders] = useState([])
  const [folderItemsMap, setFolderItemsMap] = useState({})
  const [selectedFolderId, setSelectedFolderId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingMap, setUpdatingMap] = useState({})
  const [updatingDay, setUpdatingDay] = useState(null)

  // ---- Token helper (unchanged) ----
  const getAuthHeaders = () => {
    let token = auth?.token
    let refreshToken = auth?.refreshToken || auth?.refresh_token

    if (!token) {
      const storageKeys = ['token', 'accessToken', 'authToken', 'jwt', 'fitness_token']
      for (const key of storageKeys) {
        const val = localStorage.getItem(key) || sessionStorage.getItem(key)
        if (val) { token = val; break }
      }
    }

    if (!refreshToken) {
      const refreshKeys = [
        'refreshToken', 'refresh_token', 'refresh-token',
        'x-refresh-token', 'X-REFRESH-TOKEN',
        'fitness_refresh_token', 'fitnessRefreshToken'
      ]
      for (const key of refreshKeys) {
        const val = localStorage.getItem(key) || sessionStorage.getItem(key)
        if (val) { refreshToken = val; break }
      }
    }

    if (!refreshToken && token) {
      refreshToken = token
    }

    console.log("[DailyWorkout] Headers:", {
      token: token ? `${token.substring(0, 10)}...` : 'missing',
      refreshToken: refreshToken ? `${refreshToken.substring(0, 10)}...` : 'missing'
    })

    if (!token) {
      throw new Error("Authentication token missing. Please log in again.")
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
    if (refreshToken) {
      headers["X-REFRESH-TOKEN"] = refreshToken
    }
    return headers
  }

  const WEEKDAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
  const getDayNameFromWeekday = (w) => WEEKDAY_NAMES[w-1] || `Day ${w}`
  const getTodayWeekdayNumber = () => {
    const d = new Date()
    const day = d.getDay()
    return day === 0 ? 7 : day
  }
  const isWeekdayCompletable = (weekday) => {
    const w = Number(weekday)
    if (!w || w < 1 || w > 7) return false
    return w <= getTodayWeekdayNumber()
  }
  const getExerciseImageUrl = (ex) => ex?.image_url || ex?.workout_img_uri || ex?.thumbnail_url || null
  const getPlanExerciseKey = (item) => String(item?.plan_exercise_id || item?.id || item?.exercise_id || "")

  const mapPlanExerciseToFolderItem = (exercise, day) => ({
    id: exercise?.id,
    plan_exercise_id: exercise?.id,
    exercise_id: exercise?.exercise_id,
    daily_item_id: exercise?.daily_item_id ? String(exercise.daily_item_id) : null,
    exercise_name: exercise?.exercise_name || "Exercise",
    image_url: getExerciseImageUrl(exercise),
    sets: exercise?.sets ?? null,
    reps: exercise?.reps ?? null,
    rest_seconds: exercise?.rest_seconds ?? null,
    muscle_group: exercise?.muscle_name || exercise?.muscle_group || "Exercises",
    is_completed: !!exercise?.is_completed,
    can_complete: exercise?.can_complete !== undefined ? !!exercise.can_complete : undefined,
    order_index: exercise?.order_index ?? 0,
    weekday: day?.weekday,
    weight_kg: exercise?.weight_kg ?? null,
    duration_seconds: exercise?.duration_seconds ?? null,
  })

  const loadPlan = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const headers = getAuthHeaders()
      const url = `${FITNESS_BASE_URL}/workout-plans/active`
      const res = await axios.get(url, { headers, timeout: 15000 })
      if (res?.data?.hasError) throw new Error(res.data.message || "Failed to load plan")

      const plan = res?.data?.data?.plan || res?.data?.plan || res?.data?.data || {}
      const days = Array.isArray(plan?.days) ? plan.days : []

      const nextFolders = []
      const nextItemsMap = {}
      days.forEach(day => {
        const weekday = Number(day.weekday)
        if (!weekday) return
        const dayName = day.weekday_label || getDayNameFromWeekday(weekday) || day.title || `Day ${weekday}`
        const folderId = `weekday_${weekday}`
        const exercises = (day.exercises || []).map(ex => mapPlanExerciseToFolderItem(ex, day))
        nextFolders.push({
          id: folderId,
          name: dayName,
          title: day.title || dayName,
          weekday,
          is_rest_day: !!day.is_rest_day,
          is_completed: !!day.is_completed,
          can_complete: day.can_complete !== undefined ? !!day.can_complete : undefined,
          is_future_day: !!day.is_future_day,
          workout_day: day.workout_day || null,
          imageUri: exercises.find(ex => ex.image_url)?.image_url || null,
        })
        nextItemsMap[folderId] = exercises
      })
      nextFolders.sort((a, b) => (a.weekday || 0) - (b.weekday || 0))

      setFolders(nextFolders)
      setFolderItemsMap(nextItemsMap)
    } catch (err) {
      if (err?.response?.status === 404) {
        setFolders([])
        setFolderItemsMap({})
      } else {
        setError(err.message || "Could not load workout plan.")
      }
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => {
    if (!ready) return
    loadPlan()
  }, [ready, loadPlan])

  // ---- All action functions are kept but not used in UI ----
  // (These remain defined but are commented out from rendering)
  const deletePlanDays = useCallback(async (weekdays) => {
    // kept for reference, but not called
  }, [])

  const deletePlanExercise = useCallback(async (weekday, exerciseId) => {
    // kept for reference, but not called
  }, [])

  const deleteDay = useCallback(async (folder) => {
    // kept for reference, but not called
  }, [])

  const deleteExerciseFromPlan = useCallback(async (item, folderId) => {
    // kept for reference, but not called
  }, [])

  const markExerciseComplete = useCallback(async (item, folderId) => {
    // kept for reference, but not called
  }, [])

  const markDayComplete = useCallback(async (folder) => {
    // kept for reference, but not called
  }, [])

  // ---- render helpers ----
  const renderFolderGrid = () => {
    if (loading && !folders.length) {
      return (
        <div className="flex justify-center py-16 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      )
    }
    if (error) {
      return (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button onClick={loadPlan} className="ml-2 underline font-medium">Retry</button>
        </div>
      )
    }
    if (!folders.length) {
      return (
        <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-white p-8 text-center">
          <p className="text-sm text-[#6B7280]">No workout plan yet.</p>
          <Link to="/app/fitness/workout" className="mt-3 inline-block text-sm font-semibold text-[#10B981] hover:underline">
            Browse workouts to build your plan
          </Link>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders.map(folder => {
          const exercises = folderItemsMap[folder.id] || []
          const thumbnails = exercises.slice(0, 3)
          const extra = Math.max(0, exercises.length - 3)
          const isCompleted = folder.is_completed
          const canComplete = isWeekdayCompletable(folder.weekday) && !isCompleted

          return (
            <div key={folder.id} className="relative group">
              <div
                className={`rounded-2xl border p-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  selectedFolderId === folder.id ? 'ring-2 ring-[#10B981]' : 'border-[#E5E7EB]'
                } ${isCompleted ? 'opacity-60' : ''}`}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#111827]">{folder.name}</h3>
                  {isCompleted && <CheckCircle size={16} className="text-emerald-600" />}
                </div>
                <div className="mt-2 flex -space-x-2">
                  {thumbnails.map((ex, idx) => (
                    <div key={idx} className="h-10 w-10 rounded-lg bg-gray-100 border-2 border-white overflow-hidden">
                      {ex.image_url ? (
                        <img src={ex.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">🏋️</div>
                      )}
                    </div>
                  ))}
                  {extra > 0 && (
                    <div className="h-10 w-10 rounded-lg bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                      +{extra}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex justify-between text-xs text-[#6B7280]">
                  <span>{exercises.length} exercises</span>
                  <span>{exercises.filter(e => e.is_completed).length} done</span>
                </div>
                {/*
                  // ---- DELETE / COMPLETE buttons commented out ----
                  {canComplete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markDayComplete(folder) }}
                      disabled={updatingDay === folder.id}
                      className="mt-3 w-full rounded-lg bg-[#10B981] py-1.5 text-xs font-semibold text-white hover:bg-[#059669] disabled:opacity-60"
                    >
                      {updatingDay === folder.id ? <Loader2 className="animate-spin inline" size={14} /> : "Mark day complete"}
                    </button>
                  )}
                  {!isCompleted && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteDay(folder) }}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600"
                    >
                      <span className="sr-only">Delete</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  )}
                */}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderDayDetail = () => {
    const folder = folders.find(f => f.id === selectedFolderId)
    if (!folder) return null
    const exercises = folderItemsMap[selectedFolderId] || []
    const isCompleted = folder.is_completed

    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setSelectedFolderId(null)}
            className="rounded-lg p-1.5 hover:bg-gray-100"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h2 className="text-xl font-bold text-[#111827]">{folder.name}</h2>
          {isCompleted && (
            <span className="ml-auto text-sm font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle size={16} /> Done
            </span>
          )}
        </div>

        {exercises.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No exercises in this day.</p>
        ) : (
          <ul className="space-y-3">
            {exercises.map((ex) => {
              const key = getPlanExerciseKey(ex)
              const isDone = ex.is_completed
              const isUpdating = updatingMap[key]
              const canComplete = isWeekdayCompletable(folder.weekday) && !isDone

              return (
                <li key={key} className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm ${
                  isDone ? 'border-emerald-200 bg-emerald-50' : 'border-[#E5E7EB] bg-white hover:border-[#10B981]/30'
                }`}>
                  <img
                    src={ex.image_url || exerciseImage(ex.exercise_name)}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover bg-gray-100"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#111827]">{ex.exercise_name}</p>
                    <p className="text-xs text-[#6B7280]">
                      {ex.sets || '-'} sets · {ex.reps || '-'} reps
                      {isDone && <span className="ml-2 text-emerald-600">✓ Done</span>}
                    </p>
                  </div>
                  {/*
                    // ---- Complete/Delete buttons commented out ----
                    {canComplete && (
                      <button
                        onClick={() => markExerciseComplete(ex, selectedFolderId)}
                        disabled={isUpdating}
                        className="rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#059669] disabled:opacity-50"
                      >
                        {isUpdating ? <Loader2 className="animate-spin" size={14} /> : "Complete"}
                      </button>
                    )}
                    {!isDone && (
                      <button
                        onClick={() => deleteExerciseFromPlan(ex, selectedFolderId)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete exercise"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    )}
                  */}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  return (
    <FitnessShell
      title="Daily workout"
      backTo="/app/fitness/workout"
      showTabs={false}
      rightAction={
        <button
          onClick={loadPlan}
          className="rounded-lg p-1.5 text-white/90 hover:bg-white/10"
          aria-label="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      }
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        {selectedFolderId ? renderDayDetail() : renderFolderGrid()}
      </div>
    </FitnessShell>
  )
}