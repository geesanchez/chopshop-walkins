-- ============================================================
-- HARDEN RLS — Run this in Supabase SQL Editor
-- Removes permissive write policies. After this:
--   - Anon key can only SELECT + call join_queue RPC
--   - All staff writes go through the service role key (via API routes)
-- ============================================================

-- Drop the old permissive write policies
DROP POLICY IF EXISTS "Shop settings are writable" ON public.shop_settings;
DROP POLICY IF EXISTS "Queue entries are insertable" ON public.queue_entries;
DROP POLICY IF EXISTS "Queue entries are updatable" ON public.queue_entries;
DROP POLICY IF EXISTS "Queue entries are deletable" ON public.queue_entries;
DROP POLICY IF EXISTS "Cut history is insertable" ON public.cut_history;

-- The join_queue function uses SECURITY DEFINER so it runs as the
-- function owner (postgres) and bypasses RLS. Anon can still join
-- the queue via the RPC, but cannot directly INSERT/UPDATE/DELETE.
-- Staff operations go through the Next.js API which uses the
-- service role key (also bypasses RLS).
--
-- The remaining SELECT policies stay as-is:
--   "Services are publicly readable"
--   "Barbers are publicly readable"
--   "Shop settings are publicly readable"
--   "Queue entries are publicly readable"
--   "Cut history is publicly readable"
