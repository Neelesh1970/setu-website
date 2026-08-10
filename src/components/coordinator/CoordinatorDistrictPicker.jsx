import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, MapPin } from "lucide-react"

function normalizeQuery(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function matchDistrict(district, query) {
  if (!query) return true
  const haystack = [
    district.label,
    district.name,
    district.state,
    district.stateCode,
    district.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(query)
}

/**
 * Searchable district picker scoped to coordinator-assigned territories.
 */
export default function CoordinatorDistrictPicker({
  districts = [],
  value,
  onChange,
  disabled = false,
  required = false,
  publicMode = false,
}) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selected = useMemo(
    () => districts.find((d) => d.id === value) || null,
    [districts, value],
  )

  const suggestions = useMemo(() => {
    const q = normalizeQuery(query)
    return districts.filter((d) => matchDistrict(d, q))
  }, [districts, query])

  useEffect(() => {
    if (selected && !open) {
      setQuery(selected.label)
    }
  }, [selected, open])

  useEffect(() => {
    if (!open) return
    const onOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        if (selected) setQuery(selected.label)
        else if (!value) setQuery("")
      }
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [open, selected, value])

  const pick = (district) => {
    onChange(district.id)
    setQuery(district.label)
    setOpen(false)
  }

  if (districts.length === 1) {
    const only = districts[0]
    return (
      <div className="rounded-xl border border-[#D2DEFF] bg-[#F7FAFF] px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-setu-muted">
          Assigned district
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm font-medium text-setu-charcoal">
          <MapPin size={14} className="text-[#1C39BB]" />
          {only.label}
        </p>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-setu-muted">
        District {required && <span className="text-red-600">*</span>}
      </label>
      <div className="relative">
        <MapPin
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#1C39BB]"
        />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          required={required && !value}
          placeholder={publicMode ? "Search district…" : "Search your assigned districts…"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value.trim()) onChange("")
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-xl border border-[#D2DEFF] bg-white py-2.5 pl-9 pr-10 text-sm outline-none focus:border-[#1C39BB] disabled:opacity-60"
        />
        <ChevronDown
          size={16}
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-setu-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#D2DEFF] bg-white py-1 shadow-lg"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-3 text-sm text-setu-muted">
              {publicMode
                ? "No matching district found."
                : "No matching district in your assigned territories."}
            </li>
          ) : (
            suggestions.map((district) => (
              <li key={district.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === district.id}
                  onClick={() => pick(district)}
                  className={`flex w-full flex-col items-start px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#EEF3FF] ${
                    value === district.id ? "bg-[#EEF3FF] font-medium text-[#1C39BB]" : "text-setu-charcoal"
                  }`}
                >
                  <span>{district.name}</span>
                  <span className="text-xs text-setu-muted">
                    {district.state}
                    {district.stateCode ? ` · ${district.stateCode}` : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {districts.length > 0 && !publicMode && (
        <p className="mt-1.5 text-xs text-setu-muted">
          {districts.length} district{districts.length !== 1 ? "s" : ""} assigned to you
        </p>
      )}
      {districts.length > 0 && publicMode && (
        <p className="mt-1.5 text-xs text-setu-muted">
          Select the district where you will operate as a VLE
        </p>
      )}
    </div>
  )
}
