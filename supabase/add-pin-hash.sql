-- ============================================================
-- Add PIN hash column to shop_settings
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.shop_settings
ADD COLUMN staff_pin_hash text;

-- The column starts NULL. On first login, the app will hash
-- the STAFF_PIN env var and store it here. After that, the
-- database hash is the source of truth and can be changed
-- from the staff dashboard.
