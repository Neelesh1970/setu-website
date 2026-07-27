import { LogOut } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

export default function CoordinatorDashboardPage() {
  const { session, logout } = useAuth()
  const roles = Array.isArray(session?.roles) ? session.roles : []

  return (
    <div className="auth-page-shell">
      <div className="auth-page-inner auth-page-inner--wide">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#1C39BB]">District Coordinator</p>
            <h1 className="font-serif text-2xl text-setu-charcoal">
              {session?.name || "Coordinator Portal"}
            </h1>
            <p className="text-sm text-setu-muted">{session?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-[#D2DEFF] bg-white px-4 py-2 text-sm font-medium"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#D2DEFF] bg-white p-5">
            <h2 className="font-semibold text-setu-charcoal">Your roles</h2>
            <ul className="mt-3 space-y-2 text-sm text-setu-muted">
              {roles.length === 0 ? (
                <li>No roles assigned yet.</li>
              ) : (
                roles.map((r) => (
                  <li key={r.id || r.role_name}>
                    {r.role_name}
                    {r.description ? ` — ${r.description}` : ""}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#D2DEFF] bg-white p-5">
            <h2 className="font-semibold text-setu-charcoal">Module access</h2>
            <p className="mt-2 text-sm text-setu-muted">
              Dashboard, reports, government schemes, and authentication modules
              for your district.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
