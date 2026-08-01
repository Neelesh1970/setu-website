import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  Headphones,
  Home,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  MoreHorizontal,
  Search,
  Trophy,
  UserPlus,
  Wallet,
  X,
} from "lucide-react"
import { assets } from "../data/content"
import { useAuth } from "../context/AuthContext"

const VLE_TABS = [
  { id: "dashboard", label: "Dashboard", to: "/vle/dashboard", end: true, Icon: Home },
  { id: "register", label: "Register", to: "/vle/register-user", Icon: UserPlus },
  { id: "customers", label: "Customers", to: "/vle/customers", Icon: Search },
  { id: "wallet", label: "Wallet", to: "/vle/wallet", Icon: Wallet },
  { id: "rewards", label: "Rewards", to: "/vle/rewards", Icon: Trophy },
]

const VLE_MORE_LINKS = [
  { label: "Marketing Kit", to: "/vle/marketing", Icon: Megaphone },
  { label: "Support", to: "/vle/support", Icon: Headphones },
  { label: "Leaderboard", to: "/vle/leaderboard", Icon: Trophy },
  { label: "Website", to: "/", Icon: LayoutGrid },
]

export default function VleLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  const headerRef = useRef(null)

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--vle-header-height",
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

  useEffect(() => {
    if (!moreOpen) return
    const onOutside = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [moreOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    setMoreOpen(false)
    logout()
    navigate("/")
  }

  const displayName = session?.name || session?.vlePublicId || "VLE Portal"
  const vleId = session?.vlePublicId || session?.vle_id || ""

  const linkClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-2 text-sm font-medium transition-colors ${
      isActive
        ? "border-setu-coral/55 bg-setu-coral/10 text-setu-beige"
        : "border-transparent text-setu-sand/90 hover:border-setu-coral hover:bg-setu-coral/10 hover:text-setu-beige"
    }`

  const mutedLinkClass =
    "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-2 text-sm font-medium text-setu-sand/90 transition-colors hover:border-setu-coral hover:bg-setu-coral/10 hover:text-setu-beige"

  const renderNavLink = (tab, { iconOnly = false } = {}) => (
    <NavLink
      key={tab.id}
      to={tab.to}
      end={tab.end}
      onClick={() => setMenuOpen(false)}
      className={linkClass}
      title={tab.label}
    >
      <tab.Icon size={16} />
      {!iconOnly && <span className="hidden xl:inline">{tab.label}</span>}
      {iconOnly && <span className="sr-only">{tab.label}</span>}
    </NavLink>
  )

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
            to="/vle/dashboard"
            className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3 lg:max-w-[14rem]"
          >
            <img
              src={assets.logo}
              alt="SETU"
              className="h-7 w-auto shrink-0 brightness-0 invert sm:h-8"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-setu-sand">{displayName}</p>
              {vleId ? (
                <p className="truncate text-[11px] text-setu-sand/70 sm:text-xs">VLE · {vleId}</p>
              ) : (
                <p className="truncate text-[11px] text-setu-sand/70 sm:text-xs">VLE Portal</p>
              )}
            </div>
          </Link>

          <nav
            className="ml-auto hidden min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto lg:flex xl:gap-1"
            aria-label="VLE"
          >
            {VLE_TABS.map((tab) => renderNavLink(tab))}
          </nav>

          <div className="relative flex shrink-0 items-center gap-1 sm:gap-1.5">
            <div ref={moreRef} className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                className={`${mutedLinkClass} tap-target`}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                title="More"
              >
                <MoreHorizontal size={16} />
                <span className="hidden xl:inline">More</span>
              </button>
              {moreOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-xl border border-setu-stone/20 py-1 shadow-lg"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-setu-charcoal) 98%, transparent)",
                  }}
                  role="menu"
                >
                  {VLE_MORE_LINKS.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-setu-sand/90 transition-colors hover:bg-setu-coral/10 hover:text-setu-beige"
                    >
                      <link.Icon size={16} />
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="tap-target hidden items-center justify-center gap-1.5 rounded-full border border-setu-stone/25 px-2.5 py-2 text-sm font-medium text-setu-sand transition-colors hover:border-setu-coral hover:bg-setu-coral/10 hover:text-setu-beige lg:inline-flex"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="hidden xl:inline">Logout</span>
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
              {VLE_TABS.map((tab) => renderNavLink(tab))}
              {VLE_MORE_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={mutedLinkClass}
                >
                  <link.Icon size={16} />
                  {link.label}
                </Link>
              ))}
              <button type="button" onClick={handleLogout} className={`${mutedLinkClass} justify-start`}>
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Tablet: compact icon nav */}
      <nav
        className="sticky top-[var(--vle-header-height,3.25rem)] z-30 hidden border-b border-[#D2DEFF] bg-white/95 px-2 py-2 backdrop-blur-sm md:flex lg:hidden"
        aria-label="VLE tabs"
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-center gap-1">
          {VLE_TABS.map((tab) => (
            <NavLink
              key={tab.id}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `inline-flex flex-1 max-w-[8rem] flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#1C39BB] text-white"
                    : "text-setu-muted hover:bg-[#EEF3FF] hover:text-[#1C39BB]"
                }`
              }
            >
              <tab.Icon size={18} />
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile bottom nav — matches app-style thumb reach */}
      <nav
        className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[#D2DEFF] bg-white/95 backdrop-blur-md md:hidden"
        aria-label="VLE bottom navigation"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
          {VLE_TABS.map((tab) => (
            <NavLink
              key={tab.id}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors ${
                  isActive ? "text-[#1C39BB]" : "text-setu-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      isActive ? "bg-[#EEF3FF]" : ""
                    }`}
                  >
                    <tab.Icon size={20} className={isActive ? "text-[#1C39BB]" : ""} />
                  </span>
                  <span className="truncate">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="vle-main-with-bottom-nav min-w-0 flex-1 overflow-x-hidden md:pb-0">
        <Outlet />
      </div>
    </div>
  )
}
