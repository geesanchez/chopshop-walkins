import type { Metadata } from "next";
import { KioskClient } from "./kiosk-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function KioskPage() {
  return <KioskClient />;
}
