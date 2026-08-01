import { Link } from "react-router-dom"
import { assets, footerQuickLinks } from "../data/content"

export default function Footer() {
  return (
    <footer className="page-safe-bottom bg-setu-teal-deep text-setu-cream">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <img src={assets.logo} alt="SETU" className="h-9 w-auto brightness-0 invert" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-setu-stone/60">
              Holistic healthcare solutions combining advanced technology,
              personalized care, and innovative services for individuals and
              communities across India.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium uppercase tracking-[0.15em] text-setu-stone/50">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-2.5">
              {footerQuickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-setu-stone/70 transition-colors duration-200 hover:text-setu-cream"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium uppercase tracking-[0.15em] text-setu-stone/50">
              Services
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-setu-stone/70">
              <li>Preventive Healthcare</li>
              <li>Mother & Child Tracking</li>
              <li>Telemedicine</li>
              <li>Predictive Analytics</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-setu-stone/10 pt-8 sm:flex-row">
          <p className="text-sm text-setu-stone/40">
            &copy; {new Date().getFullYear()} SETU. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-6 text-sm text-setu-stone/40">
            <Link to="/privacy" className="transition-colors hover:text-setu-stone/70">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-setu-stone/70">
              Terms of Service
            </Link>
            <Link to="/refund" className="transition-colors hover:text-setu-stone/70">
              Refund Policy
            </Link>
            <Link to="/contact" className="transition-colors hover:text-setu-stone/70">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
