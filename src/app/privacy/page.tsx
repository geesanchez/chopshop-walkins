import Link from "next/link";
import type { Metadata } from "next";
import { SHOP } from "@/lib/shop-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
  description: "Privacy policy for The Chop Shop walk-in queue system.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-12 max-w-2xl mx-auto">
      <Link href="/" className="text-gold hover:underline text-sm">
        &larr; Back to home
      </Link>

      <h1 className="text-3xl font-bold mt-6 mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: March 9, 2026
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Who We Are
          </h2>
          <p>
            The Chop Shop is a barbershop located at 501b Main St, Watsonville,
            CA. We operate an online walk-in queue system at
            thechopshopwatsonville.com that allows customers to join our queue
            remotely or in-store.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Information We Collect
          </h2>
          <p>When you use our queue system, we may collect:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong className="text-foreground">Your first name</strong> — to
              identify you in the queue and call you when it&apos;s your turn.
            </li>
            <li>
              <strong className="text-foreground">Your phone number</strong>{" "}
              (remote join only) — to verify your identity via SMS and notify
              you when it&apos;s your turn.
            </li>
            <li>
              <strong className="text-foreground">Service selected</strong> — to
              estimate wait times.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            How We Use Your Information
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To manage your place in the walk-in queue.</li>
            <li>
              To send you a one-time SMS notification when it&apos;s your turn
              (remote customers only).
            </li>
            <li>
              To send a one-time SMS verification code to confirm your phone
              number.
            </li>
          </ul>
          <p className="mt-2">
            We do <strong className="text-foreground">not</strong> use your
            information for marketing, advertising, or promotional messages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Data Retention
          </h2>
          <p>
            Queue entries are automatically removed after your visit is
            completed. We do not retain your phone number after your queue
            session ends. Completed cut records (name, service, date) are kept
            for internal analytics only.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Data Sharing
          </h2>
          <p>
            We do not sell, share, or disclose your personal information to
            third parties. SMS messages are sent through Twilio, our
            communications provider, solely for the purpose of queue
            notifications and phone verification.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            SMS Messaging
          </h2>
          <p>
            By joining the queue remotely, you consent to receive up to two SMS
            messages per visit: one verification code and one notification when
            it&apos;s your turn. Standard message and data rates may apply. No
            recurring messages are sent.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Contact Us
          </h2>
          <p>
            If you have questions about this privacy policy, contact us at the
            shop:
          </p>
          <p className="mt-1">
            {SHOP.name}
            <br />
            {SHOP.address}
            <br />
            {SHOP.phone}
          </p>
        </section>
      </div>
    </div>
  );
}
