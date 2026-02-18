"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Countdown hook. estimateMinutes is a live "from now" value that
 * recalculates each render (via estimateWait which uses called_at).
 * The ref tracks when each new estimate was set so we can tick down
 * seconds between minute-level estimate changes.
 */
export function useCountdown(estimateMinutes: number) {
  const ref = useRef({ minutes: estimateMinutes, setAt: Date.now() });

  // When estimate changes (roughly once per minute), reset the reference
  if (estimateMinutes !== ref.current.minutes) {
    ref.current = { minutes: estimateMinutes, setAt: Date.now() };
  }

  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    () => Math.max(0, estimateMinutes * 60)
  );

  useEffect(() => {
    const { minutes, setAt } = ref.current;

    function tick() {
      const elapsedSeconds = (Date.now() - setAt) / 1000;
      const remaining = Math.max(0, Math.round(minutes * 60 - elapsedSeconds));
      setRemainingSeconds(remaining);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [estimateMinutes]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isUnderOneMinute = remainingSeconds > 0 && remainingSeconds < 60;
  const isExpired = remainingSeconds === 0;

  let display: string;
  if (isExpired) {
    display = "0:00";
  } else if (isUnderOneMinute) {
    display = `0:${seconds.toString().padStart(2, "0")}`;
  } else {
    display = `~${minutes} min`;
  }

  return {
    remainingSeconds,
    minutes,
    seconds,
    isUnderOneMinute,
    isExpired,
    display,
  };
}
