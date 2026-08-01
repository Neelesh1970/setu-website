import LegalPageShell from "./LegalPageShell"
import { contactInfo } from "../../data/content"

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      <p>
        By using setuai.com and SETU services, you agree to these Terms of Service. If you do not
        agree, please do not use the platform.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">Services</h2>
      <p>
        SETU provides digital healthcare access including telemedicine, diagnostics booking,
        wellness tools, VLE partner registration, and related services. Medical advice is provided
        by licensed professionals where applicable; SETU is a technology platform.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">Accounts & payments</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>You must provide accurate registration information.</li>
        <li>Fees for services (e.g. VLE user registration ₹200) are displayed before payment.</li>
        <li>Payments are processed by Razorpay. By paying, you also accept Razorpay&apos;s terms.</li>
      </ul>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">Acceptable use</h2>
      <p>
        You may not misuse the platform, attempt unauthorized access, or use services for unlawful
        purposes. We may suspend accounts that violate these terms.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">Limitation of liability</h2>
      <p>
        Services are provided on an &quot;as available&quot; basis. To the extent permitted by law, SETU
        is not liable for indirect damages arising from use of the platform.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">Contact</h2>
      <p>
        Questions: {contactInfo.email} · {contactInfo.phone}
      </p>
      <p className="text-xs text-setu-muted/80">Last updated: July 2026</p>
    </LegalPageShell>
  )
}
