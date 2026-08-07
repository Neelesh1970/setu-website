import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  CalendarDays,
  ChevronRight,
  Leaf,
  Loader2,
  MessageCircle,
  Package,
  ShoppingCart,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import {
  agriImage,
  cartLineCount,
  fetchAgriBanners,
  fetchAgriCart,
  fetchAgriKnowledge,
  fetchAgriProducts,
  formatInr,
} from "../../api/agri"
import { AgriShell } from "./AgriShell"

export default function AgriHub() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const auth = { token: session?.token, refreshToken: session?.refreshToken }

  const [banners, setBanners] = useState([])
  const [products, setProducts] = useState([])
  const [knowledge, setKnowledge] = useState([])
  const [tab, setTab] = useState("all")
  const [cartCount, setCartCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        setLoading(true)
        setError("")
        const [b, p, k] = await Promise.all([
          fetchAgriBanners().catch(() => []),
          fetchAgriProducts({ limit: 6, ...auth }).catch(() => []),
          fetchAgriKnowledge().catch(() => []),
        ])
        if (cancel) return
        setBanners(b)
        setProducts(p)
        setKnowledge(k)
        if (auth.token) {
          const cart = await fetchAgriCart(auth).catch(() => null)
          if (!cancel) setCartCount(cartLineCount(cart))
        }
      } catch (err) {
        if (!cancel) setError(err.message || "Failed to load Agri Connect")
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [session?.token])

  const filteredKnowledge = useMemo(() => {
    if (tab === "videos") return knowledge.filter((k) => k.type === "video")
    if (tab === "articles") return knowledge.filter((k) => k.type === "article")
    return knowledge
  }, [knowledge, tab])

  return (
    <AgriShell
      title="Agri Connect"
      backTo="/app"
      rightAction={
        <div className="flex items-center gap-1">
          <Link
            to="/app/agriculture/inquiry/history"
            className="rounded-lg p-1.5 text-white hover:bg-white/10"
            aria-label="Inquiries"
          >
            <MessageCircle size={18} />
          </Link>
          <Link
            to="/app/agriculture/soil/bookings"
            className="rounded-lg p-1.5 text-white hover:bg-white/10"
            aria-label="Soil bookings"
          >
            <CalendarDays size={18} />
          </Link>
          <Link
            to="/app/agriculture/cart"
            className="relative rounded-lg p-1.5 text-white hover:bg-white/10"
            aria-label="Cart"
          >
            {/* <ShoppingCart size={18} /> */}
            {/* {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F59E0B] px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            ) : null} */}
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#1E6E33]" size={28} />
        </div>
      ) : null}

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      {!loading ? (
        <>
          {banners[0] ? (
            <button
              type="button"
              onClick={() => navigate("/app/agriculture/soil")}
              className="relative mb-5 w-full overflow-hidden rounded-2xl text-left shadow-sm"
            >
              <img
                src={agriImage(banners[0].image_key)}
                alt=""
                 className="w-full h-auto max-h-[320px] object-contain bg-white"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-4">
                <p className="text-lg font-semibold text-white">
                  {banners[0].text || "Book soil / field service"}
                </p>
                <span className="mt-2 inline-flex w-fit rounded-full bg-[#307E33] px-4 py-1.5 text-xs font-semibold text-white">
                  {banners[0].button_label || "Book now"}
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/app/agriculture/soil")}
              className="mb-5 w-full rounded-2xl bg-[#1E6E33] p-5 text-left text-white shadow-sm"
            >
              <p className="text-lg font-semibold">Book soil testing</p>
              <p className="mt-1 text-sm text-white/80">
                Schedule field soil analysis for your crop
              </p>
            </button>
          )}

          <div className="mb-6">
            <Link
              to="/app/agriculture/inquiry"
              className="flex items-center gap-3 rounded-2xl border border-[#D9E3D7] bg-white p-4 shadow-sm"
            >
              <span className="rounded-xl bg-[#E6F3E8] p-2.5 text-[#1E6E33]">
                <MessageCircle size={20} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-[#1E2E1F]">Ask an expert</span>
                <span className="text-xs text-[#6E8371]">Submit an inquiry</span>
              </span>
              <ChevronRight size={18} className="text-[#9CA3AF]" />
            </Link>
          </div>

          {/* <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1E2E1F]">
              <Package size={16} className="text-[#1E6E33]" />
              Farming products
            </h2>
            <Link
              to="/app/agriculture/products"
              className="text-xs font-semibold text-[#1E6E33]"
            >
              See all
            </Link>
          </div>
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/app/agriculture/products/${p.id}`)}
                className="overflow-hidden rounded-2xl border border-[#D9E3D7] bg-white text-left shadow-sm"
              >
                <img
                  src={agriImage(p.image_url || p.image_key, p.category)}
                  alt=""
                  className="h-28 w-full object-cover bg-[#E6F3E8]"
                />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-[#1E2E1F]">
                    {p.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#1E6E33]">
                    {formatInr(p.price)}
                  </p>
                </div>
              </button>
            ))}
            {products.length === 0 ? (
              <p className="col-span-full py-6 text-center text-sm text-[#6E8371]">
                No products yet.
              </p>
            ) : null}
          </div> */}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1E2E1F]">
              <Leaf size={16} className="text-[#1E6E33]" />
              Knowledge hub
            </h2>
            <Link
              to="/app/agriculture/knowledge"
              className="text-xs font-semibold text-[#1E6E33]"
            >
              More
            </Link>
          </div>
          <div className="mb-4 flex gap-2">
            {[
              ["all", "All"],
              ["videos", "Videos"],
              ["articles", "Articles"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  tab === key
                    ? "bg-[#1E6E33] text-white"
                    : "bg-[#E6F3E8] text-[#1E6E33]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filteredKnowledge.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  navigate(`/app/agriculture/knowledge/${item.id}`, {
                    state: { item },
                  })
                }
                className="flex w-full gap-3 rounded-2xl border border-[#D9E3D7] bg-white p-3 text-left shadow-sm"
              >
                <img
                  src={agriImage(item.image_key)}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl object-cover bg-[#E6F3E8]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium uppercase text-[#1E6E33]">
                    {item.type || "article"}
                  </span>
                  <span className="mt-0.5 block font-semibold text-[#1E2E1F] line-clamp-2">
                    {item.title}
                  </span>
                  {item.subtitle ? (
                    <span className="mt-0.5 block text-xs text-[#6E8371] line-clamp-1">
                      {item.subtitle}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
            {filteredKnowledge.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#6E8371]">
                No knowledge items yet.
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </AgriShell>
  )
}
