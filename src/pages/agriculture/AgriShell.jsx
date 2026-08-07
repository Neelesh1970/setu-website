import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { AGRI_PRIMARY } from "../../api/agri"

export function AgriShell({
  title,
  backTo = "/app/agriculture",
  onBack = null,
  children,
  className = "",
  maxWidth = "max-w-full sm:max-w-3xl md:max-w-5xl lg:max-w-7xl mx-auto",
  showBack = true,
  rightAction = null,
}) {
  const navigate = useNavigate()

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
    <main className="app-shell-main" style={{ backgroundColor: "#F5F8F3" }}>
      <div
        className="app-shell-header border-b border-[#D9E3D7]"
        style={{ backgroundColor: AGRI_PRIMARY }}
      >
        <div
          className={`mx-auto flex min-h-11 items-center gap-2 ${maxWidth} px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3`}
        >
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="tap-target inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm text-white/90 hover:bg-white/10"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back</span>
            </button>
          ) : (
            <span className="w-10 shrink-0 sm:w-16" />
          )}
          <h1 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-white sm:text-lg">
            {title || "Agri Connect"}
          </h1>
          <div className="flex min-w-10 justify-end sm:min-w-16">{rightAction}</div>
        </div>
      </div>
      <div
        className={`mx-auto ${maxWidth} px-3 py-3 sm:px-6 sm:py-6 lg:px-8 ${className}`}
      >
        {children}
      </div>
    </main>
  )
}
