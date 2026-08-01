import LegalPageShell from "./LegalPageShell"
import { contactInfo } from "../../data/content"

export default function RefundPolicyPage() {
  return (
    <LegalPageShell title="Cancellation & Refund Policy">
      <p>
        This policy applies to paid services on setuai.com processed through Razorpay, including VLE
        user registration fees, wallet deposits, lab tests, telemedicine, and other SETU offerings.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">VLE user registration (₹200)</h2>
      <p>
        Registration fees are charged after OTP verification and before account creation. Refunds
        are considered if payment succeeded but registration could not be completed due to a SETU
        system error. Contact support within 7 days with order ID and phone number.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">Lab tests & appointments</h2>
      <p>
        Cancellations and refunds follow the partner lab or provider policy shown at booking.
        Partial refunds may apply for sample collection fees or no-shows as stated during checkout.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">Wallet deposits</h2>
      <p>
        VLE wallet top-ups are generally non-refundable once credited. Incorrect duplicate deposits
        may be reversed after verification.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-setu-charcoal">How to request a refund</h2>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Email {contactInfo.email} with Razorpay payment ID, date, amount, and reason.</li>
        <li>We respond within 5–7 business days.</li>
        <li>Approved refunds are processed to the original payment method within 7–10 business days.</li>
      </ol>
      <p className="text-xs text-setu-muted/80">Last updated: July 2026</p>
    </LegalPageShell>
  )
}
