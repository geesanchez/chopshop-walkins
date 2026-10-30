-- ============================================================
-- TEST KIT ONLY — never run in production.
-- Reproduces the grant state verified live on 2026-10-28:
-- the browser roles (anon / authenticated) hold TABLE-level
-- SELECT on every table, which is exactly what makes the
-- sensitive columns readable before the fix. A fresh local
-- Supabase does not necessarily grant this by default, so the
-- kit grants it explicitly to mirror prod.
-- Run AFTER schema.sql + the add-* files + seed.sql.
-- ============================================================
grant select on public.services,
                public.barbers,
                public.shop_settings,
                public.queue_entries,
                public.cut_history,
                public.pin_attempts,
                public.sms_attempts
  to anon, authenticated;
