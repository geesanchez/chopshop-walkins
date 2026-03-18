"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export function Turnstile({ onVerify, onExpire }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);

  // Keep refs in sync without triggering re-renders
  onVerifyRef.current = onVerify;
  onExpireRef.current = onExpire;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    function renderWidget() {
      if (!window.turnstile || !container) return;

      // Don't re-render if already rendered
      if (widgetIdRef.current) return;

      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: siteKey!,
        callback: (token: string) => onVerifyRef.current(token),
        "expired-callback": () => onExpireRef.current?.(),
        "error-callback": () => onExpireRef.current?.(),
        theme: "dark",
        size: "normal",
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval!);
          interval = null;
          renderWidget();
        }
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []); // Run once on mount only

  return <div ref={containerRef} className="flex justify-center" />;
}
