import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, Dumbbell, Home, Salad, User } from "lucide-react"
import { FITNESS_PRIMARY } from "../../api/fitness"

const TABS = [
  { to: "/app/fitness/home", label: "Home", icon: Home, match: ["/app/fitness", "/app/fitness/home"] },
  { to: "/app/fitness/workout", label: "Workout", icon: Dumbbell, match: ["/app/fitness/workout"] },
  { to: "/app/fitness/food", label: "Food", icon: Salad, match: ["/app/fitness/food"] },
  { to: "/app/fitness/profile", label: "Profile", icon: User, match: ["/app/fitness/profile"] },
]

function tabActive(pathname, match) {
  return match.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function FitnessShell({
  title,
  backTo = "/app/fitness/home",
  onBack = null,
  children,
  className = "",
maxWidth = "max-w-full sm:max-w-3xl md:max-w-5xl lg:max-w-7xl mx-auto",
  showBack = true,
  showTabs = true,
  rightAction = null,
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack()
      return
    }
    if (backTo) {
      navigate(backTo)
      return
    }
    navigate(-1)
  }

  return (
    <main
      className={showTabs ? "app-shell-main-with-tabs" : "app-shell-main"}
      style={{ backgroundColor: "#F5F7FA" }}
    >
      <div
        className="app-shell-header sticky top-0 z-30 rounded-b-2xl border-b border-emerald-900/10"
        style={{ backgroundColor: FITNESS_PRIMARY }}
      >
        <div
          className={`mx-auto flex min-h-11 items-center gap-2 ${maxWidth} px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3`}
        >
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="tap-target inline-flex shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-sm text-white/90 hover:bg-white/10"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
              <span className="hidden xs:inline sm:inline">Back</span>
            </button>
          ) : (
            <span className="w-10 shrink-0 sm:w-16" />
          )}
          <h1 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-white sm:text-lg">
            {title || "Fitness"}
          </h1>
          <div className="flex min-w-10 shrink-0 justify-end sm:min-w-16">
            {rightAction}
          </div>
        </div>
      </div>

      <div
        className={`mx-auto ${maxWidth} px-3 py-3 sm:px-6 sm:py-6 ${className}`}
      >
        {children}
      </div>

      {showTabs && (
        <nav
          className="app-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E7EB] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto grid max-w-3xl grid-cols-4 gap-0.5 px-1 pt-1.5 sm:px-2 sm:pt-2">
            {TABS.map(({ to, label, icon: Icon, match }) => {
              const active = tabActive(pathname, match)
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium sm:text-[11px] ${
                    active ? "text-[#10B981]" : "text-[#6B7280]"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.25 : 2} />
                  {label}
                </NavLink>
              )
            })}
          </div>
        </nav>
      )}
    </main>
  )
}
