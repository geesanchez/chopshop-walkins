"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

interface PinGateProps {
  onAuthenticated: () => void;
}

export function PinGate({ onAuthenticated }: PinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (data.success) {
        onAuthenticated();
      } else {
        setError("Invalid PIN");
        setPin("");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handlePadPress(digit: string) {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1));
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-card border-border">
        <CardHeader className="text-center">
          <Link href="/">
            <Image
              src="/logo.jpeg"
              alt="The Chop Shop"
              width={80}
              height={80}
              className="rounded-full mx-auto mb-4"
              priority
              sizes="80px"
            />
          </Link>
          <CardTitle className="text-gold text-xl">Staff Access</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="staff-pin" className="sr-only">Staff PIN</label>
            <Input
              id="staff-pin"
              type="password"
              value={pin}
              readOnly
              placeholder="Enter PIN"
              className="text-center text-2xl tracking-[0.5em] bg-secondary border-border"
            />

            {error && (
              <p role="alert" aria-live="polite" className="text-destructive text-sm text-center">{error}</p>
            )}

            {/* Number pad for tablet use */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <Button
                  key={digit}
                  type="button"
                  variant="secondary"
                  className="h-14 text-xl font-bold"
                  onClick={() => handlePadPress(digit)}
                >
                  {digit}
                </Button>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="h-14 text-lg"
                onClick={handleBackspace}
              >
                Del
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-14 text-xl font-bold"
                onClick={() => handlePadPress("0")}
              >
                0
              </Button>
              <Button
                type="submit"
                className="h-14 text-lg bg-gold text-black hover:bg-gold-dark font-bold"
                disabled={loading || pin.length === 0}
              >
                {loading ? "..." : "Go"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
