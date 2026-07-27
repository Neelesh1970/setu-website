import { useEffect } from "react"
import { useLocation } from "react-router-dom"

const THEMES = {
  home: {
    top: "#3f4a54",
    bottom: "#faf9f7",
    themeColor: "#3f4a54",
    appleStatusBar: "black-translucent",
  },
  dark: {
    top: "#2a2826",
    bottom: "#faf9f7",
    themeColor: "#2a2826",
    appleStatusBar: "black-translucent",
  },
  auth: {
    top: "#F7FAFF",
    bottom: "#F7FAFF",
    themeColor: "#1C39BB",
    appleStatusBar: "default",
  },
  vle: {
    top: "#3f4a54",
    bottom: "#ffffff",
    themeColor: "#3f4a54",
    appleStatusBar: "black-translucent",
  },
  app: {
    top: "#2a2826",
    bottom: "#faf9f7",
    themeColor: "#2a2826",
    appleStatusBar: "black-translucent",
  },
}

function resolveTheme(pathname) {
  if (pathname === "/" || pathname === "") return THEMES.home
  if (pathname.startsWith("/vle")) return THEMES.vle
  if (pathname.startsWith("/app")) return THEMES.app
  if (pathname.startsWith("/coordinator")) return THEMES.auth
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return THEMES.auth
  }
  return THEMES.dark
}

function themeKey(pathname) {
  if (pathname === "/" || pathname === "") return "home"
  if (pathname.startsWith("/vle")) return "vle"
  if (pathname.startsWith("/app")) return "app"
  if (pathname.startsWith("/coordinator")) return "auth"
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return "auth"
  return "dark"
}

function setMeta(name, content, attribute = "name") {
  let el = document.querySelector(`meta[${attribute}="${name}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attribute, name)
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

export default function MobileStatusBar() {
  const { pathname } = useLocation()
  const theme = resolveTheme(pathname)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--status-bar-top-bg", theme.top)
    root.style.setProperty("--status-bar-bottom-bg", theme.bottom)
    root.style.setProperty("--page-bg", theme.top)
    root.dataset.statusBarTheme = themeKey(pathname)

    const isHome = pathname === "/" || pathname === ""
    root.style.setProperty("--page-bg", isHome ? theme.top : theme.bottom)
    root.style.backgroundColor = isHome ? theme.top : theme.bottom
    document.body.style.backgroundColor = isHome ? theme.top : theme.bottom

    setMeta("theme-color", theme.themeColor)
    setMeta("apple-mobile-web-app-status-bar-style", theme.appleStatusBar)
  }, [pathname, theme])

  return (
    <>
      <div className="mobile-status-bar mobile-status-bar--top" aria-hidden="true" />
      <div className="mobile-status-bar mobile-status-bar--bottom" aria-hidden="true" />
    </>
  )
}
