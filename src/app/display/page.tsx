import type { Metadata } from "next";
import { PublicDisplay } from "@/components/public-display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DisplayPage() {
  return <PublicDisplay />;
}
