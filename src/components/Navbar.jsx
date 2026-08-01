import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Menu, X, LayoutGrid } from "lucide-react"
import { navLinksLeft, navLinksRight, assets } from "../data/content"
import NavLink from "./NavLink"
import { useAuth } from "../context/AuthContext"

const SCROLL_THRESHOLD = 56
const SCROLL_END_DELAY = 550
const NAV_SCROLL_TIMEOUT = 1400
const MOUNT_GUARD_MS = 150

const easeOut = [0.16, 1, 0.3, 1]
const easeInOut = [0.4, 0, 0.2, 1]

const collapseTransition = {
  duration: 0.65,
  ease: easeOut,
}

const expandTransition = {
  duration: 0.85,
  ease: easeInOut,
}

const noTransition = { duration: 0 }

const pillStyle = {
  borderColor: "color-mix(in srgb, var(--color-setu-stone) 20%, transparent)",
  backgroundColor: "color-mix(in srgb, var(--color-setu-charcoal) 52%, transparent)",
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [scrollAnimationsEnabled, setScrollAnimationsEnabled] = useState(false)
  const [isNavigatingState, setIsNavigatingState] = useState(false)
  const scrollEndTimer = useRef(null)
  const navScrollTimer = useRef(null)
  const isNavigating = useRef(false)
  const mountReady = useRef(false)
  const prefersReducedMotion = useReducedMotion()

  const openAuth = (path) => {
    setMobileOpen(false)
    navigate(path)
  }

  const beginAnchorNavigation = () => {
    isNavigating.current = true
    setIsNavigatingState(true)
    setCompact(false)

    if (navScrollTimer.current) clearTimeout(navScrollTimer.current)
    navScrollTimer.current = setTimeout(() => {
      isNavigating.current = false
      setIsNavigatingState(false)
    }, NAV_SCROLL_TIMEOUT)
  }

  const endAnchorNavigation = () => {
    isNavigating.current = false
    setIsNavigatingState(false)
    if (navScrollTimer.current) clearTimeout(navScrollTimer.current)
  }

  const handleAnchorClick = (href) => {
    if (href.startsWith("#")) beginAnchorNavigation()
  }

  useEffect(() => {
    const mountTimer = setTimeout(() => {
      mountReady.current = true
    }, MOUNT_GUARD_MS)

    return () => clearTimeout(mountTimer)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  useEffect(() => {
    const handleScroll = () => {
      if (!mountReady.current) return

      if (!scrollAnimationsEnabled) {
        setScrollAnimationsEnabled(true)
      }

      if (isNavigating.current) {
        setCompact(false)
        return
      }

      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current)

      const scrollY = window.scrollY

      if (scrollY < SCROLL_THRESHOLD) {
        setCompact(false)
        return
      }

      setCompact(true)

      scrollEndTimer.current = setTimeout(() => {
        setCompact(false)
      }, SCROLL_END_DELAY)
    }

    const handleScrollEnd = () => {
      if (isNavigating.current) endAnchorNavigation()
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("scrollend", handleScrollEnd, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("scrollend", handleScrollEnd)
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current)
      if (navScrollTimer.current) clearTimeout(navScrollTimer.current)
    }
  }, [])

  const animationsActive =
    scrollAnimationsEnabled && !prefersReducedMotion && !isNavigatingState

  const motionTransition = !animationsActive
    ? noTransition
    : compact
      ? collapseTransition
      : expandTransition

  const contentTransition = !animationsActive
    ? noTransition
    : {
        ...motionTransition,
        opacity: { duration: compact ? 0.5 : 0.7, ease: easeOut },
      }

  const AuthCta = ({ className = "" }) =>
    isAuthenticated ? (
      <Link
        to="/app"
        className={`btn-primary btn-primary-white inline-flex items-center gap-1.5 px-3 py-2 text-xs ${className}`}
        onClick={() => setMobileOpen(false)}
      >
        <LayoutGrid size={14} />
        App
      </Link>
    ) : (
      <button
        type="button"
        className={`btn-primary btn-primary-white px-3 py-2 text-xs ${className}`}
        onClick={() => openAuth("/login")}
      >
        Login
      </button>
    )

  return (
    <>
      <header
        className="pointer-events-none fixed inset-x-0 z-50 flex lg:justify-center"
        style={{
          top: 0,
          paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
          paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
        }}
      >
        {/* Mobile / tablet — hamburger left corner, logo center, login right */}
        <nav className="pointer-events-auto relative flex w-full items-center lg:hidden">
          <button
            type="button"
            className="tap-target inline-flex shrink-0 items-center justify-center rounded-full border p-2 text-setu-sand backdrop-blur-md transition-colors hover:text-setu-beige"
            style={pillStyle}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <a
            href="/"
            onClick={() => handleAnchorClick("/")}
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
          >
            <img
              src={assets.logo}
              alt="SETU"
              className="h-7 w-auto max-w-[88px] object-contain brightness-0 invert"
            />
          </a>

          <div className="ml-auto shrink-0">
            <AuthCta />
          </div>
        </nav>

        {/* Desktop floating capsule */}
        <motion.nav
          layout={scrollAnimationsEnabled}
          className="pointer-events-auto hidden max-w-[calc(100vw-2rem)] items-center overflow-hidden rounded-full border backdrop-blur-md lg:inline-flex"
          initial={false}
          animate={{
            paddingLeft: compact ? 12 : 16,
            paddingRight: compact ? 12 : 16,
            paddingTop: compact ? 8 : 10,
            paddingBottom: compact ? 8 : 10,
            gap: compact ? 0 : 12,
          }}
          style={pillStyle}
          transition={{ layout: motionTransition, default: motionTransition }}
        >
          <motion.a
            layout={scrollAnimationsEnabled ? "position" : false}
            href="/"
            onClick={() => handleAnchorClick("/")}
            className="relative z-10 flex shrink-0 items-center"
            transition={motionTransition}
          >
            <motion.img
              src={assets.logo}
              alt="SETU"
              animate={{
                scale: compact ? 0.94 : 1,
                opacity: 1,
              }}
              className="h-8 w-auto max-w-[104px] object-contain brightness-0 invert"
              transition={motionTransition}
            />
          </motion.a>

          <motion.div
            className="flex items-center overflow-hidden whitespace-nowrap"
            initial={false}
            animate={{
              opacity: compact ? 0 : 1,
              maxWidth: compact ? 0 : 900,
              x: compact ? 20 : 0,
            }}
            transition={contentTransition}
            style={{
              pointerEvents: compact ? "none" : "auto",
              transformOrigin: "left center",
              willChange: "max-width, opacity, transform",
            }}
          >
            <motion.div
              className="flex items-center gap-3 xl:gap-4"
              animate={{ scale: compact ? 0.98 : 1 }}
              transition={contentTransition}
            >
              <ul className="flex items-center gap-0.5">
                {navLinksLeft.map((link) => (
                  <li key={link.href}>
                    <NavLink
                      href={link.href}
                      label={link.label}
                      onNavigate={handleAnchorClick}
                    />
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-1">
                <ul className="flex items-center gap-0.5">
                  {navLinksRight.map((link) => (
                    <li key={link.href}>
                      <NavLink
                        href={link.href}
                        label={link.label}
                        onNavigate={handleAnchorClick}
                      />
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className="nav-link ml-1"
                  onClick={() => handleAnchorClick("#contact")}
                >
                  Get in Touch
                </a>
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => openAuth("/register")}
                >
                  Register
                </button>
                <AuthCta className="ml-0.5" />
              </div>
            </motion.div>
          </motion.div>
        </motion.nav>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: easeInOut }}
            className="fixed inset-0 z-[60] bg-setu-charcoal/98 backdrop-blur-sm lg:hidden"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              paddingLeft: "env(safe-area-inset-left, 0px)",
              paddingRight: "env(safe-area-inset-right, 0px)",
            }}
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-6 sm:py-5">
                <img
                  src={assets.logo}
                  alt="SETU"
                  className="h-8 w-auto max-w-[104px] brightness-0 invert"
                />
                <button
                  type="button"
                  className="tap-target inline-flex items-center justify-center rounded-full p-2 text-setu-stone"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>

              <motion.ul
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.06 } },
                }}
                className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-4"
              >
                {[...navLinksLeft, ...navLinksRight].map((link) => (
                  <motion.li
                    key={link.href}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      visible: { opacity: 1, y: 0 },
                    }}
                  >
                    <a
                      href={link.href}
                      className="nav-link text-lg"
                      onClick={() => {
                        handleAnchorClick(link.href)
                        setMobileOpen(false)
                      }}
                    >
                      {link.label}
                    </a>
                  </motion.li>
                ))}
                <motion.li
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className="flex w-full max-w-xs flex-col items-stretch gap-3 pt-2"
                >
                  <a
                    href="#contact"
                    className="nav-link justify-center text-lg"
                    onClick={() => {
                      handleAnchorClick("#contact")
                      setMobileOpen(false)
                    }}
                  >
                    Get in Touch
                  </a>
                  <button
                    type="button"
                    className="nav-link justify-center text-lg"
                    onClick={() => openAuth("/register")}
                  >
                    Register
                  </button>
                  {isAuthenticated ? (
                    <Link
                      to="/app"
                      className="btn-primary btn-primary-white inline-flex items-center justify-center gap-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      <LayoutGrid size={16} />
                      Open App
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary btn-primary-white"
                      onClick={() => openAuth("/login")}
                    >
                      Login
                    </button>
                  )}
                </motion.li>
              </motion.ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
