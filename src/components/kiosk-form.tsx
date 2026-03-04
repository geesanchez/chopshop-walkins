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

type Step = "name" | "service" | "confirmation";

export function KioskForm() {
  const {
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
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QueueEntry | null>(null);

  // Compute countdown values before early returns (hook rules)
  const place = result ? placeInLine(result.id) : 0;
  const waitMinutes = result ? estimateWait(result.id) : 0;
  const serving = result ? isBeingServed(result.id) : false;
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Link href="/">
          <Image
            src="/logo.jpeg"
            alt="The Chop Shop"
            width={120}
            height={120}
            className="rounded-full"
          />
        </Link>
        <h1 className="text-3xl font-bold text-gold">The Chop Shop</h1>
        <p className="text-xl text-muted-foreground">
          We&apos;re currently closed
        </p>
        <div className="text-sm text-muted-foreground space-y-1 mt-4">
          <p className="font-semibold text-foreground">Hours</p>
          <p>Tue–Fri: 10 AM – 6 PM</p>
          <p>Saturday: 10 AM – 3 PM</p>
          <p>Sun–Mon: Closed</p>
        </div>
      </div>
    );
  }

  // Queue is full
  if (isFull && step !== "confirmation") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Link href="/">
          <Image
            src="/logo.jpeg"
            alt="The Chop Shop"
            width={120}
            height={120}
            className="rounded-full"
          />
        </Link>
        <h1 className="text-3xl font-bold text-gold">The Chop Shop</h1>
        <p className="text-xl text-muted-foreground">
          Queue is full right now
        </p>
        <p className="text-muted-foreground">
          {activeCount} / {shopSettings.queue_cap} spots taken. Check back
          shortly!
        </p>
      </div>
    );
  }

  // Confirmation screen after joining
  if (step === "confirmation" && result) {
    // Barber pressed Call — show "You're up next!" screen
    if (serving) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
          <Link href="/">
            <Image
              src="/logo.jpeg"
              alt="The Chop Shop"
              width={100}
              height={100}
              className="rounded-full"
            />
          </Link>
          <h1 className="text-4xl font-bold text-gold">You&apos;re up next!</h1>
          <div className="space-y-2">
            <p className="text-xl">{result.customer_name}</p>
            <p className="text-muted-foreground">{selectedService?.name}</p>
          </div>
          <Card className="bg-gold/10 border-gold/40 w-full max-w-xs">
            <CardContent className="p-6 text-center">
              <p className="text-lg text-gold font-semibold">
                Head to the front — your barber is ready
              </p>
            </CardContent>
          </Card>
          <Button
            variant="outline"
            className="mt-4 border-border"
            onClick={() => {
              setStep("name");
              setName("");
              setSelectedService(null);
              setResult(null);
              setError("");
            }}
          >
            Add another walk-in
          </Button>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <Link href="/">
          <Image
            src="/logo.jpeg"
            alt="The Chop Shop"
            width={100}
            height={100}
            className="rounded-full"
          />
        </Link>
        <h1 className="text-3xl font-bold text-gold">You&apos;re in!</h1>
        <div className="space-y-2">
          <p className="text-xl">{result.customer_name}</p>
          <p className="text-muted-foreground">{selectedService?.name}</p>
        </div>

        <Card className="bg-card border-gold/30 w-full max-w-xs">
          <CardContent className="p-6 text-center space-y-3">
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

        <Button
          variant="outline"
          className="mt-4 border-border"
          onClick={() => {
            setStep("name");
            setName("");
            setSelectedService(null);
            setResult(null);
            setError("");
          }}
        >
          Add another walk-in
        </Button>
      </div>
    );
  }

  async function handleSubmit() {
    if (!selectedService) return;
    setSubmitting(true);
    setError("");

    try {
      const entry = await joinQueue(
        name.trim(),
        selectedService.id,
        "kiosk",
        "here"
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <Link href="/">
        <Image
          src="/logo.jpeg"
          alt="The Chop Shop"
          width={100}
          height={100}
          className="rounded-full"
        />
      </Link>
      <h1 className="text-2xl font-bold text-gold">Walk-in Sign Up</h1>
      <p className="text-sm text-muted-foreground">
        {activeCount} / {shopSettings.queue_cap} in queue
      </p>

      {/* Step 1: Name */}
      {step === "name" && (
        <div className="w-full max-w-md space-y-4">
          <label htmlFor="kiosk-name" className="text-sm font-medium text-muted-foreground">
            What&apos;s your name?
          </label>
          <Input
            id="kiosk-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="h-14 text-lg bg-secondary border-border text-center"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) setStep("service");
            }}
          />
          <Button
            className="w-full h-14 text-lg bg-gold hover:bg-gold-dark text-black font-bold"
            disabled={!name.trim()}
            onClick={() => setStep("service")}
          >
            Next
          </Button>
        </div>
      )}

      {/* Step 2: Service */}
      {step === "service" && (
        <div className="w-full max-w-md space-y-4">
          <p className="text-center text-lg">
            Hey <span className="text-gold font-semibold">{name.trim()}</span>,
            what are you here for?
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
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-14 text-lg border-border"
              onClick={() => {
                setStep("name");
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
