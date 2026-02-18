"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type {
  QueueEntryWithService,
  Service,
  Barber,
  ShopSettings,
} from "@/lib/supabase/types";

export function useQueue() {
  const [queue, setQueue] = useState<QueueEntryWithService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    const { data, error } = await supabase
      .from("queue_entries")
      .select("*, services(*)")
      .in("status", ["waiting", "in_progress"])
      .order("position", { ascending: true });

    if (error) console.error("fetchQueue error:", error);
    if (data) setQueue(data as unknown as QueueEntryWithService[]);
  }, []);

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) console.error("fetchServices error:", error);
    if (data) setServices(data);
  }, []);

  const fetchBarbers = useCallback(async () => {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) console.error("fetchBarbers error:", error);
    if (data) setBarbers(data);
  }, []);

  const fetchShopSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("shop_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("fetchShopSettings error:", error);
      setError(`Shop settings: ${error.message}`);
    }
    if (data) setShopSettings(data);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([
        fetchQueue(),
        fetchServices(),
        fetchBarbers(),
        fetchShopSettings(),
      ]);
      setLoading(false);
    }
    init();

    // Subscribe to queue changes
    const queueChannel = supabase
      .channel("queue-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => {
          fetchQueue();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shop_settings" },
        () => {
          fetchShopSettings();
        }
      )
      .subscribe();

    // Polling fallback — keeps data fresh if Realtime disconnects
    const pollInterval = setInterval(() => {
      fetchQueue();
      fetchShopSettings();
    }, 10_000);

    // Cleanup expired "on my way" entries every 30 seconds
    const cleanupInterval = setInterval(() => {
      fetch("/api/cleanup").catch(() => {});
    }, 30_000);

    return () => {
      supabase.removeChannel(queueChannel);
      clearInterval(pollInterval);
      clearInterval(cleanupInterval);
    };
  }, [fetchQueue, fetchServices, fetchBarbers, fetchShopSettings]);

  const activeCount = queue.filter(
    (e) => e.status === "waiting" || e.status === "in_progress"
  ).length;

  const isFull = shopSettings ? activeCount >= shopSettings.queue_cap : false;

  // Compute live place in line (1-based). Returns 0 if not found in waiting list.
  const placeInLine = (entryId: string): number => {
    const waitingEntries = queue.filter((e) => e.status === "waiting");
    const index = waitingEntries.findIndex((e) => e.id === entryId);
    return index === -1 ? 0 : index + 1;
  };

  // Check if an entry is currently being served (in_progress)
  const isBeingServed = (entryId: string): boolean => {
    return queue.some((e) => e.id === entryId && e.status === "in_progress");
  };

  const estimateWait = (entryId: string): number => {
    const activeBarbers = Math.max(shopSettings?.active_barbers ?? 1, 1);
    const waitingEntries = queue.filter((e) => e.status === "waiting");
    const inProgressEntries = queue.filter((e) => e.status === "in_progress");
    const index = waitingEntries.findIndex((e) => e.id === entryId);
    if (index === -1) return 0;

    // Sum durations of people AHEAD only (not including self)
    let totalMinutes = 0;
    for (let i = 0; i < index; i++) {
      totalMinutes += waitingEntries[i].services?.duration_minutes ?? 30;
    }

    // Add actual remaining time for people currently in the chair
    for (const entry of inProgressEntries) {
      const duration = entry.services?.duration_minutes ?? 30;
      if (entry.called_at) {
        const elapsedMin = (Date.now() - new Date(entry.called_at).getTime()) / 60000;
        totalMinutes += Math.max(0, Math.ceil(duration - elapsedMin));
      } else {
        totalMinutes += duration;
      }
    }

    return Math.ceil(totalMinutes / activeBarbers);
  };

  return {
    queue,
    services,
    barbers,
    shopSettings,
    loading,
    error,
    activeCount,
    isFull,
    placeInLine,
    isBeingServed,
    estimateWait,
    refetch: fetchQueue,
  };
}
