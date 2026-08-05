import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { CalendarDays, Loader2, Clock, Dumbbell, CheckCircle } from "lucide-react"
import {
  addWorkoutExercises,
  completeWorkoutDay,
  exerciseImage,
  fetchExercise,
  fetchExercises,
  fetchMuscles,
  fetchWorkoutToday,
  completeWorkoutBulk,
  todayIstKey,
} from "../../api/fitness"
import { FitnessShell } from "./FitnessShell"
import { FitnessGateLoader, useFitnessGate } from "./useFitnessGate"

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
    return () => {
      cancelled = true
    }
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
    return () => {
      cancelled = true
    }
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
      {/* Content wrapper with proper padding and max-width */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Muscle tabs */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                      <Dumbbell size={12} /> {equipment}
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

export function FitnessExerciseDetail() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const { ready, auth } = useFitnessGate()
  const [ex, setEx] = useState(null)
  const [sets, setSets] = useState("3")
  const [reps, setReps] = useState("12")
  const [duration, setDuration] = useState("30")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

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
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load exercise")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ready, auth, exerciseId])

  const addToToday = async () => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const day = todayIstKey()
      await addWorkoutExercises(auth, day, [
        {
          exercise_id: String(exerciseId),
          order_index: 0,
          sets: Number(sets) || 3,
          reps: Number(reps) || 12,
          weight_kg: null,
          duration_seconds: Number(duration) || 30,
          notes: notes || null,
        },
      ])
      completeWorkoutDay(auth, day).catch(() => {})
      setMessage("Added to today’s workout")
      setTimeout(() => navigate("/app/fitness/workout/daily"), 600)
    } catch (err) {
      setError(err.message || "Failed to add exercise")
    } finally {
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
  // Always use image – no video
  const imageSrc = exerciseImage(ex?.image || ex?.image_url || name)

  return (
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
            {/* Exercise Image */}
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

            {/* Description Card */}
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
                      <Dumbbell size={14} /> {ex.equipment}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Sets, Reps, Duration */}
            <div className="grid grid-cols-3 gap-3">
              <Num label="Sets" value={sets} onChange={setSets} />
              <Num label="Reps" value={reps} onChange={setReps} />
              <Num label="Sec" value={duration} onChange={setDuration} />
            </div>

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition"
              rows={2}
            />

            {/* Feedback */}
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

            {/* Add Button */}
            <button
              type="button"
              disabled={saving}
              onClick={addToToday}
              className="w-full rounded-xl bg-[#10B981] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#059669] disabled:opacity-60 transition-colors"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Adding…
                </span>
              ) : (
                "Add to today’s workout"
              )}
            </button>
          </div>
        )}
      </div>
    </FitnessShell>
  )
}

function Num({ label, value, onChange }) {
  return (
    <label className="block rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm hover:border-[#10B981]/40 transition">
      <span className="text-xs text-[#6B7280]">{label}</span>
      <input
        className="mt-1 w-full bg-transparent text-lg font-semibold outline-none"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
      />
    </label>
  )
}

export function FitnessDailyWorkout() {
  const { ready, auth } = useFitnessGate()
  const [day, setDay] = useState(todayIstKey())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchWorkoutToday(auth)
      const list =
        data?.exercises || data?.items || data?.data?.exercises || []
      setItems(Array.isArray(list) ? list : [])
      if (data?.day || data?.date) setDay(data.day || data.date)
    } catch (err) {
      setError(err.message || "Failed to load daily workout")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ready) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, auth?.token])

  const markAllComplete = async () => {
    setBusy(true)
    try {
      const ids = items
        .map((x) => x.id || x.item_id || x.exercise_id)
        .filter(Boolean)
      await completeWorkoutBulk(auth, day, {
        exercise_ids: ids,
        completed: true,
      }).catch(async () => {
        await completeWorkoutDay(auth, day)
      })
      await load()
    } catch (err) {
      setError(err.message || "Failed to complete")
    } finally {
      setBusy(false)
    }
  }

  if (!ready) {
    return (
      <FitnessShell title="Daily workout" backTo="/app/fitness/workout" showTabs={false}>
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  return (
    <FitnessShell title="Daily workout" backTo="/app/fitness/workout" showTabs={false}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
        <p className="mb-4 text-sm text-[#6B7280] flex items-center gap-2">
          <CalendarDays size={16} /> {day}
        </p>
        {loading ? (
          <div className="flex justify-center py-16 text-[#10B981]">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-white px-4 py-12 text-center">
            <p className="text-sm text-[#6B7280]">No exercises for today.</p>
            <Link
              to="/app/fitness/workout"
              className="mt-3 inline-block text-sm font-semibold text-[#10B981] hover:underline"
            >
              Browse workouts
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((ex) => {
                const isDone = ex.completed || ex.is_completed
                return (
                  <li
                    key={ex.id || ex.exercise_id}
                    className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm transition ${
                      isDone
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-[#E5E7EB] bg-white hover:border-[#10B981]/30"
                    }`}
                  >
                    <img
                      src={exerciseImage(ex.image || ex.exercise_name || ex.name)}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover bg-gray-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#111827]">
                        {ex.exercise_name || ex.name}
                      </p>
                      <p className="text-xs text-[#6B7280] flex items-center gap-2">
                        <span>{ex.sets || "-"} sets · {ex.reps || "-"} reps</span>
                        {isDone && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle size={14} /> Done
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              disabled={busy}
              onClick={markAllComplete}
              className="mt-4 w-full rounded-xl bg-[#10B981] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#059669] disabled:opacity-60 transition-colors"
            >
              {busy ? "Updating…" : "Mark day complete"}
            </button>
          </>
        )}
      </div>
    </FitnessShell>
  )
}