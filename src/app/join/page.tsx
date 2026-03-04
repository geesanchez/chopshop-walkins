import type { Metadata } from "next";
import { JoinClient } from "./join-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/join" },
  title: "Join the Walk-in Queue — The Chop Shop, Watsonville CA",
  description:
    "Join The Chop Shop walk-in queue from your phone. Skip the wait at our Watsonville barbershop — get in line before you arrive.",
  openGraph: {
    title: "Join the Walk-in Queue — The Chop Shop",
    description:
      "Get in line from anywhere. Walk-in queue for The Chop Shop barbershop in Watsonville, CA.",
    url: "https://queue.thechopshopwatsonville.com/join",
    siteName: "The Chop Shop",
    images: [{ url: "/logo.jpeg", width: 500, height: 500 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Join the Walk-in Queue — The Chop Shop",
    description:
      "Get in line from anywhere. Walk-in queue for The Chop Shop barbershop in Watsonville, CA.",
    images: ["/logo.jpeg"],
  },
};

export default function JoinPage() {
  return <JoinClient />;
}
