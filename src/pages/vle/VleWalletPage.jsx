import { useCallback, useEffect, useState } from "react"
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { vleAuthFetch } from "../../api/roleAuth"
import { openRazorpayCheckout, resolveRazorpayKeyId, buildRazorpayPrefill } from "../../utils/razorpayCheckout"

function statusLabel(status) {
  if (status === "completed") return "Success"
  if (status === "failed") return "Failed"
  if (status === "cancelled") return "Cancelled"
  if (status === "pending") return "Pending"
  return status
}

function statusClass(status) {
  if (status === "completed") return "text-green-700"
  if (status === "failed") return "text-red-600"
  if (status === "cancelled") return "text-setu-muted"
  if (status === "pending") return "text-amber-700"
  return "text-setu-muted"
}

export default function VleWalletPage() {
  const { session } = useAuth()
  const [tab, setTab] = useState("deposit")
  const [balance, setBalance] = useState(null)
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const [depositAmount, setDepositAmount] = useState("100")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawMethod, setWithdrawMethod] = useState("upi")
  const [accountHolderName, setAccountHolderName] = useState(session?.name || "")
  const [vpa, setVpa] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [ifsc, setIfsc] = useState("")

  const minDeposit = balance?.minDepositInr ?? 2
  const minWithdraw = balance?.minWithdrawalInr ?? 10

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError("")
    try {
      const [bal, tx, walletSummary] = await Promise.all([
        vleAuthFetch("/dashboard/wallet/balance", { token: session.token, refreshToken: session.refreshToken }),
        vleAuthFetch("/dashboard/wallet/transactions?limit=20", { token: session.token, refreshToken: session.refreshToken }),
        vleAuthFetch("/dashboard/wallet-summary", { token: session.token, refreshToken: session.refreshToken }),
      ])
      setBalance(bal)
      setSummary(walletSummary)
      setTransactions(tx?.transactions || [])
    } catch (err) {
      setError(err.message || "Could not load wallet.")
    } finally {
      setLoading(false)
    }
  }, [session?.token, session?.refreshToken])

  useEffect(() => {
    load()
  }, [load])

  const handleDeposit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")
    const amount = Number(depositAmount)
    if (!amount || amount < minDeposit) {
      setError(`Minimum deposit is ₹${minDeposit}.`)
      return
    }
    setProcessing(true)
    let pendingOrderId = null
    try {
      const orderData = await vleAuthFetch("/dashboard/wallet/deposit/create-order", {
        token: session.token,
        refreshToken: session.refreshToken,
        httpMethod: "POST",
        body: { amountInr: amount },
      })
      const order = orderData.order
      if (!order?.id) throw new Error("Could not create deposit order.")
      pendingOrderId = order.id

      const payment = await openRazorpayCheckout({
        key: resolveRazorpayKeyId(orderData.keyId),
        amount: order.amount,
        currency: order.currency || "INR",
        name: "SETU VLE Wallet",
        description: "Add money to VLE wallet",
        order_id: order.id,
        prefill: buildRazorpayPrefill({
          name: session?.name,
          email: session?.email,
          contact: session?.phone,
        }),
        theme: { color: "#1C39BB" },
      })

      const result = await vleAuthFetch("/dashboard/wallet/deposit/confirm", {
        token: session.token,
        refreshToken: session.refreshToken,
        httpMethod: "POST",
        body: {
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
        },
      })

      setMessage(
        result.message ||
          `₹${result.creditedInr || amount} added to wallet. New balance: ₹${result.balance?.balanceInr ?? ""}`,
      )
      await load()
    } catch (err) {
      const cancelled = err.message === "Payment cancelled"
      if (pendingOrderId) {
        try {
          await vleAuthFetch("/dashboard/wallet/deposit/mark-outcome", {
            token: session.token,
            refreshToken: session.refreshToken,
            httpMethod: "POST",
            body: {
              razorpay_order_id: pendingOrderId,
              outcome: cancelled ? "cancelled" : "failed",
              reason: cancelled ? "Payment cancelled by user" : err.message || "Payment failed",
            },
          })
        } catch {
          /* sync on reload will reconcile */
        }
      }
      setError(cancelled ? "Payment cancelled." : err.message || "Deposit failed.")
      await load()
    } finally {
      setProcessing(false)
    }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")
    const amount = Number(withdrawAmount)
    if (!amount || amount < minWithdraw) {
      setError(`Minimum withdrawal is ₹${minWithdraw}.`)
      return
    }
    if (!accountHolderName.trim()) {
      setError("Account holder name is required.")
      return
    }
    if (withdrawMethod === "upi" && !vpa.trim()) {
      setError("Enter your UPI ID (e.g. name@upi).")
      return
    }
    if (withdrawMethod === "bank" && (!accountNumber.trim() || !ifsc.trim())) {
      setError("Bank account number and IFSC are required.")
      return
    }

    setProcessing(true)
    try {
      const result = await vleAuthFetch("/dashboard/wallet/withdraw", {
        token: session.token,
        refreshToken: session.refreshToken,
        httpMethod: "POST",
        body: {
          amountInr: amount,
          payoutMethod: withdrawMethod,
          accountHolderName: accountHolderName.trim(),
          vpa: withdrawMethod === "upi" ? vpa.trim() : undefined,
          upiId: withdrawMethod === "upi" ? vpa.trim() : undefined,
          accountNumber: withdrawMethod === "bank" ? accountNumber.trim() : undefined,
          ifsc: withdrawMethod === "bank" ? ifsc.trim().toUpperCase() : undefined,
        },
      })
      setMessage(result.message || "Withdrawal submitted.")
      if (result.warning) setError(result.warning)
      setWithdrawAmount("")
      await load()
    } catch (err) {
      setError(err.message || "Withdrawal failed.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="page-safe-bottom mx-auto max-w-lg px-4 py-6 app-safe-x sm:py-8">

        <div className="rounded-2xl border border-[#D2DEFF] bg-[#1C39BB] p-6 text-white">
          <p className="text-sm text-white/80">Wallet balance</p>
          <p className="mt-1 font-serif text-4xl">
            {loading ? "…" : `₹${balance?.balanceInr ?? summary?.walletBalanceInr ?? 0}`}
          </p>
          <p className="mt-2 text-xs text-white/70">
            Deposit min ₹{minDeposit} · Withdraw min ₹{minWithdraw}
          </p>
        </div>

        {summary && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#D2DEFF] bg-white p-3 text-center">
              <p className="text-lg font-semibold">₹{summary.todayEarningsInr ?? 0}</p>
              <p className="text-[10px] text-setu-muted">Today</p>
            </div>
            <div className="rounded-xl border border-[#D2DEFF] bg-white p-3 text-center">
              <p className="text-lg font-semibold">₹{summary.monthlyEarningsInr ?? 0}</p>
              <p className="text-[10px] text-setu-muted">This month</p>
            </div>
            <div className="rounded-xl border border-[#D2DEFF] bg-white p-3 text-center">
              <p className="text-lg font-semibold">₹{summary.pendingSettlementInr ?? 0}</p>
              <p className="text-[10px] text-setu-muted">Pending</p>
            </div>
          </div>
        )}

        <div className="mt-4 flex rounded-xl border border-[#D2DEFF] bg-white p-1">
          <button
            type="button"
            onClick={() => { setTab("deposit"); setError(""); setMessage("") }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium ${
              tab === "deposit" ? "bg-[#1C39BB] text-white" : "text-setu-muted"
            }`}
          >
            <ArrowDownToLine size={16} />
            Deposit
          </button>
          <button
            type="button"
            onClick={() => { setTab("withdraw"); setError(""); setMessage("") }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium ${
              tab === "withdraw" ? "bg-[#1C39BB] text-white" : "text-setu-muted"
            }`}
          >
            <ArrowUpFromLine size={16} />
            Withdraw
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-[#D2DEFF] bg-white p-5">
          {tab === "deposit" && (
            <form onSubmit={handleDeposit} className="space-y-4">
              <p className="text-sm text-setu-muted">
                Pay via UPI, card, net banking, or wallet through Razorpay checkout.
              </p>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Amount (₹)</span>
                <input
                  type="number"
                  min={minDeposit}
                  step="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3"
                  placeholder={`Min ₹${minDeposit}`}
                />
              </label>
              <button
                type="submit"
                disabled={processing}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {processing && <Loader2 size={16} className="animate-spin" />}
                {processing ? "Processing…" : "Deposit via Razorpay"}
              </button>
            </form>
          )}

          {tab === "withdraw" && (
            <form onSubmit={handleWithdraw} className="space-y-3">
              <p className="text-sm text-setu-muted">
                Withdraw to your UPI ID or bank account via Razorpay payout.
              </p>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Amount (₹)</span>
                <input
                  type="number"
                  min={minWithdraw}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3"
                  placeholder={`Min ₹${minWithdraw}`}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Payout method</span>
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3"
                >
                  <option value="upi">UPI (VPA)</option>
                  <option value="bank">Bank account (IMPS)</option>
                </select>
              </label>
              <input
                className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3"
                placeholder="Account holder name"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
              />
              {withdrawMethod === "upi" ? (
                <input
                  className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3"
                  placeholder="UPI ID (e.g. name@paytm)"
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                />
              ) : (
                <>
                  <input
                    className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3"
                    placeholder="Account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  />
                  <input
                    className="w-full rounded-xl border border-[#D2DEFF] px-3 py-3 uppercase"
                    placeholder="IFSC code"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  />
                </>
              )}
              <button
                type="submit"
                disabled={processing}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1C39BB] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {processing && <Loader2 size={16} className="animate-spin" />}
                Withdraw to {withdrawMethod === "upi" ? "UPI" : "bank"}
              </button>
            </form>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {message && !error && <p className="mt-3 text-sm text-green-700">{message}</p>}
        </div>

        <div className="mt-6 rounded-2xl border border-[#D2DEFF] bg-white p-5">
          <h2 className="mb-3 font-semibold text-setu-charcoal">Recent transactions</h2>
          {loading ? (
            <p className="text-sm text-setu-muted">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-setu-muted">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-[#EEF3FF]">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium capitalize text-setu-charcoal">
                      {tx.type.replace("_", " ")}
                    </p>
                    <p className="text-xs text-setu-muted">{tx.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={tx.type === "withdrawal" ? "text-red-600" : "text-green-700"}>
                      {tx.type === "withdrawal" ? "−" : "+"}₹{tx.amountInr}
                    </p>
                    <p className={`text-xs capitalize ${statusClass(tx.status)}`}>
                      {statusLabel(tx.status)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
    </div>
  )
}
