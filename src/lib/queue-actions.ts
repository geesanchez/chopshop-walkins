import { supabase } from "@/lib/supabase/client";
import type { ArrivalStatus } from "@/lib/supabase/types";

// ── Public actions (anon key, no PIN needed) ──────────────────────

export async function joinQueue(
  customerName: string,
  serviceId: string,
  source: "kiosk" | "remote" = "kiosk",
  arrivalStatus: ArrivalStatus = "here",
  phone?: string
) {
  // Sanitize name: trim, cap length, strip tags
  const safeName = customerName.trim().slice(0, 50).replace(/<[^>]*>/g, "");
  if (!safeName) throw new Error("Name is required");

  const { data, error } = await supabase.rpc("join_queue", {
    p_customer_name: safeName,
    p_service_id: serviceId,
    p_source: source,
    p_arrival_status: arrivalStatus,
    p_phone: phone ?? null,
  });

  if (error) throw new Error(error.message);
  return data;
}

// ── Staff actions (session cookie verified server-side) ───────────

async function staffAction(action: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Action failed");
  return data;
}

export async function callNext(entryId: string) {
  await staffAction("call", { entryId });
}

export async function completeCut(
  entryId: string,
  barberId: string,
  customerName: string,
  serviceId: string,
  source: string,
  calledAt: string | null
) {
  await staffAction("complete", {
    entryId,
    barberId,
    customerName,
    serviceId,
    source,
    calledAt,
  });
}

export async function skipEntry(entryId: string) {
  await staffAction("skip", { entryId });
}

export async function removeEntry(entryId: string) {
  await staffAction("remove", { entryId });
}

export async function markArrived(entryId: string) {
  await staffAction("mark-arrived", { entryId });
}

export async function toggleShopOpen(settingsId: string, isOpen: boolean) {
  await staffAction("toggle-shop", { settingsId, isOpen });
}

export async function setActiveBarbers(settingsId: string, count: number) {
  await staffAction("set-barbers", { settingsId, count });
}

export async function setQueueCap(settingsId: string, cap: number) {
  await staffAction("set-queue-cap", { settingsId, cap });
}

export async function autoCleanup() {
  await staffAction("auto-cleanup", {});
}
