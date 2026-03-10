-- ============================================================
-- RLS Lockdown Migration
-- Run this in Supabase SQL Editor to drop permissive write
-- policies. All mutations now go through API routes using
-- the service_role key (which bypasses RLS).
-- The join_queue() RPC is SECURITY DEFINER so client-side
-- joins still work even with INSERT blocked.
-- ============================================================

-- 1. SHOP SETTINGS — drop the open UPDATE policy
drop policy if exists "Shop settings are writable" on public.shop_settings;

-- 2. QUEUE ENTRIES — drop INSERT, UPDATE, DELETE policies
--    (join_queue RPC is SECURITY DEFINER, bypasses RLS)
drop policy if exists "Queue entries are insertable" on public.queue_entries;
drop policy if exists "Queue entries are updatable" on public.queue_entries;
drop policy if exists "Queue entries are deletable" on public.queue_entries;

-- 3. CUT HISTORY — drop the open INSERT policy
drop policy if exists "Cut history is insertable" on public.cut_history;

-- 4. PIN ATTEMPTS — replace open "for all" policy with service-role-only
drop policy if exists "Service role manages pin_attempts" on public.pin_attempts;
create policy "Service role only on pin_attempts"
  on public.pin_attempts for all
  using ((current_setting('request.jwt.claims', true)::json ->> 'role') = 'service_role');

-- 5. SMS ATTEMPTS — replace open "for all" policy with service-role-only
drop policy if exists "Service role manages sms_attempts" on public.sms_attempts;
create policy "Service role only on sms_attempts"
  on public.sms_attempts for all
  using ((current_setting('request.jwt.claims', true)::json ->> 'role') = 'service_role');
