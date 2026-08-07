import { Link } from "react-router-dom"
import {
  ArrowLeft,
  Bookmark,
  ClipboardList,
  ShoppingCart,
} from "lucide-react"
import { useBookTest } from "../../context/BookTestContext"

const ACCENT = "#7C3AED"

export default function BookTestShell({
  title = "Book Test",
  backTo = "/app/book-tests/home",
  children,
  hideNav = false,
}) {
  const { cartCount } = useBookTest()

  return (
    <div className="min-h-svh bg-[#F7F5FF]">
      <header className="app-shell-header sticky top-0 z-20 border-b border-violet-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <Link
            to={backTo}
            className="tap-target inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-800 transition hover:bg-violet-100"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-display text-lg text-setu-charcoal sm:text-xl">
            {title}
          </h1>
          {!hideNav && (
            <div className="flex items-center gap-1">
              <Link
                to="/app/book-tests/saved"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-violet-700 hover:bg-violet-50"
                aria-label="Saved"
              >
                <Bookmark size={18} />
              </Link>
              <Link
                to="/app/book-tests/orders"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-violet-700 hover:bg-violet-50"
                aria-label="Orders"
              >
                <ClipboardList size={18} />
              </Link>
              <Link
                to="/app/book-tests/cart"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-violet-700 hover:bg-violet-50"
                aria-label="Cart"
              >
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: ACCENT }}
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
      </header>
      <main className="app-shell-main mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-5">
        {children}
      </main>
    </div>
  )
}

export function BookTestPrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-sm transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ backgroundColor: ACCENT }}
      {...props}
    >
      {children}
    </button>
  )
}

export function PackageCard({ item, onOpen, onAdd, adding }) {
  const price = item?._price ?? 0
  const tests = item?._tests || []
  const preview = tests.slice(0, 2)
  const more = Math.max(0, tests.length - preview.length)

  return (
    <article className="flex flex-col rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <button type="button" onClick={onOpen} className="text-left">
        <h3 className="font-semibold text-setu-charcoal line-clamp-2">
          {item?._name}
        </h3>
        <p className="mt-1 text-lg font-bold" style={{ color: ACCENT }}>
          ₹{price}
        </p>
        {preview.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-setu-muted">
            {preview.map((t, i) => (
              <li key={i} className="line-clamp-1">
                • {t?.name || t?.testName || t}
              </li>
            ))}
            {more > 0 && <li className="text-violet-600">+{more} Tests</li>}
          </ul>
        )}
      </button>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 rounded-xl border border-violet-200 py-2 text-xs font-semibold text-violet-800"
        >
          View
        </button>
        <button
          type="button"
          disabled={adding}
          onClick={onAdd}
          className="flex-1 rounded-xl py-2 text-xs font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: ACCENT }}
        >
          {adding ? "Adding…" : "Add To Cart"}
        </button>
      </div>
    </article>
  )
}

export function BillingSummary({ billing }) {
  if (!billing) return null
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4">
      <h3 className="font-semibold text-setu-charcoal">Cart Summary</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-setu-muted">Order Amount</dt>
          <dd>₹{billing.order_amount}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-setu-muted">Platform Fee (5%)</dt>
          <dd>₹{billing.platform_fee}</dd>
        </div>
        {Number(billing.discount) > 0 && (
          <div className="flex justify-between text-emerald-700">
            <dt>Discount</dt>
            <dd>-₹{billing.discount}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-violet-50 pt-2 text-base font-semibold">
          <dt>Total Amount</dt>
          <dd style={{ color: ACCENT }}>₹{billing.total_amount}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-setu-muted">
        {billing.serviceChargesFree
          ? "Service charges free above ₹300"
          : "Service charges may apply at/below ₹300"}
      </p>
    </div>
  )
}