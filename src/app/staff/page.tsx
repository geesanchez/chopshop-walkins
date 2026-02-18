"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { PinGate } from "@/components/pin-gate";
import { StaffDashboard } from "@/components/staff-dashboard";

export default function StaffPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verify the HTTP-only cookie is valid on the server
    fetch("/api/verify-pin")
      .then((res) => {
        if (res.ok) {
          setAuthenticated(true);
        } else {
          sessionStorage.removeItem("staff-authenticated");
          setAuthenticated(false);
        }
      })
      .catch(() => {
        setAuthenticated(false);
      })
      .finally(() => {
        setChecking(false);
      });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <PinGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  return <StaffDashboard />;
}
