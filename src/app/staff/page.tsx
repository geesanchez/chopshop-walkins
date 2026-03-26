import type { Metadata } from "next";
import { StaffClient } from "./staff-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff Dashboard",
  robots: { index: false, follow: false },
};

export default function StaffPage() {
  return <StaffClient />;
}
