/**
 * Fitness APIs — mirrors setuReactNative Gym/Fitness + FitnessApi.js
 */
import { fitnessUrl, CLOUDFRONT_BASE, resolveStorageImageUrl } from "../config/api"
import { authFetch } from "./http"

export const FITNESS_PRIMARY = "#10B981"
export const FITNESS_BG = "#F5F7FA"

export const FITNESS_GOALS = [
  { value: "weight_loss", label: "Weight Loss", minWeeks: 10 },
  { value: "weight_gain", label: "Weight Gain", minWeeks: 25 },
  { value: "muscle_gain", label: "Muscle Gain", minWeeks: 20 },
  { value: "maintenance", label: "Maintenance", minWeeks: 10 },
  { value: "fat_loss", label: "Fat Loss", minWeeks: 10 },
]

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"]

const IST_OFFSET_MIN = 330

export function toIstDate(d = new Date()) {
  return new Date(d.getTime() + (d.getTimezoneOffset() + IST_OFFSET_MIN) * 60000)
}

export function todayIstKey(d = new Date()) {
  const x = toIstDate(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`
}

function qs(params = {}) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v == null || v === "") return
    sp.set(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ""
}

export function fitnessImage(keyOrUrl, fallbackPath = "fitness/workouts/exercises/default.png") {
  if (!keyOrUrl) {
    return `${CLOUDFRONT_BASE}/${fallbackPath}`
  }
  const raw = String(keyOrUrl)
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return resolveStorageImageUrl(raw) || raw
  }
  if (raw.startsWith("/")) return raw
  const cf = `${CLOUDFRONT_BASE}/${raw.replace(/^\//, "")}`
  return resolveStorageImageUrl(cf) || cf
}

export function exerciseImage(nameOrPath) {
  if (!nameOrPath) return fitnessImage(null)
  const raw = String(nameOrPath)
  if (raw.includes("/") || raw.startsWith("http")) return fitnessImage(raw)
  const kebab = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return fitnessImage(`fitness/workouts/exercises/${kebab}.png`)
}

function errMsg(data, fallback) {
  if (!data) return fallback
  if (typeof data === "string") return data
  return (
    data.message ||
    data.error?.message ||
    data.error ||
    data.details?.[0]?.message ||
    fallback
  )
}

function unwrap(data) {
  if (data == null) return data
  if (data.data !== undefined) return data.data
  if (data.response !== undefined) return data.response
  return data
}

function parseBooleanLike(value) {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase()
    if (["1", "true", "yes", "y", "favorite", "favourite", "liked", "starred"].includes(trimmed)) {
      return true
    }
    if (["0", "false", "no", "n", "notfavorite", "not_favorite", "unliked", "unstarred"].includes(trimmed)) {
      return false
    }
  }
  return Boolean(value)
}

function normalizeMeal(item) {
  if (!item || typeof item !== "object") return item
  const favoriteValue = item.is_favorite ?? item.isFavorite ?? item.favorite ?? item.favourite ?? item.isFavourite ?? item.favorite_status ?? item.favorited ?? item.is_favorited ?? item.liked ?? item.is_liked
  const normalized = {
    ...item,
    id: item.id ?? item.meal_id ?? item.mealId ?? item._id,
    name: item.name ?? item.food_name ?? item.foodName ?? item.meal_name,
    meal_type: item.meal_type ?? item.type ?? item.mealType ?? item.category,
    calories: item.calories ?? item.calorie ?? item.kcal ?? 0,
    is_favorite: parseBooleanLike(favoriteValue),
  }
  normalized.isFavorite = normalized.is_favorite
  normalized.favorite = normalized.is_favorite
  normalized.favourite = normalized.is_favorite
  normalized.isFavourite = normalized.is_favorite
  return normalized
}

function normalizeMealList(data) {
  if (Array.isArray(data)) return data.map(normalizeMeal)
  if (Array.isArray(data?.meals)) return data.meals.map(normalizeMeal)
  if (Array.isArray(data?.items)) return data.items.map(normalizeMeal)
  if (Array.isArray(data?.data)) return data.data.map(normalizeMeal)
  if (Array.isArray(data?.favorites)) return data.favorites.map(normalizeMeal)
  if (Array.isArray(data?.results)) return data.results.map(normalizeMeal)
  return []
}

async function fitAuth(method, path, body, { token, refreshToken } = {}) {
  const { response, data } = await authFetch(fitnessUrl(path), {
    method,
    token,
    refreshToken,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  // Persist rotated tokens if fitness middleware refreshed them
  const newAuth = response.headers.get("Authorization") || response.headers.get("authorization")
  const newRefresh =
    response.headers.get("X-Refresh-Token") ||
    response.headers.get("x-refresh-token") ||
    response.headers.get("X-REFRESH-TOKEN")
  if (newAuth || newRefresh) {
    try {
      const raw = localStorage.getItem("setu_auth_session")
      if (raw) {
        const prev = JSON.parse(raw)
        const tokenVal = newAuth
          ? String(newAuth).replace(/^Bearer\s+/i, "")
          : prev.token
        const next = {
          ...prev,
          token: tokenVal,
          refreshToken: newRefresh || prev.refreshToken,
        }
        localStorage.setItem("setu_auth_session", JSON.stringify(next))
        window.dispatchEvent(
          new CustomEvent("setu:tokens", {
            detail: { token: next.token, refreshToken: next.refreshToken },
          }),
        )
      }
    } catch {
      /* ignore */
    }
  }

  if (!response.ok || data?.success === false || data?.hasError === true || data?.sendSuccess === false) {
    const err = new Error(errMsg(data, `Fitness request failed (${response.status})`))
    err.status = response.status
    err.data = data
    err.profileMissing =
      response.status === 404 &&
      /profile not found/i.test(String(data?.message || ""))
    err.requiresAuth = response.status === 401
    throw err
  }
  return data
}

async function fitPublic(path, params) {
  const response = await fetch(fitnessUrl(`${path}${qs(params)}`), {
    headers: { Accept: "application/json" },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false || data?.hasError === true) {
    throw new Error(errMsg(data, "Fitness request failed"))
  }
  return data
}

/* ── Profiles ── */

export async function fetchFitnessProfile(auth) {
  try {
    const data = await fitAuth("GET", "/profiles/me", null, auth)
    return unwrap(data)
  } catch (e) {
    if (e.status === 404 || e.profileMissing) return null
    // Some backends use GET /profiles
    try {
      const data = await fitAuth("GET", "/profiles", null, auth)
      const raw = unwrap(data)
      if (Array.isArray(raw)) return raw[0] || null
      return raw?.response || raw
    } catch (e2) {
      if (e2.status === 404 || e2.profileMissing) return null
      throw e2
    }
  }
}

export async function createFitnessProfile(payload, auth) {
  const data = await fitAuth("POST", "/profiles", payload, auth)
  return unwrap(data)?.response || unwrap(data)
}

export async function updateFitnessProfile(payload, auth) {
  const data = await fitAuth("PUT", "/profiles", payload, auth)
  return unwrap(data)?.response || unwrap(data)
}

/* ── Dashboard / track ── */

export async function fetchDayGoals(auth, dayKey) {
  const path = dayKey
    ? `/dashboard/goals/day/${encodeURIComponent(dayKey)}`
    : "/dashboard/goals/day"
  const data = await fitAuth("GET", path, null, auth)
  return unwrap(data) || data
}

export async function fetchTrack(auth, dayKey) {
  const data = await fitAuth("GET", `/track/${encodeURIComponent(dayKey)}`, null, auth)
  return unwrap(data) || data
}

export async function putTrack(auth, dayKey, body) {
  const data = await fitAuth(
    "PUT",
    `/track/${encodeURIComponent(dayKey)}`,
    body,
    auth,
  )
  return unwrap(data) || data
}

/* ── Workout ── */

export async function fetchMuscles(auth) {
  const data = await fitAuth("GET", "/workout/muscles", null, auth)
  const raw = unwrap(data) || data
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.muscles)) return raw.muscles
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

export async function fetchExercises(auth, { muscle, page = 1, limit = 40 } = {}) {
  const data = await fitAuth(
    "GET",
    `/workout/exercises${qs({ muscle, page, limit })}`,
    null,
    auth,
  )
  const raw = unwrap(data) || data
  if (Array.isArray(raw)) return { items: raw, page, total: raw.length }
  if (Array.isArray(raw?.exercises)) {
    return { items: raw.exercises, page: raw.page || page, total: raw.total }
  }
  if (Array.isArray(raw?.items)) {
    return { items: raw.items, page: raw.page || page, total: raw.total }
  }
  if (Array.isArray(raw?.data)) {
    return { items: raw.data, page, total: raw.data.length }
  }
  return { items: [], page, total: 0 }
}

export async function fetchExercise(auth, id) {
  const data = await fitAuth(
    "GET",
    `/workout/exercises/${encodeURIComponent(id)}`,
    null,
    auth,
  )
  return unwrap(data) || data
}

export async function fetchWorkoutToday(auth) {
  const data = await fitAuth("GET", "/workout-daily/today", null, auth)
  return unwrap(data) || data
}

export async function addWorkoutExercises(auth, dayKey, items) {
  const data = await fitAuth(
    "POST",
    `/workout-daily/days/${encodeURIComponent(dayKey)}/exercises`,
    { items },
    auth,
  )
  return unwrap(data) || data
}

export async function completeWorkoutDay(auth, dayKey) {
  const data = await fitAuth(
    "POST",
    `/workout-daily/days/${encodeURIComponent(dayKey)}/complete`,
    {},
    auth,
  )
  return unwrap(data) || data
}

export async function completeWorkoutBulk(auth, dayKey, body) {
  const data = await fitAuth(
    "PATCH",
    `/workout-daily/days/${encodeURIComponent(dayKey)}/exercises/complete-bulk`,
    body,
    auth,
  )
  return unwrap(data) || data
}

/* ── Hydration ── */

export async function fetchHydrationGoal(auth) {
  const data = await fitAuth("GET", "/hydration/goal", null, auth)
  return unwrap(data) || data
}

export async function fetchHydrationToday(auth) {
  const [logs, consumed] = await Promise.allSettled([
    fitAuth("GET", "/hydration/logs/today", null, auth),
    fitAuth("GET", "/hydration/consumed/today", null, auth),
  ])
  return {
    logs: logs.status === "fulfilled" ? unwrap(logs.value) || logs.value : null,
    consumed:
      consumed.status === "fulfilled"
        ? unwrap(consumed.value) || consumed.value
        : null,
  }
}

export async function postHydrationLog(auth, amount_ml) {
  return fitAuth("POST", "/hydration/logs", { amount_ml }, auth)
}

export async function deleteLastHydrationLog(auth) {
  return fitAuth("DELETE", "/hydration/logs/last", null, auth)
}

export async function putHydrationGoal(auth, daily_ml) {
  return fitAuth("PUT", "/hydration/goal", { daily_ml }, auth)
}

/* ── Meals / food ── */

export async function fetchFoodHomeDashboard(auth) {
  const [needs, dash, meals] = await Promise.allSettled([
    fitAuth("GET", "/meals/meals/daily/needs", null, auth),
    fitAuth("GET", "/dashboard/goals/day", null, auth),
    fitAuth("GET", "/meals/meals/today", null, auth),
  ])
  if (needs.status !== "fulfilled") throw needs.reason
  if (meals.status !== "fulfilled") throw meals.reason
  return {
    needs: unwrap(needs.value) || needs.value,
    dashboard:
      dash.status === "fulfilled" ? unwrap(dash.value) || dash.value : {},
    mealsToday: unwrap(meals.value) || meals.value,
  }
}

export async function fetchMeals(auth, params = {}) {
  const data = await fitAuth("GET", `/meals/meals${qs(params)}`, null, auth)
  const raw = unwrap(data) || data
  return normalizeMealList(raw)
}

export async function fetchMeal(auth, id) {
  const data = await fitAuth(
    "GET",
    `/meals/meals/${encodeURIComponent(id)}`,
    null,
    auth,
  )
  return unwrap(data) || data
}

export async function createMeal(auth, body) {
  return fitAuth("POST", "/meals/meals", body, auth)
}

export async function deleteMeal(auth, id) {
  return fitAuth("DELETE", `/meals/meals/${encodeURIComponent(id)}`, null, auth)
}

export async function fetchFavoriteMeals(auth) {
  const data = await fitAuth("GET", "/meals/meals/favorites", null, auth)
  const raw = unwrap(data) || data
  return normalizeMealList(raw)
}

export async function toggleMealFavorite(auth, id, favorite) {
  const path = `/meals/meals/${encodeURIComponent(id)}/favorite`
  return favorite
    ? fitAuth("POST", path, {}, auth)
    : fitAuth("DELETE", path, null, auth)
}

export async function searchFood(auth, q) {
  const data = await fitAuth("GET", `/food${qs({ q, search: q, name: q })}`, null, auth)
  const raw = unwrap(data) || data
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.foods)) return raw.foods
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

/* ── Recipes ── */

export async function fetchPublicRecipes(params = {}) {
  const data = await fitPublic("/recipes/public/all", { limit: 100, ...params })
  const raw = unwrap(data) || data
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.recipes)) return raw.recipes
  if (Array.isArray(raw?.items)) return raw.items
  return []
}

export async function fetchRecipesByMeal(mealType) {
  const data = await fitPublic("/recipes/public/by-meal", { mealType })
  const raw = unwrap(data) || data
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.recipes)) return raw.recipes
  return []
}

export async function fetchRecipe(auth, id) {
  try {
    const data = await fitAuth(
      "GET",
      `/recipes/${encodeURIComponent(id)}`,
      null,
      auth,
    )
    return unwrap(data) || data
  } catch {
    const data = await fitPublic(`/recipes/${encodeURIComponent(id)}`)
    return unwrap(data) || data
  }
}

export async function fetchSavedRecipes(auth) {
  const data = await fitAuth("GET", "/saved-recipes/saved", null, auth)
  const raw = unwrap(data) || data
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.recipes)) return raw.recipes
  if (Array.isArray(raw?.items)) return raw.items
  return []
}

export async function saveRecipe(auth, id) {
  return fitAuth("POST", `/saved-recipes/${encodeURIComponent(id)}/save`, {}, auth)
}

export async function unsaveRecipe(auth, id) {
  return fitAuth(
    "DELETE",
    `/saved-recipes/${encodeURIComponent(id)}/save`,
    null,
    auth,
  )
}

export async function fetchRecipeSections(auth) {
  const data = await fitAuth("GET", "/recipe-sections", null, auth)
  const raw = unwrap(data) || data
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.sections)) return raw.sections
  return []
}

export async function fetchHealthySwaps(auth, category = null) {
  const query = category && String(category).toLowerCase() !== "all" ? qs({ category }) : ""
  const path = `/healthy-swaps${query}`
  console.debug("fetchHealthySwaps", { category, query, path })
  const data = await fitAuth(
    "GET",
    path,
    null,
    auth,
  )
  console.debug("fetchHealthySwaps raw response", data)
  const raw = unwrap(data) || data
  console.debug("fetchHealthySwaps unwrapped", raw)
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.swaps)) return raw.swaps
  if (Array.isArray(raw?.items)) return raw.items

  if (raw && typeof raw === "object") {
    const allItems = Object.values(raw).reduce((acc, value) => {
      return Array.isArray(value) ? acc.concat(value) : acc
    }, [])
    if (allItems.length > 0) return allItems
  }

  return []
}

export async function fetchUserPlans(auth) {
  const data = await fitAuth("GET", "/user-plans-v2", null, auth)
  const raw = unwrap(data) || data
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.plans)) return raw.plans
  return []
}

export async function patchUserPlanStatus(auth, id, status) {
  return fitAuth(
    "PATCH",
    `/user-plans-v2/${encodeURIComponent(id)}/status`,
    { status },
    auth,
  )
}

export async function deleteUserPlan(auth, id) {
  return fitAuth(
    "DELETE",
    `/user-plans-v2/${encodeURIComponent(id)}`,
    null,
    auth,
  )
}

export async function fetchDailyTip(auth) {
  try {
    const data = await fitAuth("GET", "/nutrition/daily-tip", null, auth)
    return unwrap(data) || data
  } catch {
    return null
  }
}

/* ── Dietitians ── */

export async function fetchDietitians(auth) {
  const data = await fitAuth("GET", "/dietitians/all", null, auth)
  const raw = unwrap(data) || data
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.dietitians)) return raw.dietitians
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

export async function fetchDietitian(auth, id) {
  const data = await fitAuth(
    "GET",
    `/dietitians/${encodeURIComponent(id)}`,
    null,
    auth,
  )
  return unwrap(data) || data
}

export async function bookConsultation(auth, body) {
  return fitAuth("POST", "/consultations", body, auth)
}

export async function fetchConsultations(auth) {
  const data = await fitAuth("GET", "/consultations/user", null, auth)
  const raw = unwrap(data) || data
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.consultations)) return raw.consultations
  return []
}

export async function cancelConsultation(auth, id) {
  return fitAuth(
    "DELETE",
    `/consultations/${encodeURIComponent(id)}`,
    null,
    auth,
  )
}

export async function requestDietPlan(auth, body) {
  return fitAuth("POST", "/diet-plan/request", body, auth)
}

export async function fetchMyDietPlans(auth) {
  const data = await fitAuth("GET", "/diet-plan/my-requests", null, auth)
  const raw = unwrap(data) || data
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.requests)) return raw.requests
  if (Array.isArray(raw?.plans)) return raw.plans
  return []
}
