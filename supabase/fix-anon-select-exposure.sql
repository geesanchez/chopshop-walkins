-- ============================================================
-- FIX — Lane 2 F1 (critical) + F2 (high) + F3 consolidation
-- Branch: fix/lane2-f1-f2-anon-select
-- Run in Supabase SQL Editor (Dashboard > SQL Editor).
-- IDEMPOTENT: safe to run more than once; end state is the same.
--
-- Problem (CONFIRMED live 2026-10-28 by read-only checks, HTTP 200):
--   The browser-facing roles (anon/authenticated) hold TABLE-level
--   SELECT grants, and the RLS SELECT policies are using(true), so
--   anyone with the public anon key (shipped in the site's JS) can
--   read every column of shop_settings and queue_entries:
--     F1  shop_settings.staff_pin_hash — <=6-digit PIN, single fast
--         HMAC-SHA256 -> offline brute-force in seconds -> staff access
--     F2  queue_entries.phone — every live + historical customer
--         name/phone enumerable
--   The app itself never reads those columns client-side:
--     - shop_settings select is an explicit safe column list
--       (src/hooks/use-queue.ts:56)
--     - queue_entries select is an explicit safe column list with
--       no phone (src/hooks/use-queue.ts:23)
--     - PIN verification is server-side (/api/verify-pin, service
--       role, rate-limited); staff phone use is server-side
--       (/api/staff "call" action, service role)
--   So this fix is grants-only: no policy change is needed for the
--   SELECT policies (they stay using(true)); Postgres column
--   privileges do the cutting. RLS policies are row-level only and
--   cannot restrict columns — that is why the repo's earlier
--   harden/lockdown scripts could not close this.
--
-- Method per table: REVOKE the table-level SELECT, then GRANT back
-- SELECT on exactly the columns the client queries.
-- service_role is untouched everywhere (it bypasses RLS and keeps
-- its own grants); all API routes keep working.
--
-- NOTES / KNOWN EDGES
--   * join_queue() is SECURITY DEFINER and RETURNS the inserted row
--     (including the phone the joining customer just typed). RPC
--     results are not filtered by column grants. That returns a
--     customer their own phone at join time only — unchanged by
--     this migration and accepted.
--   * Realtime: queue_entries and shop_settings are in the
--     supabase_realtime publication and the app subscribes via
--     postgres_changes. After applying, smoke-test that the public
--     display still updates live. If Realtime stalls under
--     column-only grants, the fallback design is a separate
--     service-role-only table for phone (queue_entry_private) —
--     do NOT simply re-grant table SELECT (that re-opens F2).
--   * services / barbers are untouched: public by design, no
--     sensitive columns, client selects *.
-- ============================================================

-- ------------------------------------------------------------
-- A. shop_settings — staff_pin_hash out of browser reach (F1)
-- ------------------------------------------------------------
revoke select on public.shop_settings from public, anon, authenticated;
grant select (id, is_open, queue_cap, active_barbers, updated_at)
  on public.shop_settings to anon, authenticated;

-- ------------------------------------------------------------
-- B. queue_entries — phone out of browser reach (F2)
--    Column list mirrors src/hooks/use-queue.ts:23 exactly.
-- ------------------------------------------------------------
revoke select on public.queue_entries from public, anon, authenticated;
grant select (id, customer_name, service_id, status, arrival_status,
              position, source, assigned_barber_id, created_at,
              called_at, completed_at)
  on public.queue_entries to anon, authenticated;

-- ------------------------------------------------------------
-- C. cut_history — no client-side reader exists anywhere in src/
--    (staff API route only INSERTs, via service role). Customer
--    names + services + barbers + timestamps stop being world-
--    readable. If a future staff analytics UI needs it, read via
--    an API route (service role), not by re-granting anon.
-- ------------------------------------------------------------
revoke select on public.cut_history from public, anon, authenticated;

-- ------------------------------------------------------------
-- D. pin_attempts / sms_attempts — consolidate to ONE policy set (F3)
--    The repo scripts disagree: add-rate-limit.sql /
--    add-sms-rate-limit.sql created FOR ALL using(true) policies
--    ("Service role manages ..."), while schema.sql /
--    lockdown-rls.sql created service-role-only policies under a
--    different name. Postgres ORs permissive policies, so if both
--    exist, the open one wins. Drop every known name, recreate
--    only the restrictive policy, and remove browser-role grants
--    (sms_attempts.phone is customer phone numbers).
-- ------------------------------------------------------------
revoke all on public.pin_attempts from public, anon, authenticated;
revoke all on public.sms_attempts from public, anon, authenticated;

drop policy if exists "Service role manages pin_attempts" on public.pin_attempts;
drop policy if exists "Service role only on pin_attempts" on public.pin_attempts;
create policy "Service role only on pin_attempts"
  on public.pin_attempts for all
  using ((current_setting('request.jwt.claims', true)::json ->> 'role') = 'service_role');

drop policy if exists "Service role manages sms_attempts" on public.sms_attempts;
drop policy if exists "Service role only on sms_attempts" on public.sms_attempts;
create policy "Service role only on sms_attempts"
  on public.sms_attempts for all
  using ((current_setting('request.jwt.claims', true)::json ->> 'role') = 'service_role');

-- ============================================================
-- AFTER APPLYING (see fix notes in the audit goal files):
--   1. Re-run the two read-only curl checks from
--      swe-harness/pilot/live-db-verification.md — both must stop
--      returning 200 (expect an error: column privilege denied).
--   2. Run the pg_policies inventory query from the same sheet —
--      pin_attempts / sms_attempts must show ONLY the
--      service-role-only policy each.
--   3. Smoke-test: landing page, /join end-to-end, public display
--      (incl. live Realtime updates), kiosk, staff login,
--      dashboard, staff "call" action.
--   4. ONLY THEN rotate the staff PIN to a 6-digit PIN via the
--      dashboard (companion code change raises the minimum to 6).
--      Rotating before the grants land just exposes the new hash.
--
-- EMERGENCY ROLLBACK (re-opens the exposure — break-glass only):
--   grant select on public.shop_settings to anon, authenticated;
--   grant select on public.queue_entries to anon, authenticated;
--   grant select on public.cut_history to anon, authenticated;
-- ============================================================
