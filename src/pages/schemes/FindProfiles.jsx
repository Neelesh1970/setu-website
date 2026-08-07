import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Loader2, Play, Plus, Trash2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import {
  clearWizardDraft,
  deleteMyschemeSearch,
  fetchMyschemeSearches,
  normalizeSavedSearchParams,
} from "../../api/schemes"
import { SchemesShell } from "./SchemesShell"

const LABEL = {
  gender: "Gender",
  age: "Age",
  caste: "Caste",
  beneficiaryState: "State",
  residence: "Residence",
  maritalStatus: "Marital status",
  employmentStatus: "Employment",
  occupation: "Occupation",
  isStudent: "Student",
  minority: "Minority",
  disability: "Disability",
  isBpl: "BPL",
  isGovEmployee: "Govt employee",
  isEconomicDistress: "Economic distress",
}

function summarizeParams(params) {
  if (!params || typeof params !== "object") return []
  return Object.entries(LABEL)
    .map(([key, label]) => {
      const val = params[key]
      if (val == null || val === "") return null
      return `${label}: ${val}`
    })
    .filter(Boolean)
    .slice(0, 6)
}

export default function FindProfiles() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searches, setSearches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState(null)

  const userId = session?.user_id != null ? Number(session.user_id) : null
  const auth = {
    token: session?.token,
    refreshToken: session?.refreshToken,
  }

  const load = useCallback(async () => {
    if (!userId || !Number.isFinite(userId)) {
      setLoading(false)
      setSearches([])
      return
    }
    try {
      setLoading(true)
      setError("")
      const res = await fetchMyschemeSearches(userId, 1, auth)
      const list = res?.data?.searches || res?.searches || []
      setSearches(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err.message || "Failed to load saved searches")
    } finally {
      setLoading(false)
    }
  }, [userId, session?.token, session?.refreshToken])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (id) => {
    if (!id || !userId) return
    setDeletingId(id)
    try {
      await deleteMyschemeSearch(id, userId, auth)
      setSearches((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(err.message || "Failed to delete")
    } finally {
      setDeletingId(null)
    }
  }

  const rerun = (item) => {
    const params = normalizeSavedSearchParams(
      item.search_params || item.searchParams || {},
    )
    navigate("/app/govt-schemes/find/results", {
      state: { searchParams: params, from: "profiles" },
    })
  }

  return (
    <SchemesShell title="Saved searches" backTo="/app/govt-schemes">
      <Link
        to="/app/govt-schemes/find"
        state={{ from: "profiles" }}
        onClick={() => clearWizardDraft()}
        className="mb-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1F4B99] px-5 py-3 text-sm font-semibold text-white"
      >
        <Plus size={16} />
        Start new search
      </Link>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#1F4B99]" size={28} />
        </div>
      ) : null}

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      {!loading ? (
        <div className="space-y-3">
          {searches.map((item) => {
            const params = item.search_params || item.searchParams || {}
            const lines = summarizeParams(params)
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#1C1C1C]">
                      {params.beneficiaryState || "Profile"} · {params.gender || "—"}
                      {params.age ? `, ${params.age}y` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[#6B7280]">
                      {item.total_results != null
                        ? `${item.total_results} results when saved`
                        : "Saved profile"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-2 text-[#9CA3AF] hover:bg-red-50 hover:text-red-600"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
                {lines.length ? (
                  <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">
                    {lines.join(" · ")}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => rerun(item)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#EEF3FF] px-3 py-1.5 text-xs font-semibold text-[#1F4B99]"
                >
                  <Play size={12} />
                  View Matching Schemes
                </button>
              </div>
            )
          })}
          {searches.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#6B7280]">
              No saved searches yet. Start a new eligibility check.
            </p>
          ) : null}
        </div>
      ) : null}
    </SchemesShell>
  )
}
