"use client";

import { useState } from "react";
import { useQueue } from "@/hooks/use-queue";
import { useCountdown } from "@/hooks/use-countdown";
import { joinQueue } from "@/lib/queue-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { QueueEntry, Service } from "@/lib/supabase/types";
import Image from "next/image";
import Link from "next/link";
import { SHOP } from "@/lib/shop-config";
import { Turnstile } from "@/components/turnstile";

type Step = "name" | "phone" | "verify" | "service" | "confirmation";

export function RemoteJoin() {
  const {
    queue,
    services,
    shopSettings,
    activeCount,
    isFull,
    loading,
    placeInLine,
    isBeingServed,
    estimateWait,
  } = useQueue();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QueueEntry | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  // Compute countdown values before early returns (hook rules)
  const place = result ? placeInLine(result.id) : 0;
  const waitMinutes = result ? estimateWait(result.id) : 0;
  const serving = result ? isBeingServed(result.id) : false;
  const stillWaiting = place > 0;
  const liveEntry = result ? queue.find((e) => e.id === result.id) : null;
  const isOnMyWay = liveEntry?.arrival_status === "on_my_way";
  const countdown = useCountdown(waitMinutes);

  if (loading || !shopSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Shop is closed
  if (!shopSettings.is_open) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <Link href="/">
          <Image
            src="/logo.jpeg"
            alt="The Chop Shop"
            width={100}
            height={100}
            className="rounded-full"
            sizes="100px"
          />
        </Link>
        <h1 className="text-2xl font-bold text-gold">The Chop Shop</h1>
        <p className="text-lg text-muted-foreground">
          We&apos;re currently closed
        </p>
        <div className="text-sm text-muted-foreground space-y-1 mt-2">
          <p className="font-semibold text-foreground">Hours</p>
          <p>{SHOP.hours.weekday}</p>
          <p>{SHOP.hours.saturday}</p>
          <p>{SHOP.hours.closed}</p>
        </div>
      </div>
    );
  }

  // Queue is full
  if (isFull && step !== "confirmation") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <Link href="/">
          <Image
            src="/logo.jpeg"
            alt="The Chop Shop"
            width={100}
            height={100}
            className="rounded-full"
            sizes="100px"
          />
        </Link>
        <h1 className="text-2xl font-bold text-gold">The Chop Shop</h1>
        <p className="text-lg text-muted-foreground">
          Queue is full right now
        </p>
        <p className="text-sm text-muted-foreground">
          {activeCount} / {shopSettings.queue_cap} spots taken. Check back
          shortly!
        </p>
      </div>
    );
  }

  // Confirmation — live updating via Realtime
  if (step === "confirmation" && result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 text-center">
        <Link href="/">
          <Image
            src="/logo.jpeg"
            alt="The Chop Shop"
            width={80}
            height={80}
            className="rounded-full"
            sizes="80px"
          />
        </Link>

        {stillWaiting ? (
          <>
            <h1 className="text-2xl font-bold text-gold">
              You&apos;re in line!
            </h1>
            <p className="text-lg">{result.customer_name}</p>

            <Card className="bg-card border-gold/30 w-full max-w-xs">
              <CardContent className="p-5 text-center space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Your position</p>
                  <p className="text-5xl font-bold text-gold">{place}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated wait</p>
                  <p className={`text-2xl font-semibold ${countdown.isExpired ? "text-gold" : countdown.isUnderOneMinute ? "text-gold animate-pulse" : ""}`}>
                    {countdown.isExpired ? "Almost there!" : countdown.display}
                  </p>
                </div>
              </CardContent>
            </Card>

            {isOnMyWay ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 w-full max-w-xs">
                <p className="text-yellow-500 font-medium text-sm">
                  You&apos;re marked as &quot;On My Way&quot;
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Let the staff know when you arrive
                </p>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 w-full max-w-xs">
                <p className="text-green-500 font-medium text-sm">
                  You&apos;re checked in
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Hang tight — we&apos;ll call your name
                </p>
              </div>
            )}

            <div className="w-full max-w-xs space-y-3 mt-2">
              <a
                href={SHOP.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full h-12 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
              >
                Get Directions
              </a>
              <a
                href={SHOP.phoneTel}
                className="flex items-center justify-center w-full h-12 rounded-lg border border-border text-muted-foreground font-medium hover:bg-secondary/50 transition-colors"
              >
                Call Shop — {SHOP.phone}
              </a>
            </div>
          </>
        ) : serving ? (
          <>
            <h1 className="text-3xl font-bold text-gold">You&apos;re up next!</h1>
            <p className="text-lg">{result.customer_name}</p>
            <Card className="bg-gold/10 border-gold/40 w-full max-w-xs">
              <CardContent className="p-5 text-center">
                <p className="text-lg text-gold font-semibold">
                  Head to the shop — your barber is ready
                </p>
              </CardContent>
            </Card>
            <div className="w-full max-w-xs space-y-3 mt-2">
              <a
                href={SHOP.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full h-12 rounded-lg bg-gold text-black font-bold hover:bg-gold-dark transition-colors"
              >
                Get Directions
              </a>
              <a
                href={SHOP.phoneTel}
                className="flex items-center justify-center w-full h-12 rounded-lg border border-border text-muted-foreground font-medium hover:bg-secondary/50 transition-colors"
              >
                Call Shop — {SHOP.phone}
              </a>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground">
              You&apos;ve been removed
            </h1>
            <p className="text-muted-foreground">
              You&apos;re no longer in the queue. If this was a mistake, join
              again or give us a call.
            </p>
            <div className="w-full max-w-xs space-y-3 mt-2">
              <Button
                className="w-full h-12 bg-gold hover:bg-gold-dark text-black font-bold"
                onClick={() => {
                  setStep("name");
                  setName("");
                  setPhone("");
                  setVerifiedPhone("");
                  setCode("");
                  setSelectedService(null);
                  setResult(null);
                  setError("");
                }}
              >
                Join Again
              </Button>
              <a
                href={SHOP.phoneTel}
                className="flex items-center justify-center w-full h-12 rounded-lg border border-border text-muted-foreground font-medium hover:bg-secondary/50 transition-colors"
              >
                Call Shop — {SHOP.phone}
              </a>
            </div>
          </>
        )}
      </div>
    );
  }

  async function handleSendCode() {
    setSendingCode(true);
    setError("");

    try {
      const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, turnstileToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send code");
        return;
      }

      setVerifiedPhone(data.phone);
      setStep("verify");
    } catch {
      setError("Something went wrong");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode() {
    setVerifyingCode(true);
    setError("");

    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: verifiedPhone, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        return;
      }

      setStep("service");
    } catch {
      setError("Something went wrong");
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleSubmit() {
    if (!selectedService) return;
    setSubmitting(true);
    setError("");

    try {
      const entry = await joinQueue(
        name.trim(),
        selectedService.id,
        "remote",
        "on_my_way",
        verifiedPhone
      );
      setResult(entry);
      setStep("confirmation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-6">
      <Link href="/">
        <Image
          src="/logo.jpeg"
          alt="The Chop Shop"
          width={80}
          height={80}
          className="rounded-full"
          sizes="80px"
        />
      </Link>
      <h1 className="text-2xl font-bold text-gold">Join the Queue</h1>
      <p className="text-sm text-muted-foreground">
        Save your spot before you arrive
      </p>
      <p className="text-xs text-muted-foreground">
        {activeCount} / {shopSettings.queue_cap} in queue
      </p>

      {/* Step 1: Name */}
      {step === "name" && (
        <div className="w-full max-w-sm space-y-4">
          <label htmlFor="remote-name" className="text-sm font-medium text-muted-foreground">
            What&apos;s your name?
          </label>
          <Input
            id="remote-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="h-14 text-lg bg-secondary border-border text-center"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) setStep("phone");
            }}
          />
          <Button
            className="w-full h-14 text-lg bg-gold hover:bg-gold-dark text-black font-bold"
            disabled={!name.trim()}
            onClick={() => setStep("phone")}
          >
            Next
          </Button>
        </div>
      )}

      {/* Step 2: Phone Number */}
      {step === "phone" && (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-center text-lg">
            Hey <span className="text-gold font-semibold">{name.trim()}</span>,
            enter your phone number
          </p>
          <p className="text-xs text-muted-foreground text-center">
            We&apos;ll send a code to verify it&apos;s you
          </p>
          <label htmlFor="remote-phone" className="sr-only">Phone number</label>
          <Input
            id="remote-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(831) 555-1234"
            className="h-14 text-lg bg-secondary border-border text-center"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && phone.replace(/\D/g, "").length >= 10)
                handleSendCode();
            }}
          />

          <Turnstile
            onVerify={setTurnstileToken}
            onExpire={() => setTurnstileToken("")}
          />

          {error && (
            <p role="alert" aria-live="polite" className="text-destructive text-sm text-center">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-14 text-lg border-border"
              onClick={() => {
                setStep("name");
                setError("");
                setTurnstileToken("");
              }}
            >
              Back
            </Button>
            <Button
              className="flex-1 h-14 text-lg bg-gold hover:bg-gold-dark text-black font-bold"
              disabled={phone.replace(/\D/g, "").length < 10 || sendingCode || !turnstileToken}
              onClick={handleSendCode}
            >
              {sendingCode ? "Sending..." : "Send Code"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Verify Code */}
      {step === "verify" && (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-center text-lg">
            Enter the code sent to
          </p>
          <p className="text-center text-gold font-semibold">
            {verifiedPhone}
          </p>
          <label htmlFor="remote-code" className="sr-only">Verification code</label>
          <Input
            id="remote-code"
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit code"
            maxLength={6}
            className="h-14 text-2xl bg-secondary border-border text-center tracking-[0.5em]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.length >= 4) handleVerifyCode();
            }}
          />

          {error && (
            <p role="alert" aria-live="polite" className="text-destructive text-sm text-center">{error}</p>
          )}

          <Button
            className="w-full h-14 text-lg bg-gold hover:bg-gold-dark text-black font-bold"
            disabled={code.length < 4 || verifyingCode}
            onClick={handleVerifyCode}
          >
            {verifyingCode ? "Verifying..." : "Verify"}
          </Button>

          <button
            type="button"
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            onClick={() => {
              setCode("");
              setError("");
              setStep("phone");
            }}
          >
            Didn&apos;t get a code? Try again
          </button>
        </div>
      )}

      {/* Step 4: Service */}
      {step === "service" && (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-center text-lg">
            Hey <span className="text-gold font-semibold">{name.trim()}</span>,
            what do you need?
          </p>
          <div className="grid gap-3">
            {services.map((service) => (
              <Button
                key={service.id}
                variant={
                  selectedService?.id === service.id ? "default" : "secondary"
                }
                className={`h-16 text-lg justify-between px-6 ${
                  selectedService?.id === service.id
                    ? "bg-gold text-black hover:bg-gold-dark"
                    : ""
                }`}
                onClick={() => setSelectedService(service)}
              >
                <span>{service.name}</span>
                <span className="text-sm opacity-70">
                  {service.price != null ? `$${service.price} · ` : ""}~{service.duration_minutes} min
                </span>
              </Button>
            ))}
          </div>

          {error && (
            <p role="alert" aria-live="polite" className="text-destructive text-sm text-center">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-14 text-lg border-border"
              onClick={() => {
                setStep("phone");
                setSelectedService(null);
              }}
            >
              Back
            </Button>
            <Button
              className="flex-1 h-14 text-lg bg-gold hover:bg-gold-dark text-black font-bold"
              disabled={!selectedService || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Joining..." : "Join Queue"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
