import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Droplets, Loader2, Plus, Search, Trash2, RefreshCw, CheckCircle, AlertCircle  } from "lucide-react"
import {
  createMeal,
  deleteLastHydrationLog,
  deleteMeal,
  fetchFavoriteMeals,
  fetchFoodHomeDashboard,
  fetchHydrationGoal,
  fetchHydrationToday,
  fetchMeals,
  MEAL_TYPES,
  postHydrationLog,
  putHydrationGoal,
  searchFood,
  toggleMealFavorite,
} from "../../api/fitness"
import { FitnessShell } from "./FitnessShell"
import { FitnessGateLoader, useFitnessGate } from "./useFitnessGate"
// WaterProgress Component - add this before the FitnessWater component
function WaterProgress({ intake, goal, size = 200, strokeWidth = 20 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference; // Full circle
  const progress = Math.min(intake / Math.max(goal, 1), 1);
  const progressLength = arcLength * progress;
  const rotation = 90;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Gray background arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#DDD"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(${180 + 90} ${center} ${center})`}
        />

        {/* Green progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#10b981"
          strokeWidth={strokeWidth}
          strokeDasharray={`${progressLength} ${circumference}`}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(${rotation} ${center} ${center})`}
          className="transition-all duration-700 ease-in-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold text-[#111827]">
          {Math.round(progress * 100)}%
        </p>
        <p className="text-sm text-[#6B7280]">
          {(intake / 1000).toFixed(1)}L / {(goal / 1000).toFixed(1)}L
        </p>
      </div>
    </div>
  );
}
export default function FitnessFood() {
  const { ready, auth } = useFitnessGate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      setData(await fetchFoodHomeDashboard(auth))
    } catch (err) {
      setError(err.message || "Failed to load food hub")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ready) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, auth?.token])

  const needs = data?.needs || {}
  const mealsToday = data?.mealsToday || {}
  const calorieGoal =
    needs?.calories || needs?.calorie_goal || needs?.daily_calories || 2000
  const proteinGoal = needs?.protein_g || needs?.protein || 100
  const carbsGoal = needs?.carbs_g || needs?.carbs || 200
  const fatGoal = needs?.fat_g || needs?.fat || 60

  const byMeal = useMemo(() => {
    const list =
      mealsToday?.meals ||
      mealsToday?.items ||
      (Array.isArray(mealsToday) ? mealsToday : [])
    const map = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 }
    list.forEach((m) => {
      const type = String(m.meal_type || m.type || "").toLowerCase()
      const cals = Number(m.calories || m.calorie || 0)
      if (map[type] != null) map[type] += cals
      else map.snacks += cals
    })
    return map
  }, [mealsToday])

  const consumed =
    byMeal.breakfast + byMeal.lunch + byMeal.dinner + byMeal.snacks

  if (!ready) {
    return (
      <FitnessShell title="Food">
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  return (
    <FitnessShell title="Food">
      {loading ? (
        <div className="flex justify-center py-16 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : (
        <>
          <div className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#6B7280]">Calories today</p>
            <p className="mt-1 text-3xl font-bold text-[#111827]">
              {Math.round(consumed)}
              <span className="text-base font-medium text-[#9CA3AF]">
                {" "}
                / {Math.round(Number(calorieGoal))}
              </span>
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <Macro label="Protein" value={proteinGoal} unit="g" />
              <Macro label="Carbs" value={carbsGoal} unit="g" />
              <Macro label="Fat" value={fatGoal} unit="g" />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            {MEAL_TYPES.map((type) => (
              <div
                key={type}
                className="rounded-xl border border-[#E5E7EB] bg-white p-3 capitalize shadow-sm"
              >
                <p className="text-xs text-[#6B7280]">{type}</p>
                <p className="text-lg font-semibold text-[#111827]">
                  {Math.round(byMeal[type] || 0)} kcal
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Quick to="/app/fitness/food/add" label="Add food" />
            <Quick to="/app/fitness/food/water" label="Water tracker" />
            <Quick to="/app/fitness/food/meals" label="My meals" />
            <Quick to="/app/fitness/food/favorites" label="Favorites" />
            <Quick to="/app/fitness/recipes" label="Recipes" />
            <Quick to="/app/fitness/swaps" label="Healthy swaps" />
            <Quick to="/app/fitness/dietitians" label="Dietitians" />
            <Quick to="/app/fitness/plans" label="My plans" />
          </div>
        </>
      )}
    </FitnessShell>
  )
}

function Macro({ label, value, unit }) {
  return (
    <div className="rounded-lg bg-[#ECFDF5] px-2 py-2">
      <p className="font-semibold text-[#065F46]">
        {Math.round(Number(value) || 0)}
        {unit}
      </p>
      <p className="text-[#6B7280]">{label}</p>
    </div>
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

export function FitnessWater() {
  const { ready, auth } = useFitnessGate()
  const [goal, setGoal] = useState(2000)
  const [consumed, setConsumed] = useState(0)
  const [entries, setEntries] = useState([])
  const [customAmount, setCustomAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingGoal, setLoadingGoal] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const [g, today] = await Promise.all([
        fetchHydrationGoal(auth),
        fetchHydrationToday(auth),
      ])
      const goalMl = g?.daily_ml || g?.goal_ml || g?.data?.daily_ml || 2000
      setGoal(Number(goalMl) || 2000)
      
      // Parse entries and consumed
      const logs = today?.logs || today?.entries || []
      setEntries(logs)
      const totalConsumed = logs.reduce((sum, entry) => sum + Number(entry.amount || entry.amount_ml || 0), 0)
      setConsumed(totalConsumed)
    } catch (err) {
      setError(err.message || "Failed to load water tracker")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ready) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, auth?.token])

  const add = async (ml) => {
    if (isAdding) return
    setIsAdding(true)
    setError("")
    setSuccess("")
    
    try {
      if (consumed >= goal) {
        setError("Today's water intake done")
        setIsAdding(false)
        return
      }
      await postHydrationLog(auth, ml)
      setSuccess(`Added ${ml}ml ✓`)
      await load()
    } catch (err) {
      setError(err.message || "Failed to log water")
    } finally {
      setIsAdding(false)
    }
  }

  const undo = async () => {
    if (isDeleting || entries.length === 0) return
    setIsDeleting(true)
    setError("")
    setSuccess("")
    
    try {
      await deleteLastHydrationLog(auth)
      setSuccess("Last entry removed ✓")
      await load()
    } catch (err) {
      setError(err.message || "Failed to undo")
    } finally {
      setIsDeleting(false)
    }
  }

  const saveGoal = async () => {
    if (loadingGoal) return
    setLoadingGoal(true)
    setError("")
    setSuccess("")
    
    try {
      await putHydrationGoal(auth, Number(goal))
      setSuccess("Goal updated ✓")
      await load()
    } catch (err) {
      setError(err.message || "Failed to update goal")
    } finally {
      setLoadingGoal(false)
    }
  }

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount)
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount")
      return
    }
    add(amount)
    setCustomAmount("")
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const pct = Math.min(100, Math.round((consumed / Math.max(goal, 1)) * 100))
  const remaining = Math.max(goal - consumed, 0)
  const suggestedSip = remaining <= 0 ? 0 : Math.min(remaining, 250)

  if (!ready) {
    return (
      <FitnessShell title="Water tracker" backTo="/app/fitness/food" showTabs={false}>
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  return (
    <FitnessShell title="Water tracker" backTo="/app/fitness/food" showTabs={false}>
      {loading ? (
        <div className="flex justify-center py-16 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle size={18} />
              {success}
            </div>
          )}

          {/* Circular Progress - Matches React Native exactly */}
          <div className="flex flex-col items-center rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <WaterProgress
              intake={consumed}
              goal={goal}
              size={Math.min(window.innerWidth * 0.7, 300)}
              strokeWidth={30}
            />
            
            <div className="mt-4 text-center">
              <p className="text-3xl font-bold text-[#111827]">
                {consumed} ml
              </p>
              <p className="text-sm text-[#6B7280]">
                of {goal} ml goal · {pct}%
              </p>
              {loading ? (
                <p className="text-sm text-[#6B7280]">Syncing…</p>
              ) : remaining <= 0 ? (
                <p className="text-sm font-semibold text-[#10B981]">Goal reached 🎉</p>
              ) : (
                <p className="text-sm text-[#6B7280]">
                  Drink ~{Math.round(suggestedSip)} ml now
                </p>
              )}
            </div>
          </div>

          {/* Daily Goal Section */}
          <div className="rounded-xl bg-[#F8F9FA] p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-[#333]">Daily Goal</p>
              {loadingGoal && <Loader2 className="animate-spin" size={16} color="#007AFF" />}
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#10b981]">
                {loadingGoal ? "Calculating..." : `${goal} ml`}
              </p>
              {!loadingGoal && (
                <p className="text-xs text-[#666]">Personalized based on your profile</p>
              )}
            </div>
          </div>

          {/* Quick Add Header */}
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold">Quick Add</p>
            <button
              type="button"
              onClick={undo}
              disabled={isDeleting || entries.length === 0}
              className="text-sm font-medium text-[#000] disabled:opacity-40"
            >
              {isDeleting ? <Loader2 className="animate-spin" size={16} /> : "Remove Last"}
            </button>
          </div>

          {/* Quick Add Buttons */}
          {remaining <= 0 ? (
            <div className="rounded-xl bg-[#10b981] p-4 text-center">
              <p className="text-sm font-bold text-white">Today's water intake done</p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[250, 500, 750].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => add(item)}
                  disabled={isAdding}
                  className="flex-shrink-0 rounded-lg bg-[#d1fae5] px-4 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  {isAdding ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    `Add ${item} ml`
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Custom Amount Input - NEW */}
          <div className="flex gap-2">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="Custom ml"
              className="flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981]"
              min="1"
            />
            <button
              type="button"
              onClick={handleCustomAdd}
              disabled={isAdding || !customAmount}
              className="rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {isAdding ? <Loader2 className="animate-spin" size={16} /> : "Add"}
            </button>
          </div>

          {/* Goal Setting - NEW */}
          <div className="flex gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3">
            <input
              type="number"
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value.replace(/\D/g, "")) || 0)}
              className="flex-1 outline-none text-sm"
              min="500"
              max="10000"
            />
            <button
              type="button"
              onClick={saveGoal}
              disabled={loadingGoal}
              className="text-sm font-semibold text-[#10B981] disabled:opacity-40"
            >
              {loadingGoal ? <Loader2 className="animate-spin" size={16} /> : "Set goal"}
            </button>
          </div>

          {/* Added Section */}
          <p className="text-sm font-semibold py-2">Added</p>

          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : entries.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-4">No water added yet</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {entries.slice(0, 20).map((entry, index) => (
                <div
                  key={entry.id || index}
                  className="flex-shrink-0 rounded-lg bg-[#d1fae5] px-4 py-3 text-center min-w-[100px]"
                >
                  <p className="text-sm font-semibold">Added {entry.amount || entry.amount_ml || 0} ml</p>
                  <p className="text-xs text-[#555]">
                    {entry.time ? new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-sm font-bold text-[#333] py-4">
            Water is life — drink enough 💧
          </p>
        </div>
      )}
    </FitnessShell>
  )
}
export function FitnessAddFood() {
  const navigate = useNavigate()
  const { ready, auth } = useFitnessGate()
  const [q, setQ] = useState("")
  const [results, setResults] = useState([])
  const [mealType, setMealType] = useState("breakfast")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!ready || q.trim().length < 2) {
      setResults([])
      return undefined
    }
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const list = await searchFood(auth, q.trim())
        if (!cancelled) setResults(list)
      } catch (err) {
        if (!cancelled) setError(err.message || "Search failed")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, ready, auth])

  const addFood = async (food) => {
    setSaving(true)
    setError("")
    try {
      await createMeal(auth, {
        meal_type: mealType,
        name: food.name || food.food_name || food.title,
        food_id: food.id || food.food_id,
        calories: Number(food.calories || food.calorie || food.energy || 0),
        protein_g: Number(food.protein || food.protein_g || 0),
        carbs_g: Number(food.carbs || food.carbs_g || food.carbohydrates || 0),
        fat_g: Number(food.fat || food.fat_g || 0),
        quantity: 1,
        unit: food.unit || "serving",
      })
      navigate("/app/fitness/food/meals")
    } catch (err) {
      setError(err.message || "Failed to add meal")
    } finally {
      setSaving(false)
    }
  }

  if (!ready) {
    return (
      <FitnessShell title="Add food" backTo="/app/fitness/food" showTabs={false}>
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  return (
    <FitnessShell title="Add food" backTo="/app/fitness/food" showTabs={false}>
      <div className="mb-3 flex flex-wrap gap-2">
        {MEAL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setMealType(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              mealType === t
                ? "bg-[#10B981] text-white"
                : "bg-white text-[#374151] ring-1 ring-[#E5E7EB]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search foods"
          className="w-full rounded-xl border border-[#E5E7EB] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#10B981]"
        />
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-10 text-[#10B981]">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <ul className="space-y-2">
          {results.map((food) => {
            const id = food.id || food.food_id || food.name
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#111827]">
                    {food.name || food.food_name || food.title}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {Math.round(Number(food.calories || food.calorie || 0))} kcal
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => addFood(food)}
                  className="rounded-lg bg-[#10B981] p-2 text-white disabled:opacity-50"
                >
                  <Plus size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </FitnessShell>
  )
}

export function FitnessMeals() {
  const { ready, auth } = useFitnessGate()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      setMeals(await fetchMeals(auth))
    } catch (err) {
      setError(err.message || "Failed to load meals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ready) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, auth?.token])

  const remove = async (id) => {
    try {
      await deleteMeal(auth, id)
      await load()
    } catch (err) {
      setError(err.message || "Failed to delete")
    }
  }

  const fav = async (meal) => {
    try {
      await toggleMealFavorite(auth, meal.id, !meal.is_favorite)
      await load()
    } catch (err) {
      setError(err.message || "Failed to update favorite")
    }
  }

  if (!ready) {
    return (
      <FitnessShell title="My meals" backTo="/app/fitness/food" showTabs={false}>
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  return (
    <FitnessShell title="My meals" backTo="/app/fitness/food" showTabs={false}>
      {loading ? (
        <div className="flex justify-center py-16 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : meals.length === 0 ? (
        <p className="text-center text-sm text-[#6B7280]">No meals logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {meals.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#111827]">{m.name || m.food_name}</p>
                <p className="text-xs capitalize text-[#6B7280]">
                  {m.meal_type} · {Math.round(Number(m.calories || 0))} kcal
                </p>
              </div>
              <button
                type="button"
                onClick={() => fav(m)}
                className="text-xs font-semibold text-[#10B981]"
              >
                {m.is_favorite ? "Unfav" : "Fav"}
              </button>
              <button type="button" onClick={() => remove(m.id)} className="text-red-600">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </FitnessShell>
  )
}

export function FitnessFavoriteMeals() {
  const { ready, auth } = useFitnessGate()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready) return
    ;(async () => {
      try {
        setMeals(await fetchFavoriteMeals(auth))
      } finally {
        setLoading(false)
      }
    })()
  }, [ready, auth])

  if (!ready) {
    return (
      <FitnessShell title="Favorites" backTo="/app/fitness/food" showTabs={false}>
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  return (
    <FitnessShell title="Favorites" backTo="/app/fitness/food" showTabs={false}>
      {loading ? (
        <div className="flex justify-center py-16 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : meals.length === 0 ? (
        <p className="text-center text-sm text-[#6B7280]">No favorite meals.</p>
      ) : (
        <ul className="space-y-2">
          {meals.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-3"
            >
              <p className="font-medium text-[#111827]">{m.name || m.food_name}</p>
              <p className="text-xs text-[#6B7280]">
                {Math.round(Number(m.calories || 0))} kcal
              </p>
            </li>
          ))}
        </ul>
      )}
    </FitnessShell>
  )
}
