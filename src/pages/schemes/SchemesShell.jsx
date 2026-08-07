import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { SCHEMES_PRIMARY } from "../../api/schemes"

export function SchemesShell({
  title,
  backTo = "/app/govt-schemes",
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
    <main className="app-shell-main bg-[#FEFEFE]">
      <div
        className="app-shell-header border-b border-[#E5E7EB]"
        style={{ backgroundColor: SCHEMES_PRIMARY }}
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
            {title || "Government Schemes"}
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

export function SchemeCard({ title, description, meta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition hover:border-[#1F4B99]/40"
    >
      <p className="font-semibold text-[#1a365d]">{title}</p>
      {description ? (
        <p className="mt-1 line-clamp-2 text-sm text-[#4a5568]">{description}</p>
      ) : null}
      {meta ? <p className="mt-2 text-xs font-medium text-[#1F4B99]">{meta}</p> : null}
    </button>
  )
}

export function ChipSelect({ options, value, onChange, columns = 2 }) {
  return (
    <div
      className={`grid gap-2 ${columns === 3 ? "grid-cols-3" : columns === 1 ? "grid-cols-1" : "grid-cols-2"}`}
    >
      {options.map((opt) => {
        const selected = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(selected ? "" : opt)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
              selected
                ? "border-[#1F4B99] bg-[#1F4B99] text-white"
                : "border-[#E5E7EB] bg-white text-[#1C1C1C] hover:border-[#1F4B99]/50"
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
