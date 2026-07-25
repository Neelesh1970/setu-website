import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Headphones,
  Loader2,
  Megaphone,
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

function StatCard({ label, value, prefix = "", suffix = "", accent = false }) {
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
        {value}
        {suffix}
      </p>
    </motion.div>
  )
}

export default function VleDashboardPage() {
  const { session } = useAuth()
  const [period, setPeriod] = useState("month")
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
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
    }
  }, [session?.token, session?.refreshToken, period])

  useEffect(() => {
    load()
  }, [load])

  const wallet = overview?.wallet || {}
  const rewards = overview?.rewards || {}
  const myRank = overview?.leaderboard
  const analytics = overview?.analytics || {}
  const summary = analytics.summary || {}
  const charts = analytics.charts || {}

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
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {loading && (
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
          <p className="mb-3 text-sm text-setu-muted">
            Showing stats for <span className="font-medium text-[#1C39BB]">{analytics.periodLabel || period}</span>
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
                label="Wallet balance"
                value={summary.walletBalanceInr ?? wallet.balanceInr ?? 0}
                prefix="₹"
                accent
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
                    <span className="font-semibold">₹{summary.earningsInr ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-setu-muted">Paid registrations</span>
                    <span className="font-semibold">{summary.paidRegistrations ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-setu-muted">Per registration</span>
                    <span className="font-semibold">₹{wallet.commissionPerRegistrationInr ?? 100}</span>
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
                  First to 500 paid registrations wins ₹5,00,000
                </p>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-[#1C39BB]">
                    {rewards.grandPrize?.myPaidRegistrations ?? 0} / {rewards.grandPrize?.targetRegistrations ?? 500} paid
                  </span>
                  {rewards.grandPrize?.canStillWin && (
                    <span className="text-setu-muted">
                      {rewards.grandPrize?.remainingRegistrations ?? 0} to go
                    </span>
                  )}
                  {rewards.grandPrize?.isWinner && (
                    <span className="font-medium text-green-700">Winner!</span>
                  )}
                  {rewards.grandPrize?.prizeAlreadyClaimed && !rewards.grandPrize?.isWinner && (
                    <span className="text-setu-muted">Prize claimed</span>
                  )}
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#EEF3FF]">
                  <motion.div
                    className="h-full rounded-full bg-[#1C39BB]"
                    initial={{ width: 0 }}
                    animate={{ width: `${rewards.grandPrize?.progressPercent ?? 0}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <VleDownloadPie data={charts.downloadStatus} />
            <VleMembershipPie data={charts.membership} />
            <VleEarningsPie data={charts.earnings} />
          </div>

          <div className="mb-2">
            <h2 className="font-semibold text-setu-charcoal">Modules</h2>
            <p className="text-sm text-setu-muted">Quick access to all VLE tools</p>
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
