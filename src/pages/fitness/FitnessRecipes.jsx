import { useEffect, useState, useCallback, useRef } from "react"
import { Link, useParams } from "react-router-dom"
import { Heart, Loader2, Search, X, Clock, Users, Utensils, Flame, ChevronLeft } from "lucide-react"
import {
  fetchHealthySwaps,
  fetchRecipe,
  fetchSavedRecipes,
  fetchUserPlans,
  fitnessImage,
  patchUserPlanStatus,
  deleteUserPlan,
  saveRecipe,
  unsaveRecipe,
  MEAL_TYPES,
} from "../../api/fitness"
import { FitnessShell } from "./FitnessShell"
import { FitnessGateLoader, useFitnessGate } from "./useFitnessGate"

// ------------------------------------------------------------------
// 1. Helper functions
// ------------------------------------------------------------------

const recipeMealToTab = (recipe) => {
  const raw = String(
    recipe?.meal_type || recipe?.mealType || recipe?.category || recipe?.type || ""
  ).toLowerCase()
  if (raw === "breakfast") return "Breakfast"
  if (raw === "lunch") return "Lunch"
  if (raw === "dinner") return "Dinner"
  if (raw === "snacks" || raw === "snack") return "Snacks"
  return null
}

const MEAL_TABS = ["Breakfast", "Lunch", "Dinner", "Snacks"]

// Set your API base URL here – same as used in React Native
const FITNESS_BASE_URL = import.meta.env?.VITE_FITNESS_BASE
const PAGE_LIMIT = 200

// ------------------------------------------------------------------
// 2. Main Recipes List (with search, tabs, pagination)
// ------------------------------------------------------------------

export default function FitnessRecipes() {
  const { ready, auth } = useFitnessGate()
  const [allRecipes, setAllRecipes] = useState([])
  const [filteredRecipes, setFilteredRecipes] = useState([])
  const [selectedMealTab, setSelectedMealTab] = useState("Breakfast")
  const [searchTerm, setSearchTerm] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const allRecipesRef = useRef([])
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const isLoadingMoreRef = useRef(false)

  // Fetch a page of recipes using native fetch (matches React Native API call)
  const fetchRecipesPage = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)

      const token = auth?.token
      const refreshToken = auth?.refreshToken

      if (!token) {
        setError("Authentication failed. Please login again.")
        return
      }

      const url = `${FITNESS_BASE_URL}/recipes/public/all?page=${pageNum}&limit=${PAGE_LIMIT}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-REFRESH-TOKEN": refreshToken || "",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.message || `HTTP ${response.status}`)
      }

      const responseData = await response.json()

      // Parse recipes – adapt if your API structure differs
      let pageRecipes = []
      if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
        pageRecipes = responseData.data.data
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        pageRecipes = responseData.data
      } else if (Array.isArray(responseData)) {
        pageRecipes = responseData
      } else if (responseData?.recipes && Array.isArray(responseData.recipes)) {
        pageRecipes = responseData.recipes
      }

      const pagination = responseData?.data?.pagination || responseData?.pagination || null
      const nextHasMore = pagination?.hasNextPage ?? (pageNum < (pagination?.totalPages ?? pageNum))

      const nextAll = append
        ? [...allRecipesRef.current, ...pageRecipes]
        : pageRecipes

      allRecipesRef.current = nextAll
      setAllRecipes(nextAll)
      pageRef.current = pageNum
      hasMoreRef.current = nextHasMore
      setHasMore(nextHasMore)

      // If not searching, filter by selected tab
      if (!isSearching) {
        const filtered = nextAll.filter(r => recipeMealToTab(r) === selectedMealTab)
        setFilteredRecipes(filtered)
      }
    } catch (err) {
      console.error("Error fetching recipes:", err)
      setError(err.message || "Failed to load recipes")
    } finally {
      setLoading(false)
      setLoadingMore(false)
      isLoadingMoreRef.current = false
    }
  }, [auth, selectedMealTab, isSearching])

  // Initial load
  useEffect(() => {
    if (!ready) return
    fetchRecipesPage(1, false)
  }, [ready, fetchRecipesPage])

  // Re‑filter when tab changes and not searching
  useEffect(() => {
    if (isSearching) return
    const filtered = allRecipesRef.current.filter(r => recipeMealToTab(r) === selectedMealTab)
    setFilteredRecipes(filtered)
  }, [selectedMealTab, isSearching])

  // Load more
  const loadMore = useCallback(() => {
    if (isLoadingMoreRef.current || loadingMore || !hasMoreRef.current || isSearching) return
    isLoadingMoreRef.current = true
    fetchRecipesPage(pageRef.current + 1, true)
  }, [loadingMore, fetchRecipesPage, isSearching])

  // Search (debounced local filtering)
  const debounceTimeout = useRef(null)
  const handleSearchChange = (value) => {
    setSearchTerm(value)
    setIsSearching(value.trim().length > 0)

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current)

    if (value.trim().length < 2) {
      setShowSuggestions(false)
      setSuggestions([])
      if (value.trim() === "") {
        setIsSearching(false)
        const filtered = allRecipesRef.current.filter(r => recipeMealToTab(r) === selectedMealTab)
        setFilteredRecipes(filtered)
      }
      return
    }

    debounceTimeout.current = setTimeout(() => {
      const term = value.toLowerCase()
      const matches = allRecipesRef.current.filter(r =>
        String(r.title || "").toLowerCase().includes(term)
      )
      const unique = []
      const seen = new Set()
      matches.forEach(r => {
        const title = String(r.title || "").toLowerCase()
        if (!title || seen.has(title)) return
        seen.add(title)
        unique.push(r)
      })
      unique.sort((a, b) => {
        const aTitle = String(a.title || "").toLowerCase()
        const bTitle = String(b.title || "").toLowerCase()
        if (aTitle === term && bTitle !== term) return -1
        if (bTitle === term && aTitle !== term) return 1
        if (aTitle.startsWith(term) && !bTitle.startsWith(term)) return -1
        if (bTitle.startsWith(term) && !aTitle.startsWith(term)) return 1
        return 0
      })
      setSuggestions(unique.slice(0, 8))
      setShowSuggestions(unique.length > 0)
      setFilteredRecipes(unique)
    }, 300)
  }

  const handleSuggestionClick = (recipe) => {
    setSearchTerm(recipe.title || "")
    setShowSuggestions(false)
    setIsSearching(true)
    setFilteredRecipes([recipe])
  }

  const clearSearch = () => {
    setSearchTerm("")
    setIsSearching(false)
    setShowSuggestions(false)
    setSuggestions([])
    const filtered = allRecipesRef.current.filter(r => recipeMealToTab(r) === selectedMealTab)
    setFilteredRecipes(filtered)
  }

  if (!ready) {
    return (
      <FitnessShell title="Recipes" backTo="/app/fitness/food" showTabs={false}>
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  return (
    <FitnessShell
      title="Recipes"
      backTo="/app/fitness/food"
      showTabs={false}
      rightAction={
        <Link to="/app/fitness/recipes/saved" className="text-xs font-semibold text-white">
          Saved
        </Link>
      }
    >
      {/* Search bar */}
      <div className="relative mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search recipes..."
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-8 text-sm outline-none focus:border-[#10B981]"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {suggestions.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => handleSuggestionClick(recipe)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <Search size={14} className="text-gray-400" />
                <span className="truncate">{recipe.title}</span>
                <span className="ml-auto text-xs text-gray-400 capitalize">
                  {recipeMealToTab(recipe) || ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Meal tabs */}
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {MEAL_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              if (isSearching) {
                setSearchTerm("")
                setIsSearching(false)
                setShowSuggestions(false)
                setSuggestions([])
              }
              setSelectedMealTab(tab)
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              selectedMealTab === tab && !isSearching
                ? "bg-[#10B981] text-white"
                : "bg-white text-[#374151] ring-1 ring-[#E5E7EB]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : (
        <>
          {filteredRecipes.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500">No recipes found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecipes.map((r) => {
                const id = r.id || r.recipe_id
                const mealType = recipeMealToTab(r) || r.meal_type || ""
                return (
                  <Link
                    key={id}
                    to={`/app/fitness/recipes/${encodeURIComponent(id)}`}
                    className="group flex flex-col rounded-2xl border border-[#E5E7EB] bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden">
                      <img
                        src={fitnessImage(r.image_url || r.image || r.thumbnail)}
                        alt={r.title || r.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {mealType && (
                        <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm capitalize">
                          {mealType}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col flex-grow p-3">
                      <h3 className="font-semibold text-[#111827] line-clamp-2 text-sm sm:text-base">
                        {r.title || r.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        {r.calories && (
                          <span className="flex items-center gap-1">
                            <span>🔥</span> {Math.round(r.calories)} kcal
                          </span>
                        )}
                        {r.total_time_min && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {r.total_time_min} min
                          </span>
                        )}
                        {r.servings && (
                          <span className="flex items-center gap-1">
                            <Users size={12} /> {r.servings}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-[#10B981]" size={24} />
            </div>
          )}
          {hasMore && !isSearching && !loading && filteredRecipes.length > 0 && (
            <div className="text-center py-4">
              <button
                onClick={loadMore}
                className="rounded-full border border-[#10B981] px-6 py-2 text-sm font-medium text-[#10B981] hover:bg-[#10B981] hover:text-white transition-colors"
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more recipes"}
              </button>
            </div>
          )}
        </>
      )}
    </FitnessShell>
  )
}

// ------------------------------------------------------------------
// 3. Recipe Detail (Enhanced – matches React Native design)
// ------------------------------------------------------------------

export function FitnessRecipeDetail() {
  const { recipeId } = useParams()
  const { ready, auth } = useFitnessGate()
  const [recipe, setRecipe] = useState(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!ready || !recipeId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [r, savedList] = await Promise.all([
          fetchRecipe(auth, recipeId),
          fetchSavedRecipes(auth).catch(() => []),
        ])
        if (cancelled) return
        setRecipe(r)
        setSaved(
          savedList.some(
            (x) => String(x.id || x.recipe_id) === String(recipeId),
          ),
        )
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load recipe")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ready, auth, recipeId])

  const toggleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      if (saved) {
        await unsaveRecipe(auth, recipeId)
      } else {
        await saveRecipe(auth, recipeId)
      }
      setSaved(!saved)
    } catch (err) {
      setError(err.message || "Failed to update saved recipe")
    } finally {
      setSaving(false)
    }
  }

  if (!ready) {
    return (
      <FitnessShell title="Recipe" backTo="/app/fitness/recipes" showTabs={false}>
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  const title = recipe?.title || recipe?.name || "Recipe"
  const mealType = recipeMealToTab(recipe) || recipe?.meal_type || ""
  const ingredients = recipe?.ingredients || recipe?.items || recipe?.ingredient_list || []
  const instructions = recipe?.instructions || recipe?.steps || recipe?.method || []

  // Nutrition (if available)
  const nutrition = recipe?.nutrition || recipe?.total_nutrition || {}
  const calories = nutrition?.calories ?? recipe?.calories_kcal ?? recipe?.calories
  const protein = nutrition?.protein_g ?? recipe?.protein_g
  const carbs = nutrition?.carbs_g ?? recipe?.carbs_g
  const fat = nutrition?.fat_g ?? recipe?.fat_g

  return (
    <FitnessShell
      title={title}
      backTo="/app/fitness/recipes"
      showTabs={false}
      rightAction={
        <button
          type="button"
          onClick={toggleSave}
          disabled={saving}
          className="flex items-center gap-1 text-white transition-colors hover:text-gray-200 disabled:opacity-50"
        >
          <Heart size={18} fill={saved ? "white" : "none"} />
          <span className="text-xs font-medium hidden sm:inline">
            {saved ? "Saved" : "Save"}
          </span>
        </button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-16 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : error && !recipe ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : (
        <div className="max-w-4xl mx-auto px-4 pb-24">
          {/* Hero Image with Overlay */}
          <div className="relative w-full rounded-2xl overflow-hidden shadow-md bg-gray-100 mb-6">
            <img
              src={fitnessImage(recipe?.image_url || recipe?.image)}
              alt={title}
              className="w-full h-64 sm:h-80 md:h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              {mealType && (
                <span className="inline-block bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full mb-2 capitalize">
                  {mealType}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                {title}
              </h1>
              {recipe?.description && (
                <p className="mt-1 text-sm sm:text-base text-white/90 max-w-2xl">
                  {recipe.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                {recipe?.total_time_min && (
                  <span className="flex items-center gap-1">
                    <Clock size={16} />
                    {recipe.total_time_min} min
                  </span>
                )}
                {recipe?.servings && (
                  <span className="flex items-center gap-1">
                    <Users size={16} />
                    {recipe.servings} servings
                  </span>
                )}
                {calories && (
                  <span className="flex items-center gap-1">
                    <Flame size={16} className="text-orange-400" />
                    {Math.round(calories)} kcal
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Nutrition Cards */}
          {(calories || protein || carbs || fat) && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Nutrition</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {calories && (
                  <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
                    <Flame size={20} className="text-orange-500 mx-auto" />
                    <div className="text-xl font-bold text-gray-800">{Math.round(calories)}</div>
                    <div className="text-xs text-gray-600">kcal</div>
                  </div>
                )}
                {protein && (
                  <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                    <span className="text-blue-500 text-lg">💪</span>
                    <div className="text-xl font-bold text-gray-800">{protein}g</div>
                    <div className="text-xs text-gray-600">Protein</div>
                  </div>
                )}
                {carbs && (
                  <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                    <span className="text-green-500 text-lg">🍞</span>
                    <div className="text-xl font-bold text-gray-800">{carbs}g</div>
                    <div className="text-xs text-gray-600">Carbs</div>
                  </div>
                )}
                {fat && (
                  <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-100">
                    <span className="text-yellow-500 text-lg">🧈</span>
                    <div className="text-xl font-bold text-gray-800">{fat}g</div>
                    <div className="text-xs text-gray-600">Fat</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ingredients */}
          {Array.isArray(ingredients) && ingredients.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Utensils size={18} /> Ingredients
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <ul className="space-y-2">
                  {ingredients.map((ing, idx) => {
                    let display = ""
                    if (typeof ing === "string") display = ing
                    else if (ing.name) {
                      const qty = ing.quantity || ing.qty || ing.amount
                      const unit = ing.unit || ""
                      display = [qty, unit, ing.name].filter(Boolean).join(" ")
                    } else {
                      display = JSON.stringify(ing)
                    }
                    return (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-[#10B981]">•</span>
                        <span>{display}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Instructions */}
          {Array.isArray(instructions) && instructions.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Instructions</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <ol className="space-y-3 list-decimal list-inside text-sm text-gray-700">
                  {instructions.map((step, idx) => {
                    let text = ""
                    if (typeof step === "string") text = step
                    else if (step.text) text = step.text
                    else if (step.step) text = step.step
                    else if (step.description) text = step.description
                    else text = JSON.stringify(step)
                    return (
                      <li key={idx} className="leading-relaxed">
                        {text}
                      </li>
                    )
                  })}
                </ol>
              </div>
            </div>
          )}

          {/* Footer spacer for floating button */}
          <div className="h-8" />
        </div>
      )}

      {/* Floating Save Button (matches RN) */}
      {!loading && recipe && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={toggleSave}
              disabled={saving}
              className="w-full bg-[#272B2A] text-white font-semibold py-3 px-6 rounded-full shadow-lg flex items-center justify-center gap-2 transition hover:bg-[#1a1e1d] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Heart size={18} fill={saved ? "white" : "none"} />
                  {saved ? "Saved" : "Save Recipe"}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </FitnessShell>
  )
}

// ------------------------------------------------------------------
// 4. Saved Recipes
// ------------------------------------------------------------------

export function FitnessSavedRecipes() {
  const { ready, auth } = useFitnessGate()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready) return
    ;(async () => {
      try {
        setRecipes(await fetchSavedRecipes(auth))
      } finally {
        setLoading(false)
      }
    })()
  }, [ready, auth])

  if (!ready) {
    return (
      <FitnessShell title="Saved recipes" backTo="/app/fitness/recipes" showTabs={false}>
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  return (
    <FitnessShell title="Saved recipes" backTo="/app/fitness/recipes" showTabs={false}>
      {loading ? (
        <div className="flex justify-center py-16 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : recipes.length === 0 ? (
        <p className="text-center text-sm text-[#6B7280]">No saved recipes.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((r) => {
            const id = r.id || r.recipe_id
            return (
              <Link
                key={id}
                to={`/app/fitness/recipes/${encodeURIComponent(id)}`}
                className="group overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm hover:shadow-md transition"
              >
                <div className="aspect-[4/3] w-full bg-gray-100 overflow-hidden">
                  <img
                    src={fitnessImage(r.image_url || r.image)}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <p className="p-3 text-sm font-semibold truncate">{r.title || r.name}</p>
              </Link>
            )
          })}
        </div>
      )}
    </FitnessShell>
  )
}

// ------------------------------------------------------------------
// 5. Healthy Swaps
// ------------------------------------------------------------------

const SWAP_TABS = ["all", "carbs", "protein", "snacks", "beverages"]

export function FitnessSwaps() {
  const { ready, auth } = useFitnessGate()
  const [tab, setTab] = useState("all")
  const [swaps, setSwaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const list = await fetchHealthySwaps(auth, tab)
        if (!cancelled) setSwaps(list)
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load swaps")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ready, auth, tab])

  if (!ready) {
    return (
      <FitnessShell title="Healthy swaps" backTo="/app/fitness/food" showTabs={false}>
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  return (
    <FitnessShell title="Healthy swaps" backTo="/app/fitness/food" showTabs={false}>
      <div className="mb-4 flex flex-wrap gap-2">
        {SWAP_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              tab === t
                ? "bg-[#10B981] text-white"
                : "bg-white text-[#374151] ring-1 ring-[#E5E7EB]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-16 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : (
        <ul className="space-y-3">
          {swaps.map((s) => (
            <li
              key={s.id || s.title}
              className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
            >
              <p className="font-semibold text-[#111827]">
                {s.title || s.name || s.swap_title}
              </p>
              <p className="mt-1 text-sm text-[#4B5563]">
                {s.description || s.details || s.healthy_option || ""}
              </p>
              {(s.instead_of || s.replace) && (
                <p className="mt-2 text-xs text-[#6B7280]">
                  Instead of: {s.instead_of || s.replace}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </FitnessShell>
  )
}

// ------------------------------------------------------------------
// 6. Plans
// ------------------------------------------------------------------

export function FitnessPlans() {
  const { ready, auth } = useFitnessGate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      setPlans(await fetchUserPlans(auth))
    } catch (err) {
      setError(err.message || "Failed to load plans")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ready) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, auth?.token])

  if (!ready) {
    return (
      <FitnessShell title="My plans" backTo="/app/fitness/food" showTabs={false}>
        <FitnessGateLoader />
      </FitnessShell>
    )
  }

  return (
    <FitnessShell title="My plans" backTo="/app/fitness/food" showTabs={false}>
      {loading ? (
        <div className="flex justify-center py-16 text-[#10B981]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : plans.length === 0 ? (
        <p className="text-center text-sm text-[#6B7280]">No plans yet.</p>
      ) : (
        <ul className="space-y-3">
          {plans.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#111827]">
                    {p.title || p.name || `Plan #${p.id}`}
                  </p>
                  <p className="mt-1 text-xs capitalize text-[#6B7280]">
                    {p.status || "active"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await patchUserPlanStatus(
                        auth,
                        p.id,
                        p.status === "active" ? "paused" : "active",
                      )
                      await load()
                    }}
                    className="text-xs font-semibold text-[#10B981]"
                  >
                    Toggle
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteUserPlan(auth, p.id)
                      await load()
                    }}
                    className="text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </FitnessShell>
  )
}