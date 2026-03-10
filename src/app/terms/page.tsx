import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — The Chop Shop",
  description: "Terms and conditions for The Chop Shop walk-in queue system.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-12 max-w-2xl mx-auto">
      <Link href="/" className="text-gold hover:underline text-sm">
        &larr; Back to home
      </Link>

      <h1 className="text-3xl font-bold mt-6 mb-2">Terms &amp; Conditions</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: March 9, 2026
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Program Name
          </h2>
          <p>The Chop Shop Walk-in Queue Notifications</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Description
          </h2>
          <p>
            The Chop Shop provides an online walk-in queue system. When you join
            the queue remotely through our website, you may receive SMS messages
            related to your queue status.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Message Frequency
          </h2>
          <p>
            You will receive up to two (2) SMS messages per queue visit:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>One verification code to confirm your phone number.</li>
            <li>
              One notification when it&apos;s your turn (e.g., &quot;Hey John!
              You&apos;re up next at The Chop Shop. Head to the chair!&quot;).
            </li>
          </ul>
          <p className="mt-2">
            No recurring or marketing messages are sent.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Message &amp; Data Rates
          </h2>
          <p>
            Standard message and data rates may apply depending on your mobile
            carrier and plan.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Opt-In
          </h2>
          <p>
            By entering your phone number on our website and completing SMS
            verification, you consent to receive queue-related text messages
            from The Chop Shop. Consent is not required as a condition of
            purchasing any goods or services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Opt-Out
          </h2>
          <p>
            You can opt out at any time by replying <strong className="text-foreground">STOP</strong> to
            any message. After opting out, you will not receive further messages.
            You may also choose not to join the queue remotely and instead visit
            the shop in person.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Help
          </h2>
          <p>
            For help, reply <strong className="text-foreground">HELP</strong> to
            any message, or contact us directly:
          </p>
          <p className="mt-1">
            The Chop Shop
            <br />
            501b Main St, Watsonville, CA
            <br />
            (831) 319-1824
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Privacy
          </h2>
          <p>
            Your phone number is used solely for queue verification and
            notifications. We do not share your information with third parties
            for marketing purposes. See our{" "}
            <Link href="/privacy" className="text-gold hover:underline">
              Privacy Policy
            </Link>{" "}
            for full details.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Use of Service
          </h2>
          <p>
            The queue system is provided as a convenience for walk-in customers.
            Joining the queue does not guarantee service at a specific time.
            Wait times are estimates and may vary. The Chop Shop reserves the
            right to remove entries from the queue at its discretion.
          </p>
        </section>
      </div>
    </div>
  );
}
