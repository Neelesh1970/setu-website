import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  fetchSolhCategories,
  fetchSolhDetails,
  fetchSolhList,
  MENTAL_ACCENT,
  submitSolhAssessment,
} from "../../api/mental"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../components/ui/Toast"
import { MentalShell } from "./MentalShell"

/**
 * Solh self-assessment flow:
 * /solh -> categories
 * /solh/:categoryId -> assessments
 * /solh/test/:testId -> disclaimer -> questions -> done
 *
 * Important:
 * The SETU Mental Health service stores assessment questions/options in the
 * Assessment API. The frontend therefore falls back to the canonical
 * /api/v1/assessments/:id endpoint when the older Solh endpoint does not
 * expose questions in the expected shape.
 *
 * Assessment images are loaded from the canonical S3-presigned image endpoint:
 * GET /api/v1/assessments/:id/image
 */

function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) || []
}

function getApiBase() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_MENTAL_API_URL ||
    import.meta.env.VITE_API_URL ||
    "https://api.setuai.com"
  ).replace(/\/+$/, "")
}

function getSessionToken(session) {
  return (
    session?.access_token ||
    session?.accessToken ||
    session?.token ||
    session?.jwt ||
    (typeof session === "string" ? session : "")
  )
}

function getRefreshToken(session) {
  return session?.refresh_token || session?.refreshToken || ""
}

function getRequestHeaders(session) {
  const headers = { Accept: "application/json" }
  const token = getSessionToken(session)
  const refreshToken = getRefreshToken(session)

  if (token) headers.Authorization = `Bearer ${token}`
  if (refreshToken) headers["x-refresh-token"] = refreshToken

  return headers
}

function extractCategories(response) {
  return firstArray(
    response?.data?.data?.categories,
    response?.data?.data?.categoryList,
    response?.data?.categories,
    response?.data?.categoryList,
    response?.categories,
    response?.categoryList,
    response?.result?.data?.categories,
    response?.result?.categories,
    response?.result?.data,
    response?.data?.data,
    response?.data,
    response,
  )
}

function extractTests(response) {
  return firstArray(
    response?.data?.data?.testList,
    response?.data?.data?.tests,
    response?.data?.testList,
    response?.data?.tests,
    response?.testList,
    response?.tests,
    response?.result?.data?.testList,
    response?.result?.testList,
    response?.result?.data,
    response?.data?.data,
    response?.data,
    response,
  )
}

function unwrapResponse(response) {
  return (
    response?.data?.data?.details ||
    response?.data?.data?.assessment ||
    response?.data?.details ||
    response?.data?.assessment ||
    response?.data?.data ||
    response?.result?.data ||
    response?.result ||
    response?.data ||
    response ||
    null
  )
}

function getCategoryId(category) {
  return (
    category?._id ||
    category?.id ||
    category?.categoryId ||
    category?.testCategoryId ||
    category?.selfAssessmentCategoryId ||
    category?.selfassessmentCategoryId ||
    ""
  )
}

function getTestId(test) {
  return (
    test?._id ||
    test?.id ||
    test?.testId ||
    test?.assessmentId ||
    test?.selfassessmentId ||
    test?.selfAssessmentId ||
    ""
  )
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  )
}

/**
 * The backend Assessment service includes imageUrl in assessment data and
 * also exposes GET /api/v1/assessments/:id/image which returns a presigned S3 URL.
 */
function getImageUrl(item) {
  if (!item) return ""

  const value =
    item?.imageUrl ||
    item?.imageURL ||
    item?.image_url ||
    item?.image ||
    item?.thumbnailUrl ||
    item?.thumbnailURL ||
    item?.thumbnail ||
    item?.iconUrl ||
    item?.iconURL ||
    item?.icon ||
    item?.bannerUrl ||
    item?.banner ||
    item?.coverImageUrl ||
    item?.coverImage ||
    item?.media?.url ||
    item?.media?.imageUrl ||
    item?.file?.url ||
    item?.attachment?.url ||
    item?.attachments?.[0]?.url ||
    ""

  if (!value) return ""
  if (typeof value === "object") return getImageUrl(value)
  if (typeof value !== "string") return ""

  const image = value.trim()
  if (!image) return ""

  if (/^(https?:|data:|blob:)/i.test(image)) return image
  if (image.startsWith("//")) return `${window.location.protocol}${image}`

  try {
    return new URL(image.replace(/^\/+/, ""), `${getApiBase()}/`).toString()
  } catch {
    return image
  }
}

async function fetchCanonicalAssessmentDetail(id, session) {
  if (!id) return null

  const url = `${getApiBase()}/api/v1/assessments/${encodeURIComponent(id)}`
  const response = await fetch(url, {
    method: "GET",
    headers: getRequestHeaders(session),
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Assessment detail API failed (${response.status})`)
  }

  return response.json()
}

async function fetchAssessmentImage(id, session) {
  if (!id) return ""

  const url = `${getApiBase()}/api/v1/assessments/${encodeURIComponent(id)}/image`
  const response = await fetch(url, {
    method: "GET",
    headers: getRequestHeaders(session),
    credentials: "include",
  })

  if (response.status === 404) return ""
  if (!response.ok) {
    throw new Error(`Assessment image API failed (${response.status})`)
  }

  const payload = await response.json()

  const value =
    payload?.data?.imageUrl ||
    payload?.data?.url ||
    payload?.data?.data?.imageUrl ||
    payload?.data?.data?.url ||
    payload?.imageUrl ||
    payload?.url ||
    payload?.result?.imageUrl ||
    payload?.result?.url ||
    ""

  if (typeof value === "object" && value) return getImageUrl(value)
  return typeof value === "string" ? value : ""
}

/**
 * Finds questions even if the API wraps them as:
 * data.questions, data.assessment.questions,
 * assessment.questions, selfAssessmentQuestions, questionList, etc.
 */
function findQuestions(value, depth = 0, seen = new Set()) {
  if (!value || depth > 7 || typeof value !== "object") return []
  if (seen.has(value)) return []
  seen.add(value)

  if (Array.isArray(value)) {
    if (
      value.length > 0 &&
      value.some(
        (item) =>
          item &&
          typeof item === "object" &&
          (item.question || item.text || item.questionText || item.questionId),
      )
    ) {
      return value
    }

    for (const item of value) {
      const found = findQuestions(item, depth + 1, seen)
      if (found.length) return found
    }
    return []
  }

  const directKeys = [
    "questions",
    "questionList",
    "questionsList",
    "selfAssessmentQuestions",
    "selfassessmentQuestions",
    "testQuestions",
    "assessmentQuestions",
  ]

  for (const key of directKeys) {
    if (Array.isArray(value?.[key]) && value[key].length) {
      return value[key]
    }
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      ["createdAt", "updatedAt", "imageUrl", "status", "scoreBands"].includes(key)
    ) {
      continue
    }
    const found = findQuestions(child, depth + 1, seen)
    if (found.length) return found
  }

  return []
}

function getQuestionText(question) {
  return (
    question?.question ||
    question?.questionText ||
    question?.text ||
    question?.title ||
    question?.label ||
    ""
  )
}

function getAnswers(question) {
  return firstArray(
    question?.answer,
    question?.answers,
    question?.options,
    question?.answerList,
    question?.choices,
  )
}

function getAnswerId(answer, index) {
  return answer?._id || answer?.id || answer?.answerId || `answer-${index}`
}

function getAnswerText(answer) {
  return answer?.title || answer?.text || answer?.label || answer?.name || ""
}

function getAnswerScore(answer) {
  const value = answer?.score ?? answer?.value ?? answer?.points ?? 0
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function ImageWithFallback({ src, alt, className = "", fallbackClassName = "" }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [src])

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-[#ECFDF5] text-[#0F766E] ${fallbackClassName}`}
        aria-label="Image unavailable"
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="8.5" cy="9" r="1.5" fill="currentColor" />
          <path d="m5 17 4.2-4.2 3.1 3.1 2.2-2.2L19 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  )
}


function unwrapSubmitResult(response) {
  return (
    response?.data?.data?.result ||
    response?.data?.data?.submission ||
    response?.data?.result ||
    response?.data?.submission ||
    response?.result ||
    response?.submission ||
    response?.data?.data ||
    response?.data ||
    response ||
    null
  )
}

function getScoreBands(details) {
  return firstArray(
    details?.scoreBands,
    details?.score_bands,
    details?.bands,
    details?.scoreBandList,
    details?.data?.scoreBands,
    details?.data?.bands,
  )
}

function getResultScore(result) {
  if (!result) return null
  if (typeof result.totalScore === "number") return result.totalScore
  if (typeof result.totalScore === "string" && result.totalScore.trim() !== "") return Number(result.totalScore)
  if (typeof result.score === "number") return result.score
  if (typeof result.score === "string" && result.score.trim() !== "") return Number(result.score)
  if (Array.isArray(result.score)) return result.score.reduce((sum, value) => sum + Number(value || 0), 0)
  if (Array.isArray(result.scores)) return result.scores.reduce((sum, value) => sum + Number(value?.score ?? value ?? 0), 0)
  return null
}

function buildLocalResult(details, questions, answers) {
  const score = questions.reduce((sum, question) => {
    const id = question?._id || question?.id || question?.questionId
    return sum + getAnswerScore(answers[id])
  }, 0)

  const bands = getScoreBands(details)
  const band = bands.find((item) => {
    const min = Number(item?.minScore ?? item?.min ?? -Infinity)
    const max = Number(item?.maxScore ?? item?.max ?? Infinity)
    return score >= min && score <= max
  }) || null

  return {
    totalScore: score,
    score,
    bandLabel: band?.label || band?.title || "Assessment completed",
    bandColor: band?.color || "green",
    recommendation: band?.recommendation || band?.description || "Your assessment has been completed successfully.",
    scoreBand: band,
    localResult: true,
  }
}

function saveResult(testId, value) {
  if (!testId || !value) return
  try {
    sessionStorage.setItem(`setu-mental-assessment-result:${testId}`, JSON.stringify(value))
  } catch {
    // Ignore storage failures; React state still handles the current session.
  }
}

function readSavedResult(testId) {
  if (!testId) return null
  try {
    const raw = sessionStorage.getItem(`setu-mental-assessment-result:${testId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function MentalSolh() {
  const { categoryId, testId } = useParams()
  const [search] = useSearchParams()
  const step = search.get("step") || (testId ? "disclaimer" : categoryId ? "list" : "categories")

  const navigate = useNavigate()
  const { session } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retryKey, setRetryKey] = useState(0)
  const [categories, setCategories] = useState([])
  const [tests, setTests] = useState([])
  const [categoryTitle, setCategoryTitle] = useState("")
  const [details, setDetails] = useState(null)
  const [assessmentImage, setAssessmentImage] = useState("")
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(() => readSavedResult(testId))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError("")
      setAssessmentImage("")

      try {
        if (!categoryId && !testId) {
          const response = await fetchSolhCategories(session)
          const list = extractCategories(response)

          if (!cancelled) {
            setCategories(list)
            setTests([])
            setDetails(null)
          }
          return
        }

        if (categoryId && !testId) {
          const response = await fetchSolhList(categoryId, session)
          const list = extractTests(response)

          if (!cancelled) {
            setTests(list)
            setDetails(null)
            setCategoryTitle(
              response?.data?.data?.testCategoryTitle ||
                response?.data?.data?.categoryTitle ||
                response?.data?.testCategoryTitle ||
                response?.data?.categoryTitle ||
                response?.testCategoryTitle ||
                response?.categoryTitle ||
                "Assessments",
            )
          }
          return
        }

        if (testId && ["disclaimer", "quiz", "done"].includes(step)) {
          let response = null
          let detail = null

          // First use the existing Solh API wrapper.
          try {
            response = await fetchSolhDetails(testId, session)
            detail = unwrapResponse(response)
          } catch (solhError) {
            console.warn("Solh details API failed; trying canonical assessment API", solhError)
          }

          // The canonical Assessment API is guaranteed to include questions/options.
          let questions = findQuestions(detail)
          if (!questions.length) {
            try {
              const canonicalResponse = await fetchCanonicalAssessmentDetail(testId, session)
              detail = unwrapResponse(canonicalResponse) || canonicalResponse
              questions = findQuestions(detail)
            } catch (canonicalError) {
              if (!response) throw canonicalError
              console.warn("Canonical assessment detail fallback failed", canonicalError)
            }
          }

          if (!cancelled) {
            setDetails(detail)
          }

          // Always call the dedicated S3 image endpoint for the assessment.
          try {
            const apiImage = await fetchAssessmentImage(testId, session)
            if (!cancelled) {
              setAssessmentImage(apiImage || getImageUrl(detail))
            }
          } catch (imageError) {
            console.warn("Assessment image API failed", imageError)
            if (!cancelled) setAssessmentImage(getImageUrl(detail))
          }
        }
      } catch (err) {
        const message = getErrorMessage(err, "Failed to load self assessments")
        if (!cancelled) {
          setError(message)
          toast.error(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [categoryId, testId, step, session, retryKey, toast])

  useEffect(() => {
    setQIndex(0)
    setAnswers({})
    setResult(readSavedResult(testId))
  }, [testId])

  const questions = useMemo(() => findQuestions(details), [details])
  const current = questions[qIndex]
  const currentAnswers = getAnswers(current)

  const startQuiz = () => {
    if (!testId || !questions.length) return
    navigate(`/app/mental-health/solh/test/${testId}?step=quiz`, { replace: true })
  }

  const selectAnswer = (answer) => {
    const questionId = current?._id || current?.id || current?.questionId
    if (!questionId) return

    setAnswers((previous) => ({
      ...previous,
      [questionId]: answer,
    }))
  }

  const nextQuestion = async () => {
    const questionId = current?._id || current?.id || current?.questionId

    if (!questionId) {
      toast.error("Question information is missing")
      return
    }

    if (!answers[questionId]) {
      toast.error("Please select an answer")
      return
    }

    if (qIndex < questions.length - 1) {
      setQIndex((index) => index + 1)
      return
    }

    setSubmitting(true)

    try {
      const score = []
      const testData = []

      questions.forEach((question) => {
        const id = question?._id || question?.id || question?.questionId
        const answer = answers[id]

        if (id && answer) {
          const answerId = answer?._id || answer?.id || answer?.answerId
          const answerScore = getAnswerScore(answer)

          score.push(answerScore)
          testData.push({
            questionId: id,
            answerId,
            score: answerScore,
          })
        }
      })

      const payload = {
        score,
        testData,
        lectureId: details?.lectureId || "",
        courseId: details?.courseId || "",
        orderId: details?.orderId || "",
      }

      let response = null
      let serverResult = null

      try {
        response = await submitSolhAssessment(testId, payload, session)
        serverResult = unwrapSubmitResult(response)
      } catch (submitError) {
        console.warn("Solh submit API failed; using assessment result calculation", submitError)
      }

      // The SETU assessment backend calculates totalScore/bandLabel/bandColor/recommendation
      // from the submitted answers. If the Solh wrapper returns no usable result object,
      // calculate the same presentation values from the questions + score bands so the
      // result screen is still available immediately.
      const localResult = buildLocalResult(details, questions, answers)
      const finalResult = {
        ...localResult,
        ...(serverResult && typeof serverResult === "object" ? serverResult : {}),
      }

      // Normalize score when the server returns an array of per-question scores.
      if (getResultScore(serverResult) !== null) {
        finalResult.totalScore = getResultScore(serverResult)
      }

      setResult(finalResult)
      saveResult(testId, finalResult)
      navigate(`/app/mental-health/solh/test/${testId}?step=done`, { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err, "Submit failed"))
    } finally {
      setSubmitting(false)
    }
  }

  const retry = () => setRetryKey((key) => key + 1)

  if (loading) {
    return (
      <MentalShell title="Self Assessment" backTo="/app/mental-health/assessments">
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-[#E5E7EB]" />
          <div className="h-28 animate-pulse rounded-2xl bg-[#E5E7EB]" />
        </div>
      </MentalShell>
    )
  }

  if (error) {
    return (
      <MentalShell title="Self Assessment" backTo="/app/mental-health/assessments">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">Unable to load self assessment</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: MENTAL_ACCENT }}
          >
            Try again
          </button>
        </div>
      </MentalShell>
    )
  }

  if (step === "done") {
    const displayResult = result || readSavedResult(testId)
    const total = getResultScore(displayResult)
    const label =
      displayResult?.bandLabel ||
      displayResult?.scoreBand?.label ||
      displayResult?.band?.label ||
      "Assessment completed"
    const recommendation =
      displayResult?.recommendation ||
      displayResult?.scoreBand?.recommendation ||
      displayResult?.band?.recommendation ||
      "Thank you for completing your assessment."

    return (
      <MentalShell title="Assessment Result" backTo="/app/mental-health/assessments">
        <div className="overflow-hidden rounded-2xl border border-[#D1FAE5] bg-white shadow-sm">
          <ImageWithFallback
            src={assessmentImage || getImageUrl(details)}
            alt={details?.title || details?.name || "Assessment result"}
            className="h-44 w-full object-cover"
            fallbackClassName="h-28 w-full"
          />
          <div className="p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0F766E]">
              Assessment Result
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#0F172A]">{label}</h2>

            {total !== null && Number.isFinite(total) ? (
              <div className="mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#ECFDF5]">
                <span className="text-3xl font-bold text-[#0F766E]">{total}</span>
              </div>
            ) : null}

            <div className="mt-5 rounded-xl bg-[#F8FAFC] p-4 text-left">
              <p className="text-sm font-semibold text-[#0F172A]">Your wellness insight</p>
              <p className="mt-1 text-sm leading-6 text-[#6B7280]">{recommendation}</p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/app/mental-health/assessments")}
              className="mt-6 w-full rounded-full px-5 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: MENTAL_ACCENT }}
            >
              Done
            </button>
          </div>
        </div>
      </MentalShell>
    )
  }

  if (testId && step === "quiz") {
    if (!questions.length || !current) {
      return (
        <MentalShell
          title={details?.title || details?.name || "Quiz"}
          backTo={`/app/mental-health/solh/test/${testId}?step=disclaimer`}
        >
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            <p className="font-semibold">No questions were returned by the assessment API.</p>
            <p className="mt-1">
              The assessment detail was loaded, but the response did not contain a question list.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 rounded-full bg-[#0F766E] px-5 py-2.5 font-semibold text-white"
            >
              Reload questions
            </button>
          </div>
        </MentalShell>
      )
    }

    const questionId = current?._id || current?.id || current?.questionId
    const selected = answers[questionId]

    return (
      <MentalShell
        title={details?.title || details?.name || "Quiz"}
        backTo={`/app/mental-health/solh/test/${testId}?step=disclaimer`}
      >
        <p className="mb-2 text-xs text-[#6B7280]">
          Question {qIndex + 1} of {questions.length}
        </p>

        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <ImageWithFallback
            src={assessmentImage || getImageUrl(details)}
            alt={details?.title || details?.name || "Assessment"}
            className="h-44 w-full object-cover"
            fallbackClassName="h-20 w-full"
          />

          <div className="p-5">
            <p className="font-semibold leading-6 text-[#0F172A]">
              {getQuestionText(current) || "Question"}
            </p>

            {current?.description ? (
              <p className="mt-2 text-sm text-[#6B7280]">{current.description}</p>
            ) : null}

            {currentAnswers.length === 0 ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No answer options were returned for this question.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {currentAnswers.map((answer, index) => {
                  const answerId = getAnswerId(answer, index)
                  const selectedId = selected?._id || selected?.id || selected?.answerId
                  const isSelected = selectedId === answerId

                  return (
                    <button
                      key={answerId}
                      type="button"
                      onClick={() => selectAnswer(answer)}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                        isSelected
                          ? "border-[#0F766E] bg-[#ECFDF5] font-semibold text-[#0F766E]"
                          : "border-[#E5E7EB] hover:border-[#0F766E]/30"
                      }`}
                    >
                      {getAnswerText(answer) || `Option ${index + 1}`}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={submitting || currentAnswers.length === 0}
          onClick={nextQuestion}
          className="mt-5 w-full rounded-full px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: MENTAL_ACCENT }}
        >
          {submitting ? "Submitting…" : qIndex === questions.length - 1 ? "Submit" : "Next"}
        </button>
      </MentalShell>
    )
  }

  if (testId && step === "disclaimer") {
    return (
      <MentalShell title="Before you begin" backTo={categoryId ? `/app/mental-health/solh/${categoryId}` : "/app/mental-health/solh"}>
        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white text-sm leading-relaxed text-[#4B5563]">
          <ImageWithFallback
            src={assessmentImage || getImageUrl(details)}
            alt={details?.title || details?.name || "Self assessment"}
            className="h-44 w-full object-cover"
            fallbackClassName="h-32 w-full"
          />
          <div className="p-5">
            <p className="font-semibold text-[#0F172A]">
              {details?.title || details?.name || "Self assessment"}
            </p>
            {details?.subTitle || details?.description ? (
              <p className="mt-2 text-sm text-[#6B7280]">
                {details.subTitle || details.description}
              </p>
            ) : null}
            <p className="mt-3">
              This assessment is for informational purposes and does not replace professional
              medical advice, diagnosis, or treatment.
            </p>
            <p className="mt-3">
              Answer honestly based on how you have been feeling. Your responses are used to
              generate a wellness insight score.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={startQuiz}
          disabled={!questions.length}
          className="mt-5 w-full rounded-full px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: MENTAL_ACCENT }}
        >
          {!questions.length ? "No questions available" : "I understand — continue"}
        </button>

        {!questions.length ? (
          <button
            type="button"
            onClick={retry}
            className="mt-3 w-full rounded-full border border-[#0F766E] px-5 py-3 text-sm font-semibold text-[#0F766E]"
          >
            Reload assessment data
          </button>
        ) : null}
      </MentalShell>
    )
  }

  if (categoryId) {
    return (
      <MentalShell title={categoryTitle || "Assessments"} backTo="/app/mental-health/solh">
        {tests.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
            No assessments are available in this category.
          </div>
        ) : (
          <ul className="space-y-3">
            {tests.map((test, index) => {
              const id = getTestId(test)
              const title = test?.title || test?.name || test?.testTitle || "Assessment"

              return (
                <li key={id || index}>
                  <button
                    type="button"
                    disabled={!id}
                    onClick={() => id && navigate(`/app/mental-health/solh/test/${id}?step=disclaimer`)}
                    className="flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-3 text-left shadow-sm transition hover:border-[#0F766E]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <AssessmentImage id={id} item={test} session={session} alt={title} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#0F172A]">{title}</p>
                      {test?.description || test?.subTitle ? (
                        <p className="mt-1 line-clamp-2 text-xs text-[#6B7280]">
                          {test.description || test.subTitle}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xl text-[#9CA3AF]" aria-hidden>›</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </MentalShell>
    )
  }

  return (
    <MentalShell title="Self Assessment" backTo="/app/mental-health/assessments">
      {categories.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm font-semibold text-[#0F172A]">No categories available right now.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: MENTAL_ACCENT }}
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((category, index) => {
            const id = getCategoryId(category)
            const title = category?.title || category?.name || category?.categoryTitle || "Category"

            return (
              <button
                key={id || index}
                type="button"
                disabled={!id}
                onClick={() => id && navigate(`/app/mental-health/solh/${id}`)}
                className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white text-left shadow-sm transition hover:border-[#0F766E]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImageWithFallback
                  src={getImageUrl(category)}
                  alt={title}
                  className="h-36 w-full object-cover"
                  fallbackClassName="h-28 w-full"
                />
                <div className="p-4">
                  <p className="font-semibold text-[#0F172A]">{title}</p>
                  {category?.description || category?.subTitle ? (
                    <p className="mt-1 line-clamp-2 text-xs text-[#6B7280]">
                      {category.description || category.subTitle}
                    </p>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </MentalShell>
  )
}

function AssessmentImage({ id, item, session, alt }) {
  const [url, setUrl] = useState(() => getImageUrl(item))

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const existing = getImageUrl(item)
      if (existing) {
        setUrl(existing)
        return
      }

      if (!id) return

      try {
        const image = await fetchAssessmentImage(id, session)
        if (!cancelled) setUrl(image)
      } catch {
        if (!cancelled) setUrl("")
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, item, session])

  return (
    <ImageWithFallback
      src={url}
      alt={alt}
      className="h-20 w-20 shrink-0 rounded-xl object-cover"
      fallbackClassName="h-20 w-20 shrink-0 rounded-xl"
    />
  )
}