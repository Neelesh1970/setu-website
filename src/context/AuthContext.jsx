import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { checkUserExists, fetchUserProfile } from "../api/auth"
import { isJwtExpired, refreshVleToken } from "../api/roleAuth"

const STORAGE_KEY = "setu_auth_session"
const API_HOST_KEY = "setu_api_host"

/** Invalidate saved sessions when Vite proxy target changes (local → staging, etc.). */
function currentApiHost() {
  return (import.meta.env.VITE_PROXY_API_HOST || "https://staging.setuai.com").replace(/\/+$/, "")
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(API_HOST_KEY)
}

const AuthContext = createContext(null)

function readStoredSession() {
  try {
    const expected = currentApiHost()
    const host = localStorage.getItem(API_HOST_KEY)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    if (host !== expected) {
      clearStoredSession()
      return null
    }
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeStoredSession(session) {
  if (!session) {
    clearStoredSession()
    return
  }
  localStorage.setItem(API_HOST_KEY, currentApiHost())
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function normalizeSession(payload) {
  const accountType = payload.accountType || "user"
  return {
    accountType,
    token: payload.token || "",
    refreshToken: payload.refreshToken || "",
    user_id: payload.user_id ? String(payload.user_id) : "",
    uhid: payload.uhid ? String(payload.uhid) : "",
    username: payload.username ? String(payload.username) : "",
    first_name: payload.first_name || "",
    name: payload.name || payload.first_name || "",
    mobile: payload.mobile ? String(payload.mobile) : "",
    email: payload.email || "",
    vle_id: payload.vle_id ? String(payload.vle_id) : "",
    vlePublicId: payload.vlePublicId || "",
    admin_id: payload.admin_id ? String(payload.admin_id) : "",
    roles: payload.roles || [],
    scope: payload.scope || "",
    allowedModules: payload.allowedModules || [],
  }
}

function sessionIsAuthenticated(session) {
  if (!session?.token) return false
  if (session.accountType === "vle") {
    return Boolean(session.vle_id || session.vlePublicId)
  }
  if (session.accountType === "district_coordinator") {
    return Boolean(session.admin_id)
  }
  return Boolean(session.user_id)
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession())
  const [loading, setLoading] = useState(true)
  const [bootChecked, setBootChecked] = useState(false)

  const logout = useCallback(() => {
    setSession(null)
    writeStoredSession(null)
  }, [])

  const login = useCallback((payload) => {
    const next = normalizeSession(payload)
    setSession(next)
    writeStoredSession(next)
  }, [])

  const updateProfile = useCallback((patch) => {
    setSession((prev) => {
      if (!prev) return prev
      const next = normalizeSession({ ...prev, ...patch })
      writeStoredSession(next)
      return next
    })
  }, [])

  /** Splash-equivalent: validate user sessions via getUsers; trust VLE/admin tokens on boot */
  useEffect(() => {
    let cancelled = false

    async function validate() {
      const stored = readStoredSession()
      if (!stored?.token) {
        if (!cancelled) {
          setSession(null)
          setLoading(false)
          setBootChecked(true)
        }
        return
      }

      if (stored.accountType === "vle" || stored.accountType === "district_coordinator") {
        let nextSession = normalizeSession(stored)
        if (
          stored.accountType === "vle" &&
          stored.refreshToken &&
          isJwtExpired(stored.token)
        ) {
          try {
            const tokens = await refreshVleToken(stored.refreshToken)
            nextSession = normalizeSession({ ...stored, ...tokens })
          } catch {
            if (!cancelled) {
              setSession(null)
              writeStoredSession(null)
              setLoading(false)
              setBootChecked(true)
            }
            return
          }
        }
        if (!cancelled) {
          setSession(nextSession)
          writeStoredSession(nextSession)
          setLoading(false)
          setBootChecked(true)
        }
        return
      }

      if (!stored.user_id) {
        if (!cancelled) {
          setSession(null)
          setLoading(false)
          setBootChecked(true)
        }
        return
      }

      try {
        const check = await checkUserExists(
          stored.user_id,
          stored.token,
          stored.refreshToken,
        )

        if (cancelled) return

        if (!check.exists) {
          logout()
          setLoading(false)
          setBootChecked(true)
          return
        }

        try {
          const profile = await fetchUserProfile(
            stored.user_id,
            stored.token,
            stored.refreshToken,
          )
          if (!cancelled && profile) {
            const next = normalizeSession({
              ...stored,
              accountType: "user",
              first_name: profile.first_name || stored.first_name,
              username: profile.username || stored.username,
              uhid: profile.uhid || stored.uhid,
              mobile: profile.mobile || stored.mobile,
            })
            setSession(next)
            writeStoredSession(next)
          }
        } catch (err) {
          if (err?.code === "USER_NOT_FOUND") {
            if (!cancelled) logout()
          } else if (!cancelled) {
            setSession(stored)
          }
        }
      } catch {
        if (!cancelled) setSession(stored)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setBootChecked(true)
        }
      }
    }

    validate()
    return () => {
      cancelled = true
    }
  }, [logout])

  const refreshSession = useCallback(async () => {
    if (!session?.token || !session?.user_id) return null
    const profile = await fetchUserProfile(
      session.user_id,
      session.token,
      session.refreshToken,
    )
    updateProfile({
      first_name: profile.first_name || session.first_name,
      username: profile.username || session.username,
      uhid: profile.uhid || session.uhid,
      mobile: profile.mobile || session.mobile,
    })
    return profile
  }, [session, updateProfile])

  useEffect(() => {
    function onSessionInvalid() {
      logout()
    }
    window.addEventListener("setu:session-invalid", onSessionInvalid)
    return () => window.removeEventListener("setu:session-invalid", onSessionInvalid)
  }, [logout])

  useEffect(() => {
    function onTokens(event) {
      const detail = event?.detail
      if (!detail?.token) return
      setSession((prev) => {
        if (!prev) return prev
        const next = normalizeSession({
          ...prev,
          token: detail.token,
          refreshToken: detail.refreshToken || prev.refreshToken,
        })
        writeStoredSession(next)
        return next
      })
    }
    window.addEventListener("setu:tokens", onTokens)
    return () => window.removeEventListener("setu:tokens", onTokens)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: sessionIsAuthenticated(session),
      loading,
      bootChecked,
      login,
      logout,
      updateProfile,
      refreshSession,
    }),
    [session, loading, bootChecked, login, logout, updateProfile, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
