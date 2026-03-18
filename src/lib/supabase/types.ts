export type QueueStatus = "waiting" | "in_progress" | "completed" | "skipped" | "removed";
export type ArrivalStatus = "here" | "on_my_way";

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Barber {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface ShopSettings {
  id: string;
  is_open: boolean;
  queue_cap: number;
  active_barbers: number;
  updated_at: string;
}

/** Full row type including sensitive fields — only use server-side */
export interface ShopSettingsRow extends ShopSettings {
  staff_pin_hash: string | null;
}

export interface QueueEntry {
  id: string;
  customer_name: string;
  service_id: string;
  status: QueueStatus;
  arrival_status: ArrivalStatus;
  position: number;
  source: string;
  phone: string | null;
  assigned_barber_id: string | null;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
}

// Joined types for UI convenience
export interface QueueEntryWithService extends QueueEntry {
  services: Service;
}
