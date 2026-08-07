import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Droplets, Loader2, Plus, Search, Trash2, RefreshCw, CheckCircle, AlertCircle, X, Minus, ChevronDown, Heart } from "lucide-react"
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
  todayIstKey,
} from "../../api/fitness"
import { FitnessShell } from "./FitnessShell"
import { FitnessGateLoader, useFitnessGate } from "./useFitnessGate"

// ================================================================
// 1. WaterProgress Component
// ================================================================
function WaterProgress({ intake, goal, size = 200, strokeWidth = 20 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference;
  const progress = Math.min(intake / Math.max(goal, 1), 1);
  const progressLength = arcLength * progress;
  const rotation = 90;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
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

// ================================================================
// 2. FitnessFood – main dashboard (unchanged)
// ================================================================
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
  }, [ready, auth?.token])

  const needs = data?.needs || {}
  const mealsToday = data?.mealsToday || {}
  const calorieGoal = needs?.calories || needs?.calorie_goal || needs?.daily_calories || 2000
  const proteinGoal = needs?.protein_g || needs?.protein || 100
  const carbsGoal = needs?.carbs_g || needs?.carbs || 200
  const fatGoal = needs?.fat_g || needs?.fat || 60

  const byMeal = useMemo(() => {
    const list = mealsToday?.meals || mealsToday?.items || (Array.isArray(mealsToday) ? mealsToday : [])
    const map = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 }
    list.forEach((m) => {
      const type = String(m.meal_type || m.type || "").toLowerCase()
      const cals = Number(m.calories || m.calorie || 0)
      if (map[type] != null) map[type] += cals
      else map.snacks += cals
    })
    return map
  }, [mealsToday])

  const consumed = byMeal.breakfast + byMeal.lunch + byMeal.dinner + byMeal.snacks

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

// ================================================================
// 3. FitnessWater (unchanged)
// ================================================================
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

          <p className="text-center text-sm font-bold text-[#333] py-4">
            Water is life — drink enough 💧
          </p>
        </div>
      )}
    </FitnessShell>
  )
}

// ================================================================
// 4. FitnessAddFood – Enhanced with meal builder and fixed save
// ================================================================

// ----- Helper functions for food type detection (copied from RN) -----
const LIQUID_KEYWORDS = [
  'milk', 'juice', 'water', 'coffee', 'tea', 'lassi', 'buttermilk', 'chaas',
  'soup', 'shake', 'smoothie', 'drink', 'beverage', 'curd', 'yogurt', 'oil',
  'ghee', 'coconut water', 'nimbu pani', 'sharbat', 'thandai', 'aam panna',
  'jaljeera', 'cola', 'soda', 'beer', 'wine', 'whiskey', 'rum', 'vodka',
  'liquor', 'broth', 'stock', 'sauce', 'syrup', 'honey', 'dahi', 'raita'
]
const COUNTABLE_KEYWORDS = [
  'egg', 'roti', 'chapati', 'paratha', 'bread', 'biscuit', 'cookie', 'banana',
  'apple', 'orange', 'samosa', 'pakora', 'idli', 'dosa', 'vada', 'puri',
  'bhatura', 'naan', 'kulcha', 'toast', 'sandwich', 'burger', 'pizza slice',
  'momos', 'dumpling', 'spring roll', 'cutlet', 'tikki', 'ladoo', 'laddu',
  'gulab jamun', 'rasgulla', 'jalebi', 'barfi', 'peda', 'modak', 'kachori',
  'mathri', 'gujiya', 'chicken piece', 'chicken leg', 'drumstick', 'wing',
  'thigh', 'breast piece', 'mutton piece', 'fish piece', 'prawn', 'shrimp',
  'paneer cube', 'potato', 'tomato', 'onion', 'cucumber', 'carrot', 'mango',
  'papaya slice', 'watermelon slice', 'guava', 'grape', 'cherry', 'strawberry',
  'almond', 'cashew', 'walnut', 'peanut', 'pistachio', 'date', 'fig', 'raisin'
]

const isLiquidFood = (food) => {
  const name = (food?.name || '').toLowerCase()
  const servingSize = (food?.nutrition_per_serving?.serving_size || '').toLowerCase()
  if (servingSize.includes('ml')) return true
  return LIQUID_KEYWORDS.some(keyword => name.includes(keyword))
}

const isCountableFood = (food) => {
  const name = (food?.name || '').toLowerCase()
  const servingSize = (food?.nutrition_per_serving?.serving_size || '').toLowerCase()
  if (/\d+\s*(piece|pcs|unit|slice|egg|roti|chapati|idli|dosa|vada)/i.test(servingSize)) return true
  return COUNTABLE_KEYWORDS.some(keyword => name.includes(keyword))
}

const extractUnitFromServing = (servingSize, foodName) => {
  const match = servingSize.match(/^\d+\s+([^(]+)/)
  if (match) return match[1].trim()
  const nameLower = foodName.toLowerCase()
  if (nameLower.includes('egg')) return 'Egg'
  if (nameLower.includes('roti') || nameLower.includes('chapati')) return 'Piece'
  if (nameLower.includes('idli')) return 'Idli'
  if (nameLower.includes('dosa')) return 'Dosa'
  if (nameLower.includes('paratha')) return 'Paratha'
  if (nameLower.includes('banana')) return 'Banana'
  if (nameLower.includes('apple')) return 'Apple'
  if (nameLower.includes('samosa')) return 'Samosa'
  if (nameLower.includes('slice')) return 'Slice'
  return 'Piece'
}

const parseServingOptions = (food) => {
  const isLiquid = isLiquidFood(food)
  const isCountable = isCountableFood(food)
  const servingSize = food.nutrition_per_serving?.serving_size || ''
  const foodName = food.name || ''

  if (isLiquid) {
    return [
      { unit: "ml", unit_display: "ml", unit_display_plural: "ml", grams_equivalent: 1, is_default: true, food_type: "liquid" }
    ]
  }
  if (isCountable) {
    let unitName = extractUnitFromServing(servingSize, foodName)
    let gramsPerUnit = 50
    const gramsMatch = servingSize.match(/\((\d+\.?\d*)\s*g\)/i)
    const countMatch = servingSize.match(/^(\d+)/)
    if (gramsMatch && countMatch) {
      const totalGrams = parseFloat(gramsMatch[1])
      const count = parseFloat(countMatch[1])
      gramsPerUnit = totalGrams / count
    }
    return [
      { unit: "piece", unit_display: unitName, unit_display_plural: `${unitName}s`, grams_equivalent: gramsPerUnit, is_default: true, food_type: "countable" }
    ]
  }
  const options = [
    { unit: "g", unit_display: "Gram", unit_display_plural: "Grams", grams_equivalent: 1, is_default: true, food_type: "solid" }
  ]
  const match = servingSize.match(/^(\d+)\s+([^(]+)\s*\(([\d.]+)\s*g\)/i)
  if (match) {
    const [, count, unitName, grams] = match
    const gramsPerUnit = parseFloat(grams) / parseFloat(count)
    options.push({
      unit: unitName.trim().toLowerCase(),
      unit_display: unitName.trim(),
      unit_display_plural: `${unitName.trim()}s`,
      grams_equivalent: gramsPerUnit,
      is_default: false,
      food_type: "solid"
    })
  }
  return options
}

const QUICK_SUGGESTIONS = ["Egg", "Poha", "Oats", "Roti", "Rice", "Dal", "Chicken", "Milk", "Banana", "Paneer"]

// ----- The enhanced component -----
export function FitnessAddFood() {
  const navigate = useNavigate()
  const { ready, auth } = useFitnessGate()
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const [selectedFood, setSelectedFood] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [quantity, setQuantity] = useState("1")
  const [mealType, setMealType] = useState("breakfast")

  const [addedMeals, setAddedMeals] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState("")

  // Debounced search
  const debounceTimeout = useRef(null)
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current)

    if (!search.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    debounceTimeout.current = setTimeout(async () => {
      try {
        const results = await searchFood(auth, search.trim())
        setSearchResults(results || [])
      } catch (err) {
        console.error("Search error:", err)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 350)

    return () => clearTimeout(debounceTimeout.current)
  }, [search, auth])

  const handleQuickSuggestion = (suggestion) => {
    setSearch(suggestion)
    setShowModal(true)
  }

  const handleSelectFood = (food) => {
    setSelectedFood(food)
    setShowModal(false)
    setSearch("")
    const options = parseServingOptions(food)
    const defaultUnit = options.find(u => u.is_default) || options[0]
    if (defaultUnit) {
      setSelectedUnit(defaultUnit)
      if (defaultUnit.food_type === 'liquid' || defaultUnit.unit === 'ml') setQuantity("100")
      else if (defaultUnit.food_type === 'countable' || defaultUnit.unit === 'piece') setQuantity("1")
      else setQuantity("100")
    }
  }

  const handleAddMeal = () => {
    if (!selectedFood || !selectedUnit) return
    const qty = parseFloat(quantity) || 0
    if (qty <= 0) return

    const gramsEquivalent = selectedUnit.grams_equivalent || 100
    const totalGrams = qty * gramsEquivalent
    const factor = totalGrams / 100
    const nutrition = {
      calories: Math.round((selectedFood.calories_per_100g || 0) * factor),
      protein: Math.round((selectedFood.protein_g_per_100g || 0) * factor * 10) / 10,
      carbs: Math.round((selectedFood.carbs_g_per_100g || 0) * factor * 10) / 10,
      fat: Math.round((selectedFood.fat_g_per_100g || 0) * factor * 10) / 10,
      totalGrams
    }

    const newMeal = {
      id: Date.now(),
      food: selectedFood,
      quantity: qty,
      unit: selectedUnit,
      nutrition,
    }
    setAddedMeals([...addedMeals, newMeal])
    setSelectedFood(null)
    setSelectedUnit(null)
    setQuantity("1")
  }

  const handleRemoveMeal = (id) => {
    setAddedMeals(addedMeals.filter(m => m.id !== id))
  }

  const totalNutrition = useMemo(() => {
    return addedMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.nutrition?.calories || 0),
        protein: acc.protein + (m.nutrition?.protein || 0),
        carbs: acc.carbs + (m.nutrition?.carbs || 0),
        fat: acc.fat + (m.nutrition?.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [addedMeals])

  // ✅ FIXED: added 'day' field and correct unit
  const handleSaveMeal = async () => {
    if (addedMeals.length === 0) {
      setSaveError("Please add at least one food item.")
      return
    }
    setSaving(true)
    setSaveError("")
    setSaveSuccess("")
    try {
      const day = todayIstKey()
      for (const meal of addedMeals) {
        const body = {
          meal_type: mealType,
          day,
          food_name: meal.food.name || meal.food.food_name || "",
          food_id: meal.food.id,
          calories: meal.nutrition.calories,
          protein_g: meal.nutrition.protein,
          carbs_g: meal.nutrition.carbs,
          fat_g: meal.nutrition.fat,
          quantity: Number(meal.quantity) || 0,
          unit: meal.unit.unit || meal.unit.unit_display || "g",
          amount_grams: Math.round(meal.nutrition.totalGrams || 0),
          food_type: meal.unit.food_type || "solid",
        }
        await createMeal(auth, body)
      }
      setSaveSuccess("Meal saved successfully!")
      setTimeout(() => navigate("/app/fitness/food/meals"), 800)
    } catch (err) {
      console.error("Save error:", err)
      setSaveError(err.message || "Failed to save meal")
    } finally {
      setSaving(false)
    }
  }

  const incrementQuantity = () => setQuantity(prev => String((parseFloat(prev) || 0) + 1))
  const decrementQuantity = () => {
    const val = parseFloat(quantity) || 0
    if (val > 1) setQuantity(String(val - 1))
  }

  const formatMealQuantity = (meal) => {
    const qty = meal.quantity
    const unit = meal.unit
    if (unit.food_type === 'liquid' || unit.unit === 'ml') return `${qty} ml`
    if (unit.food_type === 'countable' || unit.unit === 'piece') {
      return `${qty} ${qty === 1 ? unit.unit_display : unit.unit_display_plural}`
    }
    if (unit.unit === 'cup' || unit.unit === 'glass') {
      return `${qty} ${qty === 1 ? unit.unit_display : unit.unit_display_plural}`
    }
    return `${qty} g`
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Meal type selector */}
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMealType(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${
                mealType === t
                  ? "bg-[#10B981] text-white"
                  : "bg-white text-[#374151] ring-1 ring-[#E5E7EB]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search card */}
        <div className="relative">
          <div
            className="flex items-center bg-white rounded-xl border border-[#E5E7EB] px-4 py-3 cursor-pointer hover:border-[#10B981] transition"
            onClick={() => setShowModal(true)}
          >
            <Search size={18} className="text-gray-400 mr-3" />
            <span className="flex-1 text-sm text-gray-500">
              {selectedFood ? selectedFood.name : "Search food..."}
            </span>
            {selectedFood ? (
              <X
                size={18}
                className="text-gray-400 cursor-pointer hover:text-gray-600"
                onClick={(e) => { e.stopPropagation(); setSelectedFood(null); setSelectedUnit(null); setQuantity("1"); }}
              />
            ) : (
              <ChevronDown size={18} className="text-gray-400" />
            )}
          </div>
        </div>

        {/* Quick suggestions */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Popular Foods</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleQuickSuggestion(item)}
                className="flex items-center gap-1 rounded-full bg-[#ECFDF5] px-3 py-1.5 text-sm font-medium text-[#065F46] border border-[#D1FAE5] hover:bg-[#D1FAE5] transition"
              >
                <span>🍽️</span> {item}
              </button>
            ))}
          </div>
        </div>

        {/* Selected food detail card */}
        {selectedFood && selectedUnit && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-[#ECFDF5] text-[#10B981] text-xs font-semibold px-2 py-1 rounded">
                  {selectedUnit.food_type === 'liquid' ? 'ml' :
                   selectedUnit.food_type === 'countable' ? 'qty' : 'food'}
                </span>
                <span className="font-semibold text-lg">{selectedFood.name}</span>
              </div>
              <button onClick={() => { setSelectedFood(null); setSelectedUnit(null); setQuantity("1"); }}>
                <X size={20} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="flex mt-3 bg-gray-100 rounded-lg p-1">
              {parseServingOptions(selectedFood).map((opt) => (
                <button
                  key={opt.unit}
                  type="button"
                  onClick={() => {
                    setSelectedUnit(opt)
                    if (opt.food_type === 'liquid' || opt.unit === 'ml') setQuantity("100")
                    else if (opt.food_type === 'countable' || opt.unit === 'piece') setQuantity("1")
                    else setQuantity("100")
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-sm font-medium transition ${
                    selectedUnit.unit === opt.unit
                      ? "bg-[#10B981] text-white"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span>
                    {opt.unit === 'ml' ? '💧' :
                     opt.unit === 'g' ? '⚖️' :
                     opt.unit === 'piece' ? '🍳' :
                     opt.unit === 'cup' ? '☕' :
                     opt.unit === 'glass' ? '🥛' :
                     opt.unit === 'bowl' ? '🥣' : '📦'}
                  </span>
                  {opt.unit_display_plural || opt.unit}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {selectedUnit.food_type === 'countable' || selectedUnit.unit === 'piece' || selectedUnit.unit === 'cup' || selectedUnit.unit === 'glass' || selectedUnit.unit === 'bowl' ? (
                <div className="flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={decrementQuantity}
                    className="w-12 h-12 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#10B981] text-2xl hover:bg-[#D1FAE5] transition"
                  >
                    <Minus size={24} />
                  </button>
                  <div className="text-center">
                    <span className="text-4xl font-bold">{quantity}</span>
                    <span className="text-sm text-gray-500 ml-1">
                      {parseFloat(quantity) === 1 ? selectedUnit.unit_display : selectedUnit.unit_display_plural}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={incrementQuantity}
                    className="w-12 h-12 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#10B981] text-2xl hover:bg-[#D1FAE5] transition"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="text-5xl font-bold text-center w-32 bg-transparent outline-none"
                    min="0"
                    step={selectedUnit.unit === 'ml' ? 10 : 5}
                  />
                  <span className="text-2xl text-gray-400">
                    {selectedUnit.unit === 'ml' ? 'ml' : 'g'}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {selectedUnit.food_type === 'liquid' || selectedUnit.unit === 'ml'
                  ? [50, 100, 150, 200, 250, 500].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setQuantity(String(v))}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                          Number(quantity) === v
                            ? "bg-[#10B981] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {v}
                      </button>
                    ))
                  : selectedUnit.food_type === 'countable' || selectedUnit.unit === 'piece'
                    ? [1, 2, 3, 4, 5, 6].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setQuantity(String(v))}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                            Number(quantity) === v
                              ? "bg-[#10B981] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))
                    : [50, 100, 200].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setQuantity(String(v))}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                            Number(quantity) === v
                              ? "bg-[#10B981] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {v}
                        </button>
                      ))
                }
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                ≈ {Math.round(parseFloat(quantity || 0) * (selectedUnit?.grams_equivalent || 0))} {selectedUnit.food_type === 'liquid' ? 'ml' : 'g'}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { label: 'Cal', value: Math.round((selectedFood.calories_per_100g || 0) * (parseFloat(quantity) * (selectedUnit?.grams_equivalent || 0) / 100)) },
                { label: 'Protein', value: ((selectedFood.protein_g_per_100g || 0) * (parseFloat(quantity) * (selectedUnit?.grams_equivalent || 0) / 100)).toFixed(1) },
                { label: 'Carbs', value: ((selectedFood.carbs_g_per_100g || 0) * (parseFloat(quantity) * (selectedUnit?.grams_equivalent || 0) / 100)).toFixed(1) },
                { label: 'Fat', value: ((selectedFood.fat_g_per_100g || 0) * (parseFloat(quantity) * (selectedUnit?.grams_equivalent || 0) / 100)).toFixed(1) },
              ].map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="font-bold text-gray-800">{item.value}</div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddMeal}
              className="w-full mt-4 bg-[#111827] text-white py-3 rounded-xl font-semibold flex items-center justify-between px-4 hover:bg-[#1f2937] transition"
            >
              <span>Add {selectedFood.name}</span>
              <span className="bg-white text-[#111827] rounded-full p-1">
                <Plus size={18} />
              </span>
            </button>
          </div>
        )}

        {/* Added meals list */}
        {addedMeals.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-semibold">Your Meal ({addedMeals.length} items)</span>
            </div>
            <div className="grid grid-cols-[2fr,1.2fr,0.8fr,0.8fr,auto] gap-2 px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-b">
              <span>Food</span>
              <span className="text-center">Qty</span>
              <span className="text-center">Cal</span>
              <span className="text-center">P</span>
              <span className="w-8"></span>
            </div>
            {addedMeals.map((meal) => (
              <div key={meal.id} className="grid grid-cols-[2fr,1.2fr,0.8fr,0.8fr,auto] gap-2 px-4 py-2 items-center border-b hover:bg-gray-50">
                <div>
                  <div className="font-medium text-sm">{meal.food.name}</div>
                  <div className="text-xs text-gray-400">
                    {isLiquidFood(meal.food) ? '🥤 ml' :
                     isCountableFood(meal.food) ? '🍳 qty' : '🍽️ food'}
                  </div>
                </div>
                <div className="text-center text-sm">{formatMealQuantity(meal)}</div>
                <div className="text-center text-sm">{meal.nutrition.calories}</div>
                <div className="text-center text-sm">{meal.nutrition.protein}g</div>
                <button onClick={() => handleRemoveMeal(meal.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <div className="grid grid-cols-[2fr,1.2fr,0.8fr,0.8fr,auto] gap-2 px-4 py-2 bg-gray-100 font-semibold">
              <span>Total</span>
              <span className="text-center">—</span>
              <span className="text-center text-[#10B981]">{totalNutrition.calories}</span>
              <span className="text-center text-[#10B981]">{totalNutrition.protein.toFixed(1)}g</span>
              <span></span>
            </div>
            <div className="flex justify-around py-3 border-t">
              <div className="text-center">
                <div className="font-bold">{totalNutrition.calories}</div>
                <div className="text-xs text-gray-500">kcal</div>
              </div>
              <div className="text-center">
                <div className="font-bold">{totalNutrition.protein.toFixed(1)}g</div>
                <div className="text-xs text-gray-500">Protein</div>
              </div>
              <div className="text-center">
                <div className="font-bold">{totalNutrition.carbs.toFixed(1)}g</div>
                <div className="text-xs text-gray-500">Carbs</div>
              </div>
              <div className="text-center">
                <div className="font-bold">{totalNutrition.fat.toFixed(1)}g</div>
                <div className="text-xs text-gray-500">Fat</div>
              </div>
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t">
          {saveError && <p className="text-sm text-red-600 mb-2">{saveError}</p>}
          {saveSuccess && <p className="text-sm text-green-600 mb-2">{saveSuccess}</p>}
          <button
            type="button"
            disabled={saving || addedMeals.length === 0}
            onClick={handleSaveMeal}
            className="w-full bg-[#10B981] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#059669] disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : null}
            Save Meal {addedMeals.length > 0 && `(${addedMeals.length})`}
          </button>
        </div>
      </div>

      {/* Search Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-xl sm:rounded-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold">Search Foods</span>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={22} />
              </button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type food name..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:border-[#10B981]"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {searching ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#10B981]" size={24} /></div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No foods found</div>
              ) : (
                searchResults.map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center gap-3 py-2 border-b cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSelectFood(food)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isLiquidFood(food) ? 'bg-blue-50' :
                      isCountableFood(food) ? 'bg-yellow-50' : 'bg-green-50'
                    }`}>
                      <span className="text-sm">
                        {isLiquidFood(food) ? '💧' :
                         isCountableFood(food) ? '🍳' : '🍽️'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{food.name}</div>
                      <div className="text-xs text-gray-400">
                        {food.calories_per_100g} kcal • {food.protein_g_per_100g}g protein
                        {isLiquidFood(food) && ' • 🥤'}
                        {isCountableFood(food) && ' • 🍳'}
                      </div>
                    </div>
                    <Plus size={18} className="text-[#10B981]" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </FitnessShell>
  )
}

// ================================================================
// 5. FitnessMeals (unchanged)
// ================================================================
// ================================================================
// 5. FitnessMeals – delete icon removed
// ================================================================
export function FitnessMeals() {
  const { ready, auth } = useFitnessGate()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null)

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
  }, [ready, auth?.token])

  // remove function is kept but no longer called
  // const remove = async (id) => { ... }

  const fav = async (meal) => {
    if (favoriteLoadingId === meal.id) return

    const nextFavorite = !meal.is_favorite
    setFavoriteLoadingId(meal.id)
    setError("")
    setMeals((prev) =>
      prev.map((item) =>
        item.id === meal.id ? { ...item, is_favorite: nextFavorite } : item,
      ),
    )

    try {
      await toggleMealFavorite(auth, meal.id, nextFavorite)
      await load()
    } catch (err) {
      setMeals((prev) =>
        prev.map((item) =>
          item.id === meal.id ? { ...item, is_favorite: meal.is_favorite } : item,
        ),
      )
      setError(err.message || "Failed to update favorite")
    } finally {
      setFavoriteLoadingId(null)
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
        <div className="grid grid-cols-2 gap-3">
          {meals.map((m) => (
            <div
              key={m.id}
              className="flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#111827]">{m.name || m.food_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#065F46]">
                      {m.meal_type || "meal"}
                    </span>
                    <span className="text-[11px] text-[#6B7280]">
                      {Math.round(Number(m.calories || 0))} kcal
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fav(m)}
                    disabled={favoriteLoadingId === m.id}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border ${m.is_favorite ? "border-[#FBCFE8] bg-[#FFF1F2] text-[#EC4899]" : "border-[#E5E7EB] bg-white text-[#9CA3AF]"}`}
                  >
                    {favoriteLoadingId === m.id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Heart size={14} fill={m.is_favorite ? "currentColor" : "none"} />
                    )}
                  </button>
                  {/* ❌ Delete button removed */}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#F9FAFB] px-2 py-2">
                  <p className="text-[11px] font-semibold text-[#111827]">{Math.round(Number(m.protein_g || m.protein || 0))}g</p>
                  <p className="text-[10px] text-[#6B7280]">Protein</p>
                </div>
                <div className="rounded-lg bg-[#F9FAFB] px-2 py-2">
                  <p className="text-[11px] font-semibold text-[#111827]">{Math.round(Number(m.carbs_g || m.carbs || 0))}g</p>
                  <p className="text-[10px] text-[#6B7280]">Carbs</p>
                </div>
                <div className="rounded-lg bg-[#F9FAFB] px-2 py-2">
                  <p className="text-[11px] font-semibold text-[#111827]">{Math.round(Number(m.fat_g || m.fat || 0))}g</p>
                  <p className="text-[10px] text-[#6B7280]">Fat</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </FitnessShell>
  )
}

// ================================================================
// 6. FitnessFavoriteMeals (unchanged)
// ================================================================
const FAVORITE_TABS = ["Breakfast", "Lunch", "Dinner", "Snacks"]

function titleCaseMeal(mealType = "") {
  const value = String(mealType || "").toLowerCase()
  if (value === "breakfast") return "Breakfast"
  if (value === "lunch") return "Lunch"
  if (value === "dinner") return "Dinner"
  if (value === "snacks" || value === "snack") return "Snacks"
  return "Other"
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