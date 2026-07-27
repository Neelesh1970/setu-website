import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Headphones,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
  Smartphone,
  TrendingUp,
  Trophy,
  UserPlus,
  Wallet,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { vleAuthFetch } from "../../api/roleAuth"
import {
  PeriodFilter,
  VleDownloadPie,
  VleEarningsPie,
  VleMembershipPie,
  VleRegistrationsBar,
} from "../../components/vle/VleDashboardCharts"

const MODULE_ICONS = {
  register: UserPlus,
  search: Search,
  wallet: Wallet,
  earnings: Wallet,
  downloads: Smartphone,
  today: Trophy,
  rewards: Trophy,
  marketing: Megaphone,
  support: Headphones,
  transactions: Wallet,
}

function rankLabel(rank) {
  if (rank === 1) return "1st"
  if (rank === 2) return "2nd"
  if (rank === 3) return "3rd"
  return `#${rank}`
}

function formatInr(value) {
  return Number(value || 0).toLocaleString("en-IN")
}

function StatCard({ label, value, prefix = "", suffix = "", accent = false, sublabel }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border p-4 shadow-sm ${
        accent
          ? "border-[#1C39BB]/30 bg-gradient-to-br from-[#1C39BB] to-[#2B5BFF] text-white"
          : "border-[#D2DEFF] bg-white"
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${accent ? "text-white/80" : "text-setu-muted"}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? "text-white" : "text-setu-charcoal"}`}>
        {prefix}
        {typeof value === "number" ? formatInr(value) : value}
        {suffix}
      </p>
      {sublabel && (
        <p className={`mt-1 text-xs ${accent ? "text-white/70" : "text-setu-muted"}`}>{sublabel}</p>
      )}
    </motion.div>
  )
}

export default function VleDashboardPage() {
  const { session } = useAuth()
  const [period, setPeriod] = useState("month")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState("")

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!session?.token) return
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const data = await vleAuthFetch(`/dashboard/overview?period=${period}`, {
        token: session.token,
        refreshToken: session.refreshToken,
      })
      setOverview(data)
    } catch (err) {
      setError(err.message || "Could not load dashboard.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [session?.token, session?.refreshToken, period])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && session?.token) {
        load({ silent: true })
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [load, session?.token])

  const wallet = overview?.wallet || {}
  const rewards = overview?.rewards || {}
  const registration = overview?.registration || {}
  const performance = overview?.performance || {}
  const myRank = overview?.leaderboard
  const leaderboardTop = overview?.leaderboardTop || []
  const analytics = overview?.analytics || {}
  const summary = analytics.summary || {}
  const charts = analytics.charts || {}
  const grandPrize = rewards.grandPrize || {}
  const prizeInr = grandPrize.prizeInr ?? 500000
  const prizeTarget = grandPrize.targetRegistrations ?? 500

  return (
    <div className="page-safe-bottom mx-auto max-w-6xl px-4 py-6 app-safe-x sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#1C39BB]">VLE Dashboard</p>
          <h1 className="font-serif text-2xl text-setu-charcoal">
            Welcome back, {session?.name?.split(" ")[0] || "VLE"}
          </h1>
          {myRank?.rank != null && (
            <p className="mt-1 text-sm text-setu-muted">
              Leaderboard rank{" "}
              <span className="font-semibold text-[#1C39BB]">{rankLabel(myRank.rank)}</span>
              {" · "}
              {myRank.usersRegistered ?? 0} total registrations
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => load({ silent: true })}
            disabled={loading || refreshing}
            className="tap-target inline-flex items-center gap-2 rounded-xl border border-[#D2DEFF] bg-white px-3 py-2 text-sm font-medium text-setu-charcoal shadow-sm transition hover:border-[#1C39BB]/40 disabled:opacity-60"
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
      </div>

      {loading && !overview && (
        <div className="flex items-center gap-2 text-setu-muted">
          <Loader2 className="animate-spin" size={18} />
          Loading dashboard…
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {!loading && !error && overview && (
        <>
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-setu-muted">
              Live snapshot
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Today"
                value={registration.today ?? performance.todayRegistrations ?? 0}
                sublabel="Registrations today"
              />
              <StatCard
                label="This month"
                value={registration.month ?? performance.monthlyRegistrations ?? 0}
                sublabel="Registrations this month"
              />
              <StatCard
                label="Total users"
                value={registration.total ?? performance.totalRegistrations ?? 0}
                sublabel={`${registration.appDownloads ?? 0} opened the app`}
              />
              <StatCard
                label="Wallet"
                value={wallet.balanceInr ?? 0}
                prefix="₹"
                accent
                sublabel={`Today +₹${formatInr(wallet.todayEarningsInr ?? 0)} · Month +₹${formatInr(wallet.monthEarningsInr ?? 0)}`}
              />
            </div>
          </div>

          <p className="mb-3 text-sm text-setu-muted">
            Period stats for{" "}
            <span className="font-medium text-[#1C39BB]">{analytics.periodLabel || period}</span>
          </p>

          <AnimatePresence mode="popLayout">
            <motion.div
              key={period}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <StatCard label="Registrations" value={summary.registrations ?? 0} />
              <StatCard label="App downloads" value={summary.appDownloads ?? 0} />
              <StatCard label="Earnings" value={summary.earningsInr ?? 0} prefix="₹" />
              <StatCard
                label="Paid in period"
                value={summary.paidRegistrations ?? 0}
                sublabel={
                  wallet.pendingSettlementInr
                    ? `₹${formatInr(wallet.pendingSettlementInr)} pending settlement`
                    : undefined
                }
              />
            </motion.div>
          </AnimatePresence>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <VleRegistrationsBar data={charts.registrationsOverTime} period={period} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="text-[#1C39BB]" size={18} />
                  <h2 className="font-semibold text-setu-charcoal">Quick earnings</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-setu-muted">Period commission</span>
                    <span className="font-semibold">₹{formatInr(summary.earningsInr ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-setu-muted">Paid registrations</span>
                    <span className="font-semibold">{summary.paidRegistrations ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-setu-muted">Per registration</span>
                    <span className="font-semibold">
                      ₹{formatInr(wallet.commissionPerRegistrationInr ?? 100)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-setu-muted">Month earnings</span>
                    <span className="font-semibold">₹{formatInr(wallet.monthEarningsInr ?? 0)}</span>
                  </div>
                  <Link to="/vle/wallet" className="mt-2 inline-block text-sm font-medium text-[#1C39BB] hover:underline">
                    Open wallet →
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-setu-charcoal">Grand prize</h2>
                  <Link to="/vle/rewards" className="text-xs font-medium text-[#1C39BB] hover:underline">
                    View →
                  </Link>
                </div>
                <p className="mb-2 text-sm text-setu-muted">
                  First to {prizeTarget} paid registrations wins ₹{formatInr(prizeInr)}
                </p>
                {grandPrize.prizeAlreadyClaimed && grandPrize.winner && !grandPrize.isWinner && (
                  <p className="mb-2 rounded-lg bg-[#F7FAFF] px-3 py-2 text-xs text-setu-muted">
                    Won by {grandPrize.winner.name} ({grandPrize.winner.vlePublicId})
                  </p>
                )}
                {grandPrize.isWinner && (
                  <p className="mb-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
                    You won the ₹{formatInr(prizeInr)} grand prize!
                  </p>
                )}
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-[#1C39BB]">
                    {grandPrize.myPaidRegistrations ?? 0} / {prizeTarget} paid
                  </span>
                  {grandPrize.canStillWin && (
                    <span className="text-setu-muted">
                      {grandPrize.remainingRegistrations ?? 0} to go
                    </span>
                  )}
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#EEF3FF]">
                  <motion.div
                    className="h-full rounded-full bg-[#1C39BB]"
                    initial={{ width: 0 }}
                    animate={{ width: `${grandPrize.progressPercent ?? 0}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>

              {rewards.downloadProgressPercent != null && (
                <div className="rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
                  <div className="mb-3 flex items-center gap-2">
                    <Smartphone className="text-[#1C39BB]" size={18} />
                    <h2 className="font-semibold text-setu-charcoal">App download progress</h2>
                  </div>
                  <p className="mb-2 text-sm text-setu-muted">
                    {registration.appDownloads ?? 0} citizens opened the SETU app
                    {rewards.remainingDownloads != null && rewards.remainingDownloads > 0
                      ? ` · ${rewards.remainingDownloads} more for download milestone`
                      : ""}
                  </p>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-[#1C39BB]">{rewards.downloadProgressPercent}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#EEF3FF]">
                    <div
                      className="h-full rounded-full bg-green-600 transition-all"
                      style={{ width: `${rewards.downloadProgressPercent ?? 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {leaderboardTop.length > 0 && (
            <div className="mb-6 rounded-2xl border border-[#D2DEFF] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-setu-charcoal">Leaderboard</h2>
                <Link to="/vle/leaderboard" className="text-sm font-medium text-[#1C39BB] hover:underline">
                  Full board →
                </Link>
              </div>
              <ul className="divide-y divide-[#EEF3FF]">
                {leaderboardTop.map((entry) => (
                  <li
                    key={entry.vlePublicId}
                    className={`flex items-center justify-between py-2.5 text-sm ${
                      entry.isMe ? "font-semibold text-[#1C39BB]" : "text-setu-charcoal"
                    }`}
                  >
                    <span>
                      {rankLabel(entry.rank)} · {entry.name}
                      {entry.isMe && " (You)"}
                    </span>
                    <span className="text-setu-muted">{entry.usersRegistered} users</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <VleDownloadPie data={charts.downloadStatus} />
            <VleMembershipPie data={charts.membership} />
            <VleEarningsPie data={charts.earnings} />
          </div>

          <div className="mb-2">
            <h2 className="font-semibold text-setu-charcoal">Modules</h2>
            <p className="text-sm text-setu-muted">Quick access from your VLE portal</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(overview.modules || []).map((mod) => {
              const Icon = MODULE_ICONS[mod.id] || UserPlus
              return (
                <Link
                  key={mod.id}
                  to={mod.path}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-[#D2DEFF] bg-white p-4 text-center shadow-sm transition hover:border-[#1C39BB]/40 hover:shadow-md active:scale-[0.98]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF3FF] text-[#1C39BB]">
                    <Icon size={22} />
                  </span>
                  <span className="text-xs font-medium leading-tight text-setu-charcoal">{mod.label}</span>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
