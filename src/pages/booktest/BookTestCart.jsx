import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Loader2, Minus, Trash2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useBookTest } from "../../context/BookTestContext"
import { addToCart, removeFromCart } from "../../api/booktest"
import BookTestShell, {
  BillingSummary,
  BookTestPrimaryButton,
} from "../../components/booktest/BookTestShell"
import { parseLineItemPrice, productCode, productName } from "../../utils/booktest"

export default function BookTestCart() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { cartItems, billing, cartLoading, refreshCart } = useBookTest()
  const [busyCode, setBusyCode] = useState("")

  const updateQty = async (item, delta) => {
    const code = productCode(item)
    const qty = parseInt(item.quantity, 10) || 1
    setBusyCode(code)
    try {
      if (delta < 0 && qty <= 1) {
        await removeFromCart(session, { userId: session.user_id, productCode: code })
      } else {
        await addToCart(session, {
          userId: session.user_id,
          productCode: code,
          quantity: delta,
        })
      }
      await refreshCart()
    } catch (err) {
      alert(err.message || "Could not update cart")
    } finally {
      setBusyCode("")
    }
  }

  return (
    <BookTestShell title="Cart" backTo="/app/book-tests/home">
      {cartLoading && cartItems.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-violet-700" />
        </div>
      ) : cartItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-violet-200 bg-white p-8 text-center">
          <p className="font-semibold text-setu-charcoal">Your cart is empty</p>
          <p className="mt-1 text-sm text-setu-muted">Add packages to continue booking.</p>
          <Link
            to="/app/book-tests/home"
            className="mt-4 inline-flex rounded-2xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white"
          >
            Add more tests
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {cartItems.map((item) => {
            const code = productCode(item)
            const name = productName(item)
            const qty = parseInt(item.quantity, 10) || 1
            const line = parseLineItemPrice(item)
            return (
              <div
                key={code}
                className="flex items-start justify-between gap-3 rounded-2xl border border-violet-100 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-setu-charcoal line-clamp-2">{name}</h3>
                  <p className="mt-1 text-sm text-violet-700">₹{line}</p>
                  <p className="text-xs text-setu-muted">{code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyCode === code}
                    onClick={() => updateQty(item, -1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-800"
                  >
                    {qty <= 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                </div>
              </div>
            )
          })}

          <BillingSummary billing={billing} />

          <div className="flex gap-2">
            <Link
              to="/app/book-tests/home"
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-violet-200 text-sm font-semibold text-violet-800"
            >
              Add more tests
            </Link>
            <div className="flex-1">
              <BookTestPrimaryButton onClick={() => navigate("/app/book-tests/patient")}>
                Continue
              </BookTestPrimaryButton>
            </div>
          </div>
        </div>
      )}
    </BookTestShell>
  )
}