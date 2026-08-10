import { useLayoutEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { LayoutGrid, LogOut, Menu, Users, X } from "lucide-react"
import { assets } from "../data/content"
import { useAuth } from "../context/AuthContext"

const SUPER_ADMIN_TABS = [
  { id: "coordinators", label: "Coordinators", to: "/super-admin/coordinators", end: true, Icon: Users },
]

export default function SuperAdminLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef(null)

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return
    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--super-admin-header-height",
        `${header.offsetHeight}px`,
      )
    }
    syncHeaderHeight()
    const observer = new ResizeObserver(syncHeaderHeight)
    observer.observe(header)
    window.addEventListener("resize", syncHeaderHeight)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", syncHeaderHeight)
    }
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate("/")
  }

  const displayName = session?.name || "Super Admin"
  const linkClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-2 text-sm font-medium transition-colors ${
      isActive
        ? "border-setu-coral/55 bg-setu-coral/10 text-setu-beige"
        : "border-transparent text-setu-sand/90 hover:border-setu-coral hover:bg-setu-coral/10 hover:text-setu-beige"
    }`

  return (
    <div className="flex min-h-svh min-h-dvh flex-col overflow-x-hidden bg-[#F7FAFF]">
      <header
        ref={headerRef}
        className="app-safe-top sticky top-0 z-40 border-b text-setu-sand shadow-sm backdrop-blur-md"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-setu-charcoal) 92%, transparent)",
          borderColor: "color-mix(in srgb, var(--color-setu-stone) 20%, transparent)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
          <Link
            to="/super-admin/coordinators"
            className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3 lg:max-w-[18rem]"
          >
            <img
              src={assets.logo}
              alt="SETU"
              className="h-7 w-auto shrink-0 brightness-0 invert sm:h-8"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-setu-sand">{displayName}</p>
              <p className="truncate text-[11px] text-setu-sand/70 sm:text-xs">
                Super Admin · District Coordinator management
              </p>
            </div>
          </Link>

          <nav
            className="ml-auto hidden min-w-0 flex-1 items-center justify-end gap-0.5 lg:flex"
            aria-label="Super Admin"
          >
            {SUPER_ADMIN_TABS.map((tab) => (
              <NavLink key={tab.id} to={tab.to} end={tab.end} className={linkClass}>
                <tab.Icon size={16} />
                <span>{tab.label}</span>
              </NavLink>
            ))}
            <Link to="/" className={linkClass({ isActive: false })}>
              <LayoutGrid size={16} />
              <span>Website</span>
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleLogout}
              className="tap-target hidden items-center justify-center gap-1.5 rounded-full border border-setu-stone/25 px-2.5 py-2 text-sm font-medium text-setu-sand transition-colors hover:border-setu-coral hover:bg-setu-coral/10 hover:text-setu-beige lg:inline-flex"
            >
              <LogOut size={16} />
              Logout
            </button>
            <button
              type="button"
              className="tap-target inline-flex items-center justify-center rounded-full p-2 text-setu-sand transition-colors hover:bg-setu-coral/10 hover:text-setu-beige lg:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            className="border-t px-3 py-3 lg:hidden"
            style={{
              borderColor: "color-mix(in srgb, var(--color-setu-stone) 20%, transparent)",
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {SUPER_ADMIN_TABS.map((tab) => (
                <NavLink
                  key={tab.id}
                  to={tab.to}
                  end={tab.end}
                  onClick={() => setMenuOpen(false)}
                  className={linkClass}
                >
                  <tab.Icon size={16} />
                  {tab.label}
                </NavLink>
              ))}
              <Link to="/" onClick={() => setMenuOpen(false)} className={linkClass({ isActive: false })}>
                <LayoutGrid size={16} />
                Website
              </Link>
              <button type="button" onClick={handleLogout} className={`${linkClass({ isActive: false })} justify-start`}>
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="min-w-0 flex-1 overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  )
}
