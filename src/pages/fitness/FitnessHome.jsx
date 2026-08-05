import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ChevronRight,
  Droplets,
  Flame,
  Footprints,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import {
  exerciseImage,
  fetchDayGoals,
  fetchFitnessProfile,
  fetchSavedRecipes,
  fetchTrack,
  fetchWorkoutToday,
  fitnessImage,
  putTrack,
  toIstDate,
} from "../../api/fitness"
import { FitnessShell } from "./FitnessShell"
import { useFitnessGate } from "./useFitnessGate"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const STRIDE_M = 0.762
const CAL_PER_STEP = 0.04

export default function FitnessHome() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { ready, auth } = useFitnessGate()
  const now = toIstDate()
  const [selectedDay, setSelectedDay] = useState(now.getDate())
  const [goals, setGoals] = useState(null)
  const [track, setTrack] = useState(null)
  const [workout, setWorkout] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [profile, setProfile] = useState(null)
  const [stepsInput, setStepsInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingSteps, setSavingSteps] = useState(false)

  const dayKey = useMemo(() => {
    const d = toIstDate()
    d.setDate(selectedDay)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }, [selectedDay])

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const todayDay = now.getDate()

  // Ensure selected day is not in the future
  useEffect(() => {
    if (selectedDay > todayDay) {
      setSelectedDay(todayDay)
    }
  }, [selectedDay, todayDay])

  const load = async () => {
    if (!auth?.token) return
    setLoading(true)
    setError("")
    try {
      const [g, t, w, r, p] = await Promise.allSettled([
        fetchDayGoals(auth, dayKey),
        fetchTrack(auth, dayKey),
        fetchWorkoutToday(auth),
        fetchSavedRecipes(auth),
        fetchFitnessProfile(auth),
      ])
      if (g.status === "fulfilled") setGoals(g.value)
      if (t.status === "fulfilled") {
        setTrack(t.value)
        const steps =
          t.value?.steps ?? t.value?.step_count ?? t.value?.data?.steps ?? ""
        setStepsInput(steps === "" || steps == null ? "" : String(steps))
      }
      if (w.status === "fulfilled") setWorkout(w.value)
      if (r.status === "fulfilled") setRecipes(r.value.slice(0, 8))
      if (p.status === "fulfilled") setProfile(p.value)
      if (g.status === "rejected" && g.reason?.profileMissing) {
        navigate("/app/fitness/onboarding", { replace: true })
      }
    } catch (err) {
      setError(err.message || "Failed to load fitness home")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ready) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, dayKey, auth?.token])

  const calGoal =
    goals?.calories_goal ||
    goals?.calorie_goal ||
    goals?.goals?.calories ||
    goals?.calories ||
    2000
  const calConsumed =
    goals?.calories_consumed ||
    goals?.calories_burned ||
    goals?.consumed ||
    track?.calories ||
    0
  const steps =
    Number(track?.steps ?? track?.step_count ?? stepsInput ?? 0) || 0
  const stepGoal = goals?.steps_goal || goals?.goals?.steps || 8000

  const saveSteps = async () => {
    const n = Number(stepsInput)
    if (!Number.isFinite(n) || n < 0) return
    const stepsVal = Math.max(0, Math.floor(n))
    setSavingSteps(true)
    try {
      const payload = {
        steps: stepsVal,
        distance_m: stepsVal * STRIDE_M,
        calories_kcal: Math.round(stepsVal * CAL_PER_STEP),
        active_seconds: Math.round(stepsVal / 100) * 60,
      }
      const updated = await putTrack(auth, dayKey, payload)
      setTrack(updated || { ...(track || {}), ...payload })
      setStepsInput(String(stepsVal))
    } catch (err) {
      setError(err.message || "Failed to save steps")
    } finally {
      setSavingSteps(false)
    }
  }

  const workoutItems =
    workout?.exercises ||
    workout?.items ||
    workout?.data?.exercises ||
    (Array.isArray(workout) ? workout : [])

  if (!ready) {
    return (
      <FitnessShell title="Home" showBack={false} backTo="/app">
        <div className="flex justify-center py-20 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      </FitnessShell>
    )
  }

  return (
    <FitnessShell
      title="Home"
      showBack
      backTo="/app"
      rightAction={
        <button
          type="button"
          onClick={load}
          className="rounded-lg p-1.5 text-white/90 hover:bg-white/10"
          aria-label="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      }
    >
      <div className="mb-4">
        <p className="text-sm text-[#6B7280]">
          {MONTHS[now.getMonth()]} {now.getFullYear()}
        </p>
        <h2 className="text-xl font-semibold text-[#111827]">
          Hello{profile?.name || session?.name ? `, ${profile?.name || session?.name}` : ""}
        </h2>
      </div>

      <div className="touch-scroll -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const isFuture = d > todayDay
          return (
            <button
              key={d}
              type="button"
              onClick={() => !isFuture && setSelectedDay(d)}
              disabled={isFuture}
              className={`flex h-14 w-12 shrink-0 snap-start flex-col items-center justify-center rounded-xl text-sm ${
                selectedDay === d
                  ? "bg-[#10B981] font-semibold text-white"
                  : isFuture
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-[#374151] ring-1 ring-[#E5E7EB]"
              }`}
            >
              <span className="text-[10px] opacity-80">
                {MONTHS[now.getMonth()].slice(0, 3)}
              </span>
              {d}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <>
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
            <StatCard
              icon={Flame}
              label="Calories"
              value={`${Math.round(Number(calConsumed) || 0)}`}
              hint={`of ${Math.round(Number(calGoal) || 0)}`}
            />
            <StatCard
              icon={Footprints}
              label="Steps"
              value={`${Math.round(steps)}`}
              hint={`goal ${stepGoal}`}
            />
            <StatCard
              icon={Droplets}
              label="Workout"
              value={`${workoutItems.length}`}
              hint="today"
            />
          </div>

          <div className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-sm sm:p-4">
            <p className="text-sm font-semibold text-[#111827]">Log steps</p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Pedometer isn’t available on web — enter steps manually for {dayKey}.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                inputMode="numeric"
                value={stepsInput}
                onChange={(e) =>
                  setStepsInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="min-h-11 flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981]"
                placeholder="Steps"
              />
              <button
                type="button"
                disabled={savingSteps}
                onClick={saveSteps}
                className="min-h-11 rounded-xl bg-[#10B981] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:shrink-0"
              >
                Save
              </button>
            </div>
          </div>

          <SectionLink
            title="Today’s workout"
            to="/app/fitness/workout/daily"
            action="View all"
          >
            {workoutItems.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No exercises added yet.</p>
            ) : (
              <ul className="space-y-2">
                {workoutItems.slice(0, 3).map((ex) => (
                  <li
                    key={ex.id || ex.exercise_id || ex.exercise_name}
                    className="flex items-center gap-3"
                  >
                    <img
                      src={exerciseImage(ex.image || ex.exercise_name || ex.name)}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover bg-[#ECFDF5]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#111827]">
                        {ex.exercise_name || ex.name}
                      </p>
                      <p className="text-xs text-[#6B7280]">
                        {ex.sets ? `${ex.sets} sets` : ""}{" "}
                        {ex.reps ? `· ${ex.reps} reps` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionLink>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <Quick to="/app/fitness/food/water" label="Water tracker" />
            <Quick to="/app/fitness/workout" label="Browse workouts" />
            <Quick to="/app/fitness/recipes" label="All recipes" />
            <Quick to="/app/fitness/food" label="Food & macros" />
          </div>

          <SectionLink title="Saved recipes" to="/app/fitness/recipes/saved">
            {recipes.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No saved recipes yet.</p>
            ) : (
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1">
                {recipes.map((r) => {
                  const id = r.id || r.recipe_id
                  return (
                    <Link
                      key={id}
                      to={`/app/fitness/recipes/${id}`}
                      className="w-36 shrink-0 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white"
                    >
                      <img
                        src={fitnessImage(r.image_url || r.image || r.thumbnail)}
                        alt=""
                        className="h-24 w-full object-cover"
                      />
                      <p className="truncate px-2 py-2 text-xs font-medium text-[#111827]">
                        {r.title || r.name}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}
          </SectionLink>
        </>
      )}
    </FitnessShell>
  )
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
      <Icon size={16} className="text-[#10B981]" />
      <p className="mt-2 text-lg font-bold text-[#111827]">{value}</p>
      <p className="text-[11px] font-medium text-[#374151]">{label}</p>
      <p className="text-[10px] text-[#9CA3AF]">{hint}</p>
    </div>
  )
}

function SectionLink({ title, to, action = "See all", children }) {
  return (
    <section className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
        {to ? (
          <Link to={to} className="flex items-center gap-0.5 text-xs font-semibold text-[#10B981]">
            {action} <ChevronRight size={14} />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function Quick({ to, label }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-sm font-medium text-[#111827] shadow-sm hover:border-[#10B981]/40"
    >
      {label}
    </Link>
  )
}