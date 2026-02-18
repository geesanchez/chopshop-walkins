"use client";

import { useQueue } from "@/hooks/use-queue";
import { useCountdown } from "@/hooks/use-countdown";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SHOP } from "@/lib/shop-config";

function CurrentTime() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      );
    }
    tick();
    const interval = setInterval(tick, 1_000);
    return () => clearInterval(interval);
  }, []);

  return <span>{time}</span>;
}

function WaitCountdown({ estimateMinutes, position }: { estimateMinutes: number; position: number }) {
  const countdown = useCountdown(estimateMinutes);

  if (countdown.isExpired) {
    return <span className="text-gold">{position === 1 ? "Next" : "Almost there"}</span>;
  }

  return (
    <span className={countdown.isUnderOneMinute ? "text-gold animate-pulse" : ""}>
      {countdown.display}
    </span>
  );
}

export function PublicDisplay() {
  const { queue, shopSettings, loading, activeCount, estimateWait } =
    useQueue();

  if (loading || !shopSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-muted-foreground text-2xl">Loading...</p>
      </div>
    );
  }

  const waitingEntries = queue.filter((e) => e.status === "waiting");
  const inProgressEntries = queue.filter((e) => e.status === "in_progress");

  // Shop closed state
  if (!shopSettings.is_open) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-black p-12">
        <Link href="/">
          <Image
            src="/logo.jpeg"
            alt="The Chop Shop"
            width={180}
            height={180}
            className="rounded-full"
          />
        </Link>
        <h1 className="text-6xl font-bold text-gold">The Chop Shop</h1>
        <p className="text-3xl text-muted-foreground">We&apos;re currently closed</p>
        <div className="text-xl text-muted-foreground space-y-2 mt-4 text-center">
          <p className="text-2xl font-semibold text-foreground mb-4">Hours</p>
          <p>Tue – Fri: 10 AM – 6 PM</p>
          <p>Saturday: 10 AM – 3 PM</p>
          <p>Sun – Mon: Closed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <Link href="/">
            <Image
              src="/logo.jpeg"
              alt="The Chop Shop"
              width={80}
              height={80}
              className="rounded-full"
            />
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-gold">The Chop Shop</h1>
            <p className="text-xl text-muted-foreground mt-1">Walk-in Queue</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-foreground">
            <CurrentTime />
          </p>
          <p className="text-lg text-muted-foreground mt-1">
            {activeCount} / {shopSettings.queue_cap} in queue
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Now Serving */}
        {inProgressEntries.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gold uppercase tracking-widest mb-4">
              Now Serving
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border-2 border-gold bg-gold/10 p-6 flex items-center gap-5"
                >
                  <div className="h-14 w-14 rounded-full bg-gold flex items-center justify-center">
                    <span className="text-2xl font-bold text-black">
                      {entry.customer_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{entry.customer_name}</p>
                    <p className="text-lg text-gold mt-1">
                      {entry.services?.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Up Next */}
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Up Next
          </h2>

          {waitingEntries.length === 0 ? (
            <div className="flex-1 flex items-center justify-center rounded-xl border border-border p-12">
              <p className="text-3xl text-muted-foreground">
                No one in line — walk right in!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`rounded-xl border p-5 flex items-center justify-between ${
                      index === 0
                        ? "border-gold/50 bg-card"
                        : "border-border bg-card/50"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <span
                        className={`text-5xl font-bold w-16 text-center ${
                          index === 0 ? "text-gold" : "text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-3xl font-semibold">
                          {entry.customer_name}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-lg text-muted-foreground">
                            {entry.services?.name}
                          </span>
                          {entry.source === "remote" &&
                            entry.arrival_status === "on_my_way" && (
                              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-sm">
                                On My Way
                              </Badge>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        <WaitCountdown
                          estimateMinutes={estimateWait(entry.id)}
                          position={index + 1}
                        />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        est. wait
                      </p>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-border flex items-center justify-between text-muted-foreground">
        <p className="text-lg">
          {SHOP.hours.short}
        </p>
        <p className="text-lg">
          {SHOP.address}
        </p>
      </div>
    </div>
  );
}
