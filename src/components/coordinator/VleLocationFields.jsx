import { useEffect, useRef, useState } from "react"
import { Loader2, MapPin } from "lucide-react"
import { lookupPincode } from "../../api/pincode"

export function formatVleLocation(vle = {}) {
  const label = vle.locationLabel
  if (label) return label
  return [vle.village, vle.city, vle.districtName, vle.state].filter(Boolean).join(", ") || "—"
}

export default function VleLocationFields({
  state,
  city,
  village,
  pincode,
  onChange,
  onDistrictMatch,
  districtLabel = "",
  pincodeFirst = true,
  pincodeRequired = true,
}) {
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const lastLookupRef = useRef("")

  useEffect(() => {
    const code = String(pincode || "").replace(/\D/g, "")
    if (code.length !== 6 || code === lastLookupRef.current) return

    let cancelled = false
    const timer = setTimeout(async () => {
      setLookupLoading(true)
      setLookupError("")
      try {
        const result = await lookupPincode(code)
        if (cancelled) return
        lastLookupRef.current = code
        onChange({
          pincode: code,
          state: result.state || state,
          city: result.city || city,
          village: result.village || village,
        })
        if (result.districtId && onDistrictMatch) {
          onDistrictMatch(result.districtId, result.district)
        }
        setSuggestions(result.postOffices || [])
      } catch (err) {
        if (!cancelled) {
          setLookupError(err.message || "Pincode lookup failed.")
          setSuggestions([])
        }
      } finally {
        if (!cancelled) setLookupLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [pincode, onDistrictMatch])

  const pickSuggestion = (office) => {
    onChange({
      village: office.village || office.name || village,
      city: office.city || office.district || city,
      state: office.state || state,
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#D2DEFF] bg-[#F7FAFF] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1C39BB]">
          VLE territory
        </p>
        {pincodeFirst && (
          <span className="text-[10px] font-medium text-setu-muted">Pincode auto-fill enabled</span>
        )}
      </div>

      {pincodeFirst && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-setu-muted">
            Pincode {pincodeRequired && <span className="text-red-600">*</span>}
            {pincodeFirst && (
              <span className="text-[#1C39BB]"> — auto-fills district, city & area</span>
            )}
          </span>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required={pincodeRequired}
              className="w-full rounded-xl border border-[#D2DEFF] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
              placeholder="Enter 6-digit pincode"
              value={pincode}
              onChange={(e) => {
                lastLookupRef.current = ""
                onChange({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
              }}
            />
            {lookupLoading && (
              <Loader2
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#1C39BB]"
              />
            )}
          </div>
          {lookupError && <p className="mt-1 text-xs text-red-600">{lookupError}</p>}
          {districtLabel && (
            <p className="mt-2 rounded-lg bg-[#EEF3FF] px-3 py-2 text-sm text-setu-charcoal">
              District: <span className="font-medium text-[#1C39BB]">{districtLabel}</span>
            </p>
          )}
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-setu-muted">State</span>
          <input
            type="text"
            readOnly
            className="w-full rounded-xl border border-[#D2DEFF] bg-[#EEF3FF] px-3 py-2.5 text-sm outline-none"
            placeholder="Auto-filled from pincode"
            value={state}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-setu-muted">
            City / District <span className="text-red-600">*</span>
          </span>
          <input
            required
            type="text"
            className="w-full rounded-xl border border-[#D2DEFF] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
            placeholder="e.g. Pune"
            value={city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-setu-muted">Village / Area</span>
          <input
            type="text"
            className="w-full rounded-xl border border-[#D2DEFF] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
            placeholder="e.g. Hadapsar"
            value={village}
            onChange={(e) => onChange({ village: e.target.value })}
          />
        </label>
        {!pincodeFirst && (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-setu-muted">Pincode</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-xl border border-[#D2DEFF] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1C39BB]"
              placeholder="6-digit pincode"
              value={pincode}
              onChange={(e) =>
                onChange({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
              }
            />
          </label>
        )}
      </div>

      {suggestions.length > 1 && (
        <div className="rounded-xl border border-[#D2DEFF] bg-white p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-setu-muted">
            <MapPin size={12} className="text-[#1C39BB]" />
            Areas in this pincode
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 8).map((office) => (
              <button
                key={`${office.name}-${office.branchType}`}
                type="button"
                onClick={() => pickSuggestion(office)}
                className="rounded-full border border-[#D2DEFF] bg-[#F7FAFF] px-2.5 py-1 text-xs text-setu-charcoal transition hover:border-[#1C39BB]/40 hover:bg-[#EEF3FF]"
              >
                {office.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
