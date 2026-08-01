import LegalPageShell from "./LegalPageShell"
import { contactInfo } from "../../data/content"

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p>
        SETU (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates setuai.com and related healthcare
        services. This Privacy Policy explains how we collect, use, and protect your information.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">Information we collect</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Name, phone number, email, and profile details you provide during registration.</li>
        <li>Health-related information you choose to share for telemedicine, diagnostics, or wellness services.</li>
        <li>Payment transaction references processed through Razorpay (we do not store full card or UPI credentials).</li>
        <li>Device, browser, and usage data for security and service improvement.</li>
      </ul>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">How we use information</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>To provide healthcare, VLE, and partner services you request.</li>
        <li>To verify identity, send OTPs, and process payments.</li>
        <li>To comply with applicable law and respond to lawful requests.</li>
      </ul>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">Sharing</h2>
      <p>
        We share data only with service providers (payment, SMS, hosting, labs, doctors) as needed
        to deliver services, or when required by law. We do not sell personal data.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">Security & retention</h2>
      <p>
        We use industry-standard safeguards. Data is retained only as long as needed for services,
        legal, or operational requirements.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">Contact</h2>
      <p>
        Email: {contactInfo.email}
        <br />
        Phone: {contactInfo.phone}
        <br />
        Address: {contactInfo.address}
      </p>
      <p className="text-xs text-setu-muted/80">Last updated: July 2026</p>
    </LegalPageShell>
  )
}
