import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useBookTest } from "../../context/BookTestContext"
import {
  addToCart,
  fetchPackageDetails,
  fetchProducts,
  fetchSimilarPackages,
  saveForLater,
} from "../../api/booktest"
import BookTestShell, {
  BookTestPrimaryButton,
  PackageCard,
} from "../../components/booktest/BookTestShell"
import {
  productCode,
  productName,
  productTestGroups,
  productTests,
  resolveProductPrice,
} from "../../utils/booktest"

function enrich(item, fallbacks = {}) {
  const merged = {
    ...fallbacks,
    ...item,
    code: item?.code || fallbacks.code || productCode(item) || productCode(fallbacks),
    name: item?.name || fallbacks.name || productName(item),
    rate: item?.rate ?? item?.price ?? fallbacks.rate ?? fallbacks.price,
  }
  if (item?.price != null && merged.price == null) merged.price = item.price
  return {
    ...merged,
    _code: productCode(merged) || String(fallbacks.code || "").trim(),
    _name: productName(merged),
    _price: resolveProductPrice(merged),
    _tests: productTests(merged),
    _testGroups: productTestGroups(merged),
  }
}

export function BookTestPackages() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const { refreshCart,toggleSaved, isSaved  } = useBookTest()
  const category = location.state?.category || { name: "WELLNESS", code: "WELLNESS" }
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [addingCode, setAddingCode] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const products = await fetchProducts(session, {
          productType: "profile",
          category: category.name || category.code,
        })
        if (!cancelled) setItems((products || []).map(enrich))
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load packages")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session, category.name, category.code])

  const handleAdd = async (item) => {
    setAddingCode(item._code)
    try {
      await addToCart(session, {
        userId: session.user_id,
        productCode: item._code,
        quantity: 1,
      })
      await refreshCart()
    } catch (err) {
      alert(err.message || "Could not add to cart")
    } finally {
      setAddingCode("")
    }
  }
  const handleToggleSave = (item) => {
    const productCode = item?._code || item?.product_code || item?.code
    
    if (!productCode) {
      console.error('No product code found')
      return
    }
    
    toggleSaved(
      productCode,
      !isSaved(productCode),
      {
        product_code: productCode,
        code: productCode,
        _id: productCode,
        _name: item?._name || item?.name || "Saved Test",
        _price: item?._price || item?.price || 0,
        _tests: item?._tests || item?.tests || []
      }
    )
  }

  return (
    <BookTestShell title={category.name || category.code || "Packages"}>
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-violet-700" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-setu-muted">No packages found in this category.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <PackageCard
              key={item._code}
              item={item}
              adding={addingCode === item._code}
              onOpen={() =>
                navigate(`/app/book-tests/packages/${encodeURIComponent(item._code)}`, {
                  state: { package: item },
                })
              }
              onAdd={() => handleAdd(item)}
              onToggleSave={handleToggleSave}
              isSaved={isSaved(item._code)}
            />
          ))}
        </div>
      )}
    </BookTestShell>
  )
}

export function BookTestPackageDetail() {
  const { code } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const { refreshCart, toggleSaved, isSaved } = useBookTest()
  const seeded = location.state?.package
  const [pkg, setPkg] = useState(() =>
    seeded ? enrich(seeded, { code: decodeURIComponent(code || "") }) : null,
  )
  const [similar, setSimilar] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [openGroups, setOpenGroups] = useState({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const [detail, sims] = await Promise.all([
          fetchPackageDetails(session, { userId: session.user_id, code }),
          fetchSimilarPackages(session, { userId: session.user_id, code }).catch(() => []),
        ])
        if (cancelled) return
        // /packageDetails returns { price, packages_list } — merge with list/search seed
        const packageObj =
          detail?.package ||
          detail?.product ||
          (detail?.packages_list || detail?.price != null ? detail : null) ||
          detail?.data ||
          detail ||
          {}
        const fallbacks = {
          ...(location.state?.package || {}),
          code: decodeURIComponent(code || ""),
        }
        setPkg(enrich(packageObj, fallbacks))
        setSimilar((sims || []).map((s) => enrich(s)))
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load package")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session, code, location.state])

  const handleAdd = async () => {
    if (!pkg?._code) return
    setBusy("add")
    try {
      await addToCart(session, {
        userId: session.user_id,
        productCode: pkg._code,
        quantity: 1,
      })
      await refreshCart()
      navigate("/app/book-tests/cart")
    } catch (err) {
      alert(err.message || "Could not add to cart")
    } finally {
      setBusy("")
    }
  }

  const handleSave = () => {
    if (!pkg?._code) return
    
    const productCode = pkg._code
    const isPkgSaved = isSaved(productCode)
    
    // Immediately update the count
    toggleSaved(
      productCode,
      !isPkgSaved,
      {
        product_code: productCode,
        code: productCode,
        _id: productCode,
        _name: pkg._name || "Saved Test",
        _price: pkg._price || 0,
        _tests: pkg._tests || []
      }
    )
    
    // Show feedback
    alert(isPkgSaved ? "Removed from saved" : "Saved for later")
  }

  return (
    <BookTestShell title="Package details" backTo="/app/book-tests/packages">
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-violet-700" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !pkg ? (
        <p className="text-sm text-setu-muted">Package not found.</p>
      ) : (
        <div className="space-y-5">
          <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-2xl text-setu-charcoal">{pkg._name}</h2>
            <p className="mt-2 text-2xl font-bold text-violet-700">₹{pkg._price}</p>
            <p className="mt-1 text-sm text-setu-muted">
              includes {pkg._tests.length ? pkg._tests.length : "—"} tests
            </p>
            <div className="mt-4 flex gap-2">
              <BookTestPrimaryButton onClick={handleAdd} disabled={busy === "add"}>
                {busy === "add" ? "Adding…" : "Add To Cart"}
              </BookTestPrimaryButton>
              <button
                type="button"
                onClick={handleSave}
                disabled={busy === "save"}
                className="min-h-12 rounded-2xl border border-violet-200 px-4 text-sm font-semibold text-violet-800"
              >
                Save for Later
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-violet-100 bg-white p-5">
            <h3 className="font-semibold text-setu-charcoal">Tests included</h3>
            {!pkg._testGroups?.length ? (
              <p className="mt-3 text-sm text-setu-muted">No test details available for this package.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {pkg._testGroups.map((group, gi) => {
                  const open = openGroups[gi] ?? gi === 0
                  return (
                    <div key={`${group.name}-${gi}`} className="overflow-hidden rounded-2xl bg-violet-50/60">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                        onClick={() =>
                          setOpenGroups((prev) => ({ ...prev, [gi]: !open }))
                        }
                      >
                        <span>
                          <span className="block text-sm font-semibold capitalize text-setu-charcoal">
                            {group.name}
                          </span>
                          <span className="text-xs text-setu-muted">
                            includes {group.tests.length} tests
                          </span>
                        </span>
                        <span className="text-violet-600">{open ? "−" : "+"}</span>
                      </button>
                      {open && (
                        <ul className="space-y-1.5 border-t border-violet-100/80 px-3 py-3 text-sm text-setu-muted">
                          {group.tests.map((t, i) => (
                            <li key={i}>• {t?.name || t}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {similar.length > 0 && (
            <section>
              <h3 className="mb-3 font-display text-xl">Similar packages</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {similar.map((item) => (
                  <PackageCard
                    key={item._code}
                    item={item}
                    onOpen={() =>
                      navigate(
                        `/app/book-tests/packages/${encodeURIComponent(item._code)}`,
                        { state: { package: item } },
                      )
                    }
                    onAdd={async () => {
                      await addToCart(session, {
                        userId: session.user_id,
                        productCode: item._code,
                        quantity: 1,
                      })
                      await refreshCart()
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </BookTestShell>
  )
}
