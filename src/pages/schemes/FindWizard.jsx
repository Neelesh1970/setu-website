import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import {
  buildMyschemeProfileFields,
  CASTE_OPTIONS,
  clearWizardDraft,
  EMPLOYMENT_OPTIONS,
  GENDER_OPTIONS,
  loadWizardDraft,
  MARITAL_OPTIONS,
  OCCUPATIONS,
  RESIDENCE_OPTIONS,
  saveMyschemeSearch,
  saveWizardDraft,
  STATE_NAMES,
  wizardDraftToUserDetails,
  YES_NO,
} from "../../api/schemes"
import { ChipSelect, SchemesShell } from "./SchemesShell"

const STEPS = [
  { key: "demographics", title: "Demographics", total: 6 },
  { key: "residence", title: "Residence", total: 6 },
  { key: "social", title: "Social status", total: 6 },
  { key: "disability", title: "Disability & minority", total: 6 },
  { key: "employment", title: "Student & employment", total: 6 },
  { key: "income", title: "Income & occupation", total: 6 },
]

function clampStep(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > STEPS.length - 1) return STEPS.length - 1
  return Math.floor(n)
}

export default function FindWizard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const initial = useMemo(() => loadWizardDraft(), [])
  const [step, setStep] = useState(() => clampStep(initial.step))
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const exitTo =
    location.state?.from === "profiles"
      ? "/app/govt-schemes/find/profiles"
      : "/app/govt-schemes"

  const update = (partial) => {
    setDraft((prev) => {
      const next = { ...prev, ...partial }
      saveWizardDraft(next)
      return next
    })
    setError("")
  }

  const goToStep = (nextStep) => {
    const clamped = clampStep(nextStep)
    setStep(clamped)
    setDraft((prev) => {
      const next = { ...prev, step: clamped }
      saveWizardDraft(next)
      return next
    })
    setError("")
  }

  const validateStep = () => {
    if (step === 0) {
      if (!draft.gender) return "Select gender."
      const age = Number(draft.age)
      if (!age || age < 1 || age > 120) return "Enter a valid age."
      if (draft.gender === "Female" && age >= 18 && !draft.maritalStatus) {
        return "Select marital status."
      }
    }
    if (step === 1) {
      if (!draft.state) return "Select your state."
      if (!draft.residence) return "Select residence."
    }
    if (step === 2 && !draft.caste) return "Select caste / category."
    if (step === 3) {
      if (!draft.disability) return "Select disability status."
      if (!draft.minority) return "Select minority status."
    }
    if (step === 4) {
      if (!draft.isStudent) return "Are you a student?"
      if (draft.isStudent === "No" && !draft.employmentStatus) {
        return "Select employment status."
      }
      if (draft.employmentStatus === "Employed" && !draft.isGovEmployee) {
        return "Are you a government employee?"
      }
    }
    if (step === 5) {
      if (!draft.isBpl) return "Select BPL status."
      if (!draft.isEconomicDistress) return "Select economic distress status."
    }
    return ""
  }

  const finish = async () => {
    const msg = validateStep()
    if (msg) {
      setError(msg)
      return
    }
    const userDetails = wizardDraftToUserDetails(draft)
    const searchParams = {
      ...buildMyschemeProfileFields(userDetails),
      from: 0,
      size: 10,
      lang: "en",
      keyword: "",
      sort: "",
    }

    setSaving(true)
    try {
      const userId = session?.user_id != null ? Number(session.user_id) : null
      if (userId && Number.isFinite(userId)) {
        await saveMyschemeSearch(
          {
            user_id: userId,
            search_params: searchParams,
            total_results: 0,
          },
          { token: session?.token, refreshToken: session?.refreshToken },
        ).catch(() => {})
      }
      navigate("/app/govt-schemes/find/results", {
        state: { searchParams, from: "wizard" },
      })
    } finally {
      setSaving(false)
    }
  }

  const next = () => {
    const msg = validateStep()
    if (msg) {
      setError(msg)
      return
    }
    if (step >= STEPS.length - 1) {
      finish()
      return
    }
    goToStep(step + 1)
  }

  const back = () => {
    if (step === 0) {
      navigate(exitTo)
      return
    }
    goToStep(step - 1)
  }

  const current = STEPS[step]
  const showMarital =
    draft.gender === "Female" && Number(draft.age) >= 18
  const showEmployment = draft.isStudent === "No"
  const showGov = showEmployment && draft.employmentStatus === "Employed"
  const showOccupation =
    draft.employmentStatus === "Employed" ||
    draft.employmentStatus === "Self-Employed/ Entrepreneur"

  return (
    <SchemesShell
      title="Find Schemes"
      onBack={back}
      rightAction={
        <button
          type="button"
          onClick={() => {
            clearWizardDraft()
            setDraft({})
            setStep(0)
          }}
          className="text-xs text-white/90 hover:text-white"
        >
          Reset
        </button>
      }
    >
      <div className="mb-4">
        <p className="text-xs font-medium text-[#6B7280]">
          Step {step + 1} of {current.total}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className="h-full rounded-full bg-[#1F4B99] transition-all"
            style={{ width: `${((step + 1) / current.total) * 100}%` }}
          />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-[#1C1C1C]">{current.title}</h2>
      </div>

      {step === 0 ? (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Select your gender</p>
            <ChipSelect
              options={GENDER_OPTIONS}
              value={draft.gender || ""}
              onChange={(v) => update({ gender: v })}
              columns={3}
            />
          </div>
          <label className="block text-sm">
            <span className="mb-2 block font-medium">Enter your age</span>
            <input
              type="number"
              min={1}
              max={120}
              value={draft.age || ""}
              onChange={(e) => update({ age: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 outline-none focus:border-[#1F4B99]"
              placeholder="Enter age"
            />
          </label>
          {showMarital ? (
            <div>
              <p className="mb-2 text-sm font-medium">Marital status</p>
              <ChipSelect
                options={MARITAL_OPTIONS}
                value={draft.maritalStatus || ""}
                onChange={(v) => update({ maritalStatus: v })}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          <label className="block text-sm">
            <span className="mb-2 block font-medium">Select your state</span>
            <select
              value={draft.state || ""}
              onChange={(e) => update({ state: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 outline-none focus:border-[#1F4B99]"
            >
              <option value="">Select state</option>
              {STATE_NAMES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">Select your residence</p>
            <ChipSelect
              options={RESIDENCE_OPTIONS}
              value={draft.residence || ""}
              onChange={(v) => update({ residence: v })}
              columns={3}
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <p className="mb-2 text-sm font-medium">Caste / category</p>
          <ChipSelect
            options={CASTE_OPTIONS}
            value={draft.caste || ""}
            onChange={(v) => update({ caste: v })}
            columns={1}
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Do you have a disability/Do you identify as a person with disability?</p>
            <ChipSelect
              options={YES_NO}
              value={draft.disability || ""}
              onChange={(v) => update({ disability: v })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Belong to a minority community?</p>
            <ChipSelect
              options={YES_NO}
              value={draft.minority || ""}
              onChange={(v) => update({ minority: v })}
            />
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Are you a student?</p>
            <ChipSelect
              options={YES_NO}
              value={draft.isStudent || ""}
              onChange={(v) =>
                update({
                  isStudent: v,
                  employmentStatus: v === "Yes" ? "Student" : draft.employmentStatus,
                })
              }
            />
          </div>
          {showEmployment ? (
            <div>
              <p className="mb-2 text-sm font-medium">Employment status</p>
              <ChipSelect
                options={EMPLOYMENT_OPTIONS.filter((o) => o !== "Student")}
                value={draft.employmentStatus || ""}
                onChange={(v) => update({ employmentStatus: v })}
                columns={1}
              />
            </div>
          ) : null}
          {showGov ? (
            <div>
              <p className="mb-2 text-sm font-medium">Government employee?</p>
              <ChipSelect
                options={YES_NO}
                value={draft.isGovEmployee || ""}
                onChange={(v) => update({ isGovEmployee: v })}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 5 ? (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Belong to Below Poverty Line (BPL) category?</p>
            <ChipSelect
              options={YES_NO}
              value={draft.isBpl || ""}
              onChange={(v) => update({ isBpl: v })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Facing economic distress?</p>
            <ChipSelect
              options={YES_NO}
              value={draft.isEconomicDistress || ""}
              onChange={(v) => update({ isEconomicDistress: v })}
            />
          </div>
          {showOccupation ? (
            <label className="block text-sm">
              <span className="mb-2 block font-medium">Occupation</span>
              <select
                value={draft.occupation || ""}
                onChange={(e) => update({ occupation: e.target.value })}
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 outline-none focus:border-[#1F4B99]"
              >
                <option value="">Select occupation</option>
                {OCCUPATIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        disabled={saving}
        onClick={next}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1F4B99] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : null}
        {step >= STEPS.length - 1 ? "Find schemes" : "Continue"}
      </button>
    </SchemesShell>
  )
}
