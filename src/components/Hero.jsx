import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { ArrowDown, Play } from "lucide-react"
import { assets } from "../data/content"
import FadeIn from "./FadeIn"
import VideoModal from "./VideoModal"

export default function Hero({ onWatchStory }) {
  const videoRef = useRef(null)
  const [storyOpen, setStoryOpen] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    video.play().catch(() => {})

    return undefined
  }, [])

  const openStory = () => {
    videoRef.current?.pause()
    setStoryOpen(true)
    onWatchStory?.()
  }

  return (
    <>
      <section className="hero-edge-to-edge relative z-0 flex items-end overflow-hidden bg-setu-teal-deep">
        <div className="hero-media-layer bg-setu-teal-deep">
          {/* Solid teal holds the frame — no fallback still image (avoids flicker). */}
          <video
            ref={videoRef}
            className="hero-media absolute inset-0 z-[2] h-full w-full"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          >
            <source src={assets.heroVideo} type="video/mp4" />
          </video>
        </div>

        <div
          className="absolute inset-0 z-[3] bg-gradient-to-t from-setu-charcoal/55 via-setu-charcoal/15 to-transparent"
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-28 pt-[max(6.5rem,calc(env(safe-area-inset-top,0px)+5rem))] sm:px-6 sm:pb-36 sm:pt-36 lg:px-8 lg:pb-40 lg:pt-44">
          <div className="max-w-3xl">
            <FadeIn>
              <p className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-setu-cream/95 drop-shadow-md">
                Preventive Healthcare
              </p>
            </FadeIn>

            <FadeIn delay={0.1}>
              <h1 className="font-serif text-3xl font-normal leading-[1.12] tracking-tight text-setu-cream drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl xl:text-[4.25rem]">
                Health should not depend on chance, distance, or privilege.
              </h1>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-setu-cream/95 drop-shadow-md sm:text-lg">
                At SETU, we dream of a world where disease is detected early,
                healthcare is accessible to all, and no one suffers because care
                was delayed.
              </p>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <a href="#impact" className="btn-primary btn-primary-white">
                  Learn More
                  <ArrowDown size={16} />
                </a>
                <button
                  type="button"
                  onClick={openStory}
                  className="btn-primary btn-outline-light"
                >
                  <Play size={16} fill="currentColor" />
                  Watch Our Story
                </button>
              </div>
            </FadeIn>
          </div>

          <motion.div
            className="absolute bottom-10 left-1/2 hidden -translate-x-1/2 lg:block"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          >
            <ArrowDown className="text-setu-stone/50" size={22} />
          </motion.div>
        </div>
      </section>

      <VideoModal
        open={storyOpen}
        onClose={() => setStoryOpen(false)}
        src={assets.storyVideo}
        title="SETU — Our Story"
      />
    </>
  )
}
