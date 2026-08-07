import { useCallback, useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Search, X, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"
import {
  fetchAyurvedaList,
  resolveAyurvedaName,
  searchAyurveda,
} from "../../api/drug"
import { DrugShell } from "./DrugShell"

export default function AyurvedaHome() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [letter, setLetter] = useState("")
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  // Ref for pagination scroll container
  const paginationScrollRef = useRef(null)

  const run = useCallback(async ({ q, alphabet, pageNum, append }) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError("")
      const res = q
        ? await searchAyurveda({ query: q, page: pageNum, limit: 20 })
        : await fetchAyurvedaList({
            page: pageNum,
            limit: 20,
            alphabet: alphabet || undefined,
          })
      setPage(pageNum)
      setTotalPages(res.totalPages)
      setItems((prev) => (append ? [...prev, ...res.items] : res.items))
    } catch (err) {
      setError(err.message || "Failed to load Ayurvedic medicines")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length >= 2) {
      const timer = setTimeout(
        () => run({ q, pageNum: 1, append: false }),
        350,
      )
      return () => clearTimeout(timer)
    }
    run({ alphabet: letter || undefined, pageNum: 1, append: false })
    return undefined
  }, [query, letter, run])

  const activeQuery = query.trim().length >= 2 ? query.trim() : ""
  const showPagination = totalPages > 1 && !loading

  const toggleSearch = () => {
    const next = !showSearch
    setShowSearch(next)
    if (!next) {
      setQuery("")
      setLetter("")
      run({ alphabet: letter || undefined, pageNum: 1, append: false })
    }
  }

  // ── Pagination handlers ──
  const handlePagePress = (pageNum) => {
    if (pageNum === page || loading) return
    if (activeQuery) {
      run({ q: activeQuery, pageNum, append: false })
    } else {
      run({ alphabet: letter || undefined, pageNum, append: false })
    }
    // Scroll to top when changing page
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePrevious = () => {
    if (page > 1 && !loading) handlePagePress(page - 1)
  }

  const handleNext = () => {
    if (page < totalPages && !loading) handlePagePress(page + 1)
  }

  // Auto-scroll pagination chips to keep active page visible
  useEffect(() => {
    if (paginationScrollRef.current && totalPages > 0) {
      const container = paginationScrollRef.current
      const activeChip = container.querySelector(`[data-page="${page}"]`)
      if (activeChip) {
        const chipOffset = activeChip.offsetLeft - container.offsetWidth / 2 + activeChip.offsetWidth / 2
        container.scrollTo({ left: chipOffset, behavior: "smooth" })
      }
    }
  }, [page, totalPages])

  return (
    <DrugShell
      title="Ayurvedic Medicines"
      backTo="/app/drug-directory"
      rightAction={
        <button
          type="button"
          onClick={toggleSearch}
          className="rounded-lg p-1.5 text-white hover:bg-white/10"
          aria-label={showSearch ? "Close search" : "Search"}
        >
          {showSearch ? <X size={18} /> : <Search size={18} />}
        </button>
      }
    >
      {showSearch && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5">
          <Search size={16} className="text-[#999]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (e.target.value.trim()) setLetter("")
            }}
            placeholder="Search Ayurvedic medicines..."
            className="w-full bg-transparent text-sm outline-none"
            autoFocus
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear">
              <X size={16} className="text-[#999]" />
            </button>
          )}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#0F766E]" size={28} />
        </div>
      ) : null}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {!loading && items.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#6B7280]">
          No Ayurvedic medicines found.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((item) => {
              const imageUrl = item.image_url || item.thumbnail || null
              return (
                <button
                  key={item.id}
                  onClick={() =>
                    navigate(
                      `/app/drug-directory/ayurveda/${encodeURIComponent(item.id)}`,
                      { state: { summary: item } },
                    )
                  }
                  className="group bg-white rounded-2xl border border-teal-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={resolveAyurvedaName(item)}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon size={40} />
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-3 bg-teal-50 border-t border-teal-200">
                    <p className="text-sm font-semibold text-teal-800 text-center line-clamp-2 min-h-[40px] flex items-center justify-center">
                      {resolveAyurvedaName(item)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Pagination */}
          {showPagination && (
            <div className="mt-8 flex items-center justify-between gap-2 border-t border-gray-200 pt-4">
              <button
                onClick={handlePrevious}
                disabled={page === 1 || loading}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  page === 1 || loading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-teal-600 text-white hover:bg-teal-700 transition"
                }`}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <div
                ref={paginationScrollRef}
                className="flex gap-1.5 overflow-x-auto px-2 py-1 flex-1 justify-center scroll-smooth"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    data-page={p}
                    onClick={() => handlePagePress(p)}
                    disabled={p === page || loading}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-semibold flex-shrink-0 transition ${
                      p === page
                        ? "bg-teal-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={page >= totalPages || loading}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  page >= totalPages || loading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-teal-600 text-white hover:bg-teal-700 transition"
                }`}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </DrugShell>
  )
}