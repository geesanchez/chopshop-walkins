import type { Metadata } from "next";
import { DisplayClient } from "./display-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DisplayPage() {
  return <DisplayClient />;
}
