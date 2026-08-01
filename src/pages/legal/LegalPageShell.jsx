import { Link } from "react-router-dom"
import Navbar from "../../components/Navbar"
import Footer from "../../components/Footer"

export default function LegalPageShell({ title, children }) {
  return (
    <div className="page-safe-bottom min-h-svh bg-[#F7FAFF]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10 app-safe-x sm:py-14">
        <Link
          to="/"
          className="text-sm font-medium text-[#1C39BB] hover:underline"
        >
          ← Back to home
        </Link>
        <h1 className="mt-6 font-serif text-3xl text-setu-charcoal sm:text-4xl">
          {title}
        </h1>
        <div className="prose-policy mt-8 space-y-4 text-sm leading-relaxed text-setu-muted sm:text-base">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
