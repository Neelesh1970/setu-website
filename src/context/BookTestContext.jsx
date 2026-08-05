// /context/BookTestContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useAuth } from "./AuthContext"
import { 
  fetchCartDetails, 
  fetchSavedTests,
  toggleSavedTest,
} from "../api/booktest"
import { normalizeCartPayload } from "../utils/booktest"

const BookTestContext = createContext(null)

const FLOW_KEY = "setu_booktest_flow"

function readFlow() {
  try {
    const raw = sessionStorage.getItem(FLOW_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeFlow(flow) {
  try {
    sessionStorage.setItem(FLOW_KEY, JSON.stringify(flow || {}))
  } catch {
    /* ignore */
  }
}

export function BookTestProvider({ children }) {
  const { session } = useAuth()
  const [cartItems, setCartItems] = useState([])
  const [savedItems, setSavedItems] = useState([])
  const [billing, setBilling] = useState(null)
  const [cartLoading, setCartLoading] = useState(false)
  const [savedLoading, setSavedLoading] = useState(false)
  const [flow, setFlowState] = useState(() => readFlow())

  const setFlow = useCallback((patch) => {
    setFlowState((prev) => {
      const next = { ...prev, ...patch }
      writeFlow(next)
      return next
    })
  }, [])

  const clearFlow = useCallback(() => {
    setFlowState({})
    writeFlow({})
  }, [])

  // Refresh cart
  const refreshCart = useCallback(async () => {
    if (!session?.token || !session?.user_id) {
      setCartItems([])
      setBilling(null)
      return null
    }
    setCartLoading(true)
    try {
      const raw = await fetchCartDetails(session, session.user_id)
      const normalized = normalizeCartPayload(raw)
      setCartItems(normalized.items)
      setBilling(normalized.billing)
      return normalized
    } catch (error) {
      console.error('Error refreshing cart:', error)
      setCartItems([])
      setBilling(null)
      return null
    } finally {
      setCartLoading(false)
    }
  }, [session])

  // Refresh saved items
  const refreshSaved = useCallback(async () => {
    if (!session?.token) {
      setSavedItems([])
      return []
    }
    setSavedLoading(true)
    try {
      const items = await fetchSavedTests(session)
      setSavedItems(items || [])
      return items || []
    } catch (error) {
      console.error('Error refreshing saved items:', error)
      setSavedItems([])
      return []
    } finally {
      setSavedLoading(false)
    }
  }, [session])

  // Toggle saved status - IMMEDIATE UPDATE
  const toggleSaved = useCallback(async (productCode, save, itemData = null) => {
    if (!session?.token) {
      throw new Error("Please sign in to save tests")
    }

    // IMMEDIATE STATE UPDATE - Count updates right away
    if (save) {
      const newItem = itemData || {
        product_code: productCode,
        code: productCode,
        _id: productCode,
        _name: "Saved Test",
        _price: 0,
      }
      setSavedItems(prev => {
        const exists = prev.some(item => 
          item.product_code === productCode || 
          item.code === productCode ||
          item._id === productCode ||
          item.productCode === productCode
        )
        if (exists) return prev
        return [...prev, newItem]
      })
    } else {
      setSavedItems(prev => prev.filter(item => 
        item.product_code !== productCode && 
        item.code !== productCode &&
        item._id !== productCode &&
        item.productCode !== productCode
      ))
    }

    // API call in background
    try {
      await toggleSavedTest(session, productCode, save)
      setTimeout(() => {
        refreshSaved()
      }, 500)
    } catch (error) {
      console.error('Error toggling saved test:', error)
      await refreshSaved()
    }
  }, [session, refreshSaved])

  // Check if test is saved
  const isSaved = useCallback((productCode) => {
    if (!productCode) return false
    return savedItems.some(item => 
      item.product_code === productCode || 
      item.code === productCode ||
      item._id === productCode ||
      item.productCode === productCode
    )
  }, [savedItems])

  // Check if test is in cart
  const isInCart = useCallback((productCode) => {
    if (!productCode) return false
    return cartItems.some(item => 
      item.product_code === productCode || 
      item.code === productCode ||
      item._id === productCode ||
      item.productCode === productCode
    )
  }, [cartItems])

  // Load initial data
  useEffect(() => {
    refreshCart()
    refreshSaved()
  }, [refreshCart, refreshSaved])

  // Calculate counts
  const cartCount = useMemo(
    () =>
      cartItems.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 1), 0),
    [cartItems],
  )

  const savedCount = savedItems.length

  const value = useMemo(
    () => ({
      cartItems,
      savedItems,
      billing,
      cartLoading,
      savedLoading,
      cartCount,
      savedCount,
      refreshCart,
      refreshSaved,
      toggleSaved,
      isSaved,
      isInCart,
      flow,
      setFlow,
      clearFlow,
    }),
    [
      cartItems,
      savedItems,
      billing,
      cartLoading,
      savedLoading,
      cartCount,
      savedCount,
      refreshCart,
      refreshSaved,
      toggleSaved,
      isSaved,
      isInCart,
      flow,
      setFlow,
      clearFlow,
    ],
  )

  return (
    <BookTestContext.Provider value={value}>{children}</BookTestContext.Provider>
  )
}

export function useBookTest() {
  const ctx = useContext(BookTestContext)
  if (!ctx) throw new Error("useBookTest must be used within BookTestProvider")
  return ctx
}