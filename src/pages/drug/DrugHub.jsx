import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ChevronRight,
  Leaf,
  Loader2,
  Pill,
  Search,
  X,
  RefreshCw,
  AlertCircle,
  Newspaper,
  ChevronLeft,
} from "lucide-react"
import {
  POPULAR_DRUGS,
  pickShortDescription,
  resolveAyurvedaName,
  resolveDrugName,
  searchHub,
} from "../../api/drug"
import { DrugListItem, DrugShell } from "./DrugShell"

// ── News API constants ──
const NEWS_API_KEY = "1ba16c32d3a044a4b51be795dac12d1b"
const NEWS_API_URL =
  "https://newsapi.org/v2/top-headlines?category=health&pageSize=20"

// ── Time helper ──
const timeAgo = (iso) => {
  if (!iso) return ""
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  const m = Math.floor(diff / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d`
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}m`
  return "just now"
}

const todayLabel = () =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date())

// ============================================================
// 1. Main DrugHub component (default export)
// ============================================================
export default function DrugHub() {
  const navigate = useNavigate()
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const requestId = useRef(0)

  // ── News states ──
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState("")

  // ── Fetch news ──
  const fetchNews = useCallback(async () => {
    setNewsError("")
    setNewsLoading(true)
    try {
      const res = await fetch(NEWS_API_URL, {
        headers: { "X-Api-Key": NEWS_API_KEY },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`)
      const articles = Array.isArray(json?.articles) ? json.articles : []
      setNews(articles.slice(0, 5))
    } catch (err) {
      setNewsError(err.message || "Failed to load medical updates")
      setNews([
        { title: "New BP medicine guidelines", url: "#", urlToImage: null, description: "Doctors advise updated dosage..." },
        { title: "Diabetes drug updates", url: "#", urlToImage: null, description: "Recent studies show..." },
        { title: "COVID-19 treatment protocols", url: "#", urlToImage: null, description: "Revised treatment guidelines..." },
        { title: "Mental health medication news", url: "#", urlToImage: null, description: "New approvals in mental health..." },
        { title: "Pediatric drug safety alerts", url: "#", urlToImage: null, description: "Safety updates for children..." },
      ])
    } finally {
      setNewsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const handleRefreshNews = () => {
    setNewsLoading(true)
    fetchNews()
  }

  const openNewsURL = (url) => {
    if (url && url !== "#") {
      window.open(url, "_blank")
    }
  }

  // ── Search logic ──
  useEffect(() => {
    const q = query.trim()
    if (!showSearch || q.length < 2) {
      setResults([])
      setLoading(false)
      setError("")
      return undefined
    }
    const id = ++requestId.current
    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        setError("")
        const items = await searchHub(q, { limit: 12 })
        if (requestId.current === id) setResults(items)
      } catch (err) {
        if (requestId.current === id) {
          setError(err.message || "Search failed")
        }
      } finally {
        if (requestId.current === id) setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query, showSearch])

  const openResult = useCallback(
    (item) => {
      if (item.kind === "ayurveda") {
        navigate(`/app/drug-directory/ayurveda/${encodeURIComponent(item.id)}`, {
          state: { summary: item },
        })
        return
      }
      navigate(`/app/drug-directory/drugs/${encodeURIComponent(item.id)}`, {
        state: { summary: item },
      })
    },
    [navigate],
  )

  const closeSearch = () => {
    setShowSearch(false)
    setQuery("")
    setResults([])
    setError("")
  }

  // ── Render ──
  return (
    <DrugShell
      title="Drug Directory"
      backTo="/app"
      rightAction={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => (showSearch ? closeSearch() : setShowSearch(true))}
            className="rounded-lg p-1.5 text-white hover:bg-white/10"
            aria-label={showSearch ? "Close search" : "Search"}
          >
            {showSearch ? <X size={18} /> : <Search size={18} />}
          </button>
        </div>
      }
      onBack={showSearch ? closeSearch : undefined}
    >
      {showSearch ? (
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5">
            <Search size={16} className="text-[#999]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search drugs or Ayurvedic medicines..."
              className="w-full bg-transparent text-sm outline-none"
              autoFocus
            />
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-[#1C39BB]" size={24} />
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="space-y-2">
            {results.map((item) => {
              const isDrug = item.kind === "drug"
              return (
                <DrugListItem
                  key={`${item.kind}-${item.id}`}
                  title={
                    isDrug ? resolveDrugName(item) : resolveAyurvedaName(item)
                  }
                  meta={isDrug ? "Allopathy drug" : "Ayurvedic medicine"}
                  description={pickShortDescription(item)}
                  icon={isDrug ? <Pill size={18} /> : <Leaf size={18} />}
                  onClick={() => openResult(item)}
                />
              )
            })}
            {!loading && query.trim().length >= 2 && results.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6B7280]">
                No medicines found.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <p className="mb-5 text-sm text-[#6B7280]">
            Search trusted medicine info — allopathy drugs and Ayurvedic medicines,
            same as the SETU app.
          </p>

          <div className="space-y-3">
            <Link
              to="/app/drug-directory/drugs"
              className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:border-[#1C39BB]/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1C39BB] text-white">
                <Pill size={22} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-[#1C1C1C]">
                  Drugs Information
                </span>
                <span className="mt-0.5 block text-xs text-[#6B7280]">
                  Simple, trusted medicine info
                </span>
              </span>
              <ChevronRight size={20} className="text-[#9CA3AF]" />
            </Link>

            <Link
              to="/app/drug-directory/ayurveda"
              className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:border-[#1C39BB]/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F766E] text-white">
                <Leaf size={22} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-[#1C1C1C]">
                  Ayurvedic Medicines
                </span>
                <span className="mt-0.5 block text-xs text-[#6B7280]">
                  Gentle, natural care
                </span>
              </span>
              <ChevronRight size={20} className="text-[#9CA3AF]" />
            </Link>
          </div>

          <h2 className="mb-3 mt-8 text-sm font-semibold text-[#555]">
            Popular medicines
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {POPULAR_DRUGS.map((drug) => (
              <button
                key={drug.id}
                type="button"
                onClick={() =>
                  navigate(`/app/drug-directory/drugs/${encodeURIComponent(drug.id)}`, {
                    state: { summary: { id: drug.id, generic_name: drug.name } },
                  })
                }
                className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-left text-sm font-medium text-[#1C1C1C] shadow-sm transition hover:border-[#1C39BB]/40"
              >
                {drug.name}
              </button>
            ))}
          </div>

          {/* Medical Updates */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#555]">
                Medical Updates
              </h2>
              <button
                onClick={handleRefreshNews}
                className="text-gray-400 hover:text-gray-600 transition"
                disabled={newsLoading}
              >
                <RefreshCw
                  size={16}
                  className={newsLoading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {newsLoading ? (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="w-14 h-14 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : newsError ? (
              <div className="bg-white rounded-2xl border border-red-200 p-4 text-center">
                <AlertCircle className="mx-auto text-red-500" size={32} />
                <p className="text-sm text-red-600 mt-2">{newsError}</p>
                <button
                  onClick={handleRefreshNews}
                  className="mt-3 text-sm text-blue-600 font-semibold hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#1C39BB] overflow-hidden shadow-sm">
                <div className="divide-y divide-gray-100">
                  {news.map((item, index) => {
                    const title = item.title || "Medical update"
                    const description =
                      item.description ||
                      item.content?.substring(0, 80) ||
                      "Latest health news"
                    const imageUrl =
                      item.urlToImage ||
                      "https://via.placeholder.com/60x60?text=News"

                    return (
                      <div
                        key={item.url || index}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition"
                        onClick={() => openNewsURL(item.url)}
                      >
                        <img
                          src={imageUrl}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 line-clamp-2">
                            {title}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                            {description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="px-4 py-3 border-t border-gray-100 text-center">
                  <button
                    onClick={() => navigate("/app/health-news")}
                    className="inline-flex items-center gap-1 text-sm font-bold text-[#1E3A8A] hover:text-blue-900 transition"
                  >
                    Explore more <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </DrugShell>
  )
}

// ============================================================
// 2. HealthNews – Full news page using DrugShell header
// ============================================================
export function HealthNews() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState([])
  const [sourceChips, setSourceChips] = useState([])
  const [activeCat, setActiveCat] = useState("All")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const scrollContainerRef = useRef(null)

  // Fetch news
  const fetchNews = useCallback(async () => {
    setError("")
    try {
      setLoading(true)
      const res = await fetch(NEWS_API_URL, {
        headers: { "X-Api-Key": NEWS_API_KEY },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`)
      const list = Array.isArray(json?.articles) ? json.articles : []
      setArticles(list)
      const names = Array.from(
        new Set(list.map((a) => a?.source?.name).filter(Boolean))
      ).slice(0, 12)
      setSourceChips(names)
    } catch (e) {
      setError(e?.message || "Failed to load news")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const onRefresh = () => {
    setRefreshing(true)
    fetchNews()
  }

  const openURL = (url) => {
    if (url && url !== "#") {
      window.open(url, "_blank")
    }
  }

  const filtered = useMemo(() => {
    if (activeCat === "All") return articles
    return articles.filter((a) => a?.source?.name === activeCat)
  }, [articles, activeCat])

  const featured = filtered?.[0] || null
  const rest = filtered?.length > 1 ? filtered.slice(1) : []

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: "smooth" })
    }
  }

  if (loading && !articles.length) {
    return (
      <DrugShell title="Health News" backTo="/app/drug-directory" showTabs={false}>
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-600" size={28} />
        </div>
      </DrugShell>
    )
  }

  return (
    <DrugShell
      title="Health News"
      backTo="/app/drug-directory"
      showTabs={false}
      rightAction={
        <button
          onClick={onRefresh}
          className="p-1.5 text-white hover:bg-white/10 rounded-lg"
          aria-label="Refresh"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
      }
    >
      <div className="max-w-full sm:max-w-3xl md:max-w-5xl lg:max-w-7xl mx-auto">
        {/* Subheader */}
        <p className="text-sm text-gray-500 text-center mb-4">
          {todayLabel()} • global
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {/* Featured Article */}
        {featured && (
          <div
            className="cursor-pointer mb-6"
            onClick={() => openURL(featured.url)}
          >
            <img
              src={featured.urlToImage || "https://via.placeholder.com/1200x800?text=Health+News"}
              alt="Featured"
              className="w-full h-40 object-cover rounded-xl bg-gray-100"
            />
            <p className="text-xs font-bold text-gray-400 uppercase mt-2">Featured</p>
            <h2 className="text-lg font-bold text-gray-900 mt-1">
              {featured.title || "Health update"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {featured.source?.name || "Unknown"} • {timeAgo(featured.publishedAt)}
            </p>
          </div>
        )}

        {/* Source chips with scroll arrows – fixed width & wrapping */}
        {sourceChips.length > 0 && (
  <div className="mb-5 flex items-center gap-3">
    <button
      onClick={scrollLeft}
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-md active:scale-95"
    >
      <ChevronLeft size={18} className="text-gray-600" />
    </button>

    <div
      ref={scrollContainerRef}
      className="flex flex-1 items-center gap-2 overflow-x-auto scroll-smooth whitespace-nowrap no-scrollbar"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {["All", ...sourceChips].map((chip) => {
        const active = activeCat === chip;

        return (
          <button
            key={chip}
            onClick={() => setActiveCat(chip)}
            className={`
              relative
              flex-shrink-0
              rounded-full
              px-5
              py-2
              text-sm
              font-medium
              transition-all
              duration-200
              whitespace-nowrap
              ${
                active
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              }
            `}
          >
            {chip}
          </button>
        );
      })}
    </div>

    <button
      onClick={scrollRight}
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-md active:scale-95"
    >
      <ChevronRight size={18} className="text-gray-600" />
    </button>
  </div>
)}

        {/* Article list */}
        {rest.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Newspaper size={32} />
            <p className="mt-2 text-sm">No articles found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rest.map((item, idx) => (
              <div
                key={item.url || idx}
                className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-50 px-2 rounded-lg"
                onClick={() => openURL(item.url)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-3">
                    {item.title || "Health article"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {item.source?.name || "Unknown"} • {timeAgo(item.publishedAt)}
                  </p>
                </div>
                <img
                  src={item.urlToImage || "https://via.placeholder.com/400x300?text=No+Image"}
                  alt=""
                  className="w-20 h-16 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </DrugShell>
  )
}