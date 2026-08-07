import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Phone, ShieldCheck, ChevronRight } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { appModules } from "../data/content"
import { useAuth } from "../context/AuthContext"
import { loadDashboardExtras } from "../api/dashboard"
import { DashboardSkeleton } from "../components/AppSkeleton"

function bannerImage(banner) {
  return (
    banner?.imageUrl ||
    banner?.image_url ||
    banner?.banner_url ||
    banner?.url ||
    banner?.iconUrl ||
    ""
  )
}

function sliderImage(slide) {
  return (
    slide?.imageUrl ||
    slide?.image_url ||
    slide?.media_url ||
    slide?.url ||
    ""
  )
}

const QUICK_SOS = [
  { label: "Ambulance", tel: "108" },
  { label: "Police", tel: "100" },
  { label: "Fire", tel: "101" },
  { label: "Women", tel: "1091" },
]

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function AppDashboard() {
  const { session, refreshSession } = useAuth()
  const reduceMotion = useReducedMotion()
  const [banners, setBanners] = useState([])
  const [sliders, setSliders] = useState([])
  const [loading, setLoading] = useState(true)
  const [iconError, setIconError] = useState({})
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        await refreshSession()
      } catch {
        /* session already validated at boot */
      }
      if (cancelled) return
      try {
        const extras = await loadDashboardExtras({
          token: session?.token,
          refreshToken: session?.refreshToken,
        })
        if (cancelled) return
        setBanners(Array.isArray(extras.banners) ? extras.banners : [])
        setSliders(Array.isArray(extras.sliders) ? extras.sliders : [])
      } catch {
        if (!cancelled) {
          setBanners([])
          setSliders([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user_id])

  const mediaItems = [
    ...sliders.map((s, i) => ({
      key: `slider-${i}`,
      src: sliderImage(s),
      title: s?.title || "",
    })),
    ...banners.map((b, i) => ({
      key: `banner-${i}`,
      src: bannerImage(b),
      title: b?.title || "",
    })),
  ].filter((item) => item.src)

  useEffect(() => {
    if (mediaItems.length < 2) return undefined
    const id = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % mediaItems.length)
    }, 4500)
    return () => clearInterval(id)
  }, [mediaItems.length])

  if (loading) {
    return <DashboardSkeleton />
  }

  const activeSlide = mediaItems[slideIndex] || mediaItems[0]
  const motionSafe = reduceMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : fadeUp

  return (
    <main className="relative isolate min-h-full overflow-hidden">
      {/* Atmospheric backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-setu-cream"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,color-mix(in_srgb,var(--color-setu-teal-mist)_55%,transparent),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-setu-coral)_18%,transparent),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-setu-teal)_12%,transparent),transparent_70%)] blur-2xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-8">
        <section className="mb-7 sm:mb-8">
          <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
            <h2 className="text-sm font-semibold tracking-wide text-setu-teal-deep sm:text-base">
              Services
            </h2>
            <span className="hidden h-px flex-1 bg-gradient-to-r from-setu-stone/60 to-transparent sm:block" />
          </div>

          <motion.div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: reduceMotion ? 0 : 0.04,
                },
              },
            }}
          >
            {appModules.map((module) => (
              <motion.div key={module.id} variants={motionSafe} transition={{ duration: 0.28, ease: [0.15, 0, 0.12, 1] }}>
                <Link
                  to={`/app/${module.id}`}
                  className="group flex min-h-[7.5rem] flex-col items-center justify-center rounded-2xl border border-setu-stone/35 bg-white/70 px-3 py-4 text-center shadow-[0_1px_0_rgba(42,40,38,0.04)] backdrop-blur-sm transition-all duration-normal ease-vantara hover:-translate-y-0.5 hover:border-setu-teal/45 hover:bg-white hover:shadow-[0_10px_24px_-14px_rgba(63,74,84,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-setu-teal/40 sm:min-h-[8.5rem] sm:px-4 sm:py-5"
                >
                  <div className="mb-2.5 flex h-[4.25rem] w-[4.25rem] items-center justify-center sm:mb-3 sm:h-[5rem] sm:w-[5rem]">
                    {iconError[module.id] ? (
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-setu-teal-light text-xl font-semibold text-setu-teal-deep sm:h-16 sm:w-16">
                        {module.title.charAt(0)}
                      </span>
                    ) : (
                      <img
                        src={module.icon}
                        alt=""
                        className="max-h-full max-w-full object-contain transition-transform duration-normal ease-vantara group-hover:scale-[1.06]"
                        onError={() =>
                          setIconError((prev) => ({ ...prev, [module.id]: true }))
                        }
                      />
                    )}
                  </div>
                  <p className="max-w-[9rem] text-xs font-medium leading-snug text-setu-charcoal sm:max-w-none sm:text-sm">
                    {module.title}
                  </p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {activeSlide && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.15, 0, 0.12, 1] }}
            className="relative mb-7 overflow-hidden rounded-2xl border border-setu-stone/40 bg-setu-sand shadow-[0_8px_28px_-12px_rgba(42,40,38,0.18)] sm:mb-8"
          >
            <img
              key={activeSlide.key}
              src={activeSlide.src}
              alt={activeSlide.title || "SETU highlight"}
              className="w-full h-[220px] sm:h-[260px] md:h-[350px] object-cover object-center rounded-2xl"
              loading="lazy"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-setu-charcoal/25 to-transparent"
            />
            {mediaItems.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {mediaItems.slice(0, 6).map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                    onClick={() => setSlideIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-normal ease-vantara ${
                      i === slideIndex % mediaItems.length
                        ? "w-5 bg-setu-cream"
                        : "w-1.5 bg-setu-cream/55 hover:bg-setu-cream/80"
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.12, ease: [0.15, 0, 0.12, 1] }}
        >
          <Link
            to="/app/abha"
            className="group mb-4 flex items-center gap-4 overflow-hidden rounded-2xl border border-setu-teal-mist bg-gradient-to-br from-setu-teal-light via-white to-setu-coral-light/60 p-4 shadow-[0_6px_20px_-14px_rgba(63,74,84,0.35)] transition-all duration-normal ease-vantara hover:-translate-y-0.5 hover:border-setu-teal/50 hover:shadow-[0_12px_28px_-14px_rgba(63,74,84,0.4)] sm:mb-5 sm:p-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-sm ring-1 ring-setu-teal-mist sm:h-14 sm:w-14">
              <ShieldCheck className="text-setu-teal-deep" size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-setu-charcoal">Create your ABHA</p>
              <p className="mt-0.5 text-sm leading-snug text-setu-muted">
                One national health ID for all your records
              </p>
            </div>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-setu-teal-dark/90 text-setu-cream transition-transform duration-normal ease-vantara group-hover:translate-x-0.5">
              <ChevronRight size={16} />
            </span>
          </Link>

          <section className="overflow-hidden rounded-2xl border border-red-200/70 bg-gradient-to-br from-[#FFF8F7] via-white to-[#FFF1F0] shadow-[0_6px_20px_-14px_rgba(180,40,40,0.22)]">
            <div className="flex items-center justify-between gap-3 border-b border-red-100/80 px-4 py-3.5 sm:px-5">
              <div>
                <p className="font-semibold text-setu-charcoal">Emergency help</p>
                <p className="mt-0.5 text-xs text-setu-muted sm:text-sm">
                  Quick dial national helplines
                </p>
              </div>
              <Link
                to="/app/sos"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#EA080E] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                <Phone size={13} />
                SOS
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5 p-3.5 sm:grid-cols-4 sm:gap-3 sm:p-4">
              {QUICK_SOS.map((item) => (
                <a
                  key={item.tel}
                  href={`tel:${item.tel}`}
                  className="rounded-xl border border-red-100/80 bg-white/90 px-3 py-3.5 text-center transition-all duration-normal ease-vantara hover:-translate-y-0.5 hover:border-red-200 hover:shadow-[0_8px_18px_-12px_rgba(180,40,40,0.35)]"
                >
                  <p className="text-lg font-semibold tracking-tight text-[#EA080E]">
                    {item.tel}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-setu-muted">
                    {item.label}
                  </p>
                </a>
              ))}
            </div>
          </section>
        </motion.div>
      </div>
    </main>
  )
}
