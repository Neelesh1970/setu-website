import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Loader2, Trophy } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { vleAuthFetch } from "../../api/roleAuth"

function rankLabel(rank) {
  if (rank === 1) return "1st"
  if (rank === 2) return "2nd"
  if (rank === 3) return "3rd"
  return `#${rank}`
}

export default function VleRewardsPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const rewards = await vleAuthFetch("/dashboard/rewards", {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      setData(rewards)
    } catch (err) {
      setError(err.message || "Could not load rewards.")
    } finally {
      setLoading(false)
    }
  }, [session?.token, session?.refreshToken])

  useEffect(() => {
    load()
  }, [load])

  const gp = data?.grandPrize || {}

  return (
    <div className="page-safe-bottom mx-auto max-w-4xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[#1C39BB]">Grand Prize</p>
        <h1 className="font-serif text-2xl text-setu-charcoal">₹5,00,000 challenge</h1>
        <p className="mt-1 text-sm text-setu-muted">
          First VLE to complete 500 paid registrations wins — only one winner nationwide.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-setu-muted">
          <Loader2 className="animate-spin" size={18} />
          Loading…
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {!loading && !error && data && (
        <>
          <div className="mb-6 rounded-2xl border-2 border-[#1C39BB]/30 bg-gradient-to-br from-[#1C39BB] to-[#2B5BFF] p-6 text-white shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/80">Grand prize</p>
                <p className="mt-1 text-4xl font-bold">₹{gp.prizeInr?.toLocaleString("en-IN") || "5,00,000"}</p>
                <p className="mt-2 text-sm text-white/90">
                  First to {gp.targetRegistrations || 500} paid citizen registrations
                </p>
              </div>
              <Trophy className="shrink-0 opacity-90" size={48} />
            </div>
            {gp.isWinner && (
              <p className="mt-4 rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold">
                🎉 Congratulations! You won the ₹5 lakh grand prize!
              </p>
            )}
            {gp.prizeAlreadyClaimed && !gp.isWinner && gp.winner && (
              <p className="mt-4 rounded-xl bg-white/15 px-4 py-3 text-sm">
                Prize already won by {gp.winner.name} ({gp.winner.vlePublicId}) on{" "}
                {new Date(gp.winner.wonAt).toLocaleDateString("en-IN")}
              </p>
            )}
            {gp.canStillWin && !gp.isWinner && (
              <p className="mt-4 text-sm text-white/90">
                {gp.remainingRegistrations} more paid registrations to reach {gp.targetRegistrations}
              </p>
            )}
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm">
              <p className="text-sm text-setu-muted">Your paid registrations</p>
              <p className="mt-1 text-3xl font-semibold text-[#1C39BB]">
                {gp.myPaidRegistrations ?? 0}
                <span className="text-lg text-setu-muted"> / {gp.targetRegistrations || 500}</span>
              </p>
            </div>
            <div className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm">
              <p className="text-sm text-setu-muted">Leaderboard rank</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-semibold text-setu-charcoal">
                {data.myRank?.rank != null ? rankLabel(data.myRank.rank) : "—"}
              </p>
              <p className="mt-1 text-sm text-setu-muted">{data.totalRegistrations} total registrations</p>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Progress to ₹5 lakh</h2>
            <div className="mb-2 flex justify-between text-sm">
              <span>{gp.myPaidRegistrations ?? 0} paid</span>
              <span className="text-setu-muted">{gp.progressPercent ?? 0}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-[#EEF3FF]">
              <div
                className="h-full rounded-full bg-[#1C39BB] transition-all"
                style={{ width: `${gp.progressPercent ?? 0}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Leaderboard top 10</h2>
              <Link to="/vle/leaderboard" className="text-sm font-medium text-[#1C39BB] hover:underline">
                Full leaderboard →
              </Link>
            </div>
            <ul className="divide-y divide-[#EEF3FF]">
              {(data.leaderboard || []).map((entry) => (
                <li
                  key={entry.vlePublicId}
                  className={`flex justify-between py-2 text-sm ${entry.isMe ? "font-semibold text-[#1C39BB]" : ""}`}
                >
                  <span>
                    {rankLabel(entry.rank)} · {entry.name}
                  </span>
                  <span>{entry.usersRegistered} users</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
