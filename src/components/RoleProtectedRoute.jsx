import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { AppBootSkeleton } from "./AppSkeleton"

/**
 * Restrict routes to specific account types (user | vle | district_coordinator).
 */
export default function RoleProtectedRoute({ allow, children }) {
  const { session, isAuthenticated, loading } = useAuth()
  const location = useLocation()
  const allowed = Array.isArray(allow) ? allow : [allow]

  if (loading) {
    return <AppBootSkeleton />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, notice: "Please sign in to continue." }}
      />
    )
  }

  const type = session?.accountType || "user"
  if (!allowed.includes(type)) {
    if (type === "super_admin") return <Navigate to="/super-admin/coordinators" replace />
    if (type === "vle") return <Navigate to="/vle/dashboard" replace />
    if (type === "district_coordinator") {
      return <Navigate to="/coordinator/dashboard" replace />
    }
    return <Navigate to="/app" replace />
  }

  return children
}
