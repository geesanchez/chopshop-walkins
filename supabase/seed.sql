-- ============================================================
-- The Chop Shop — Seed Data
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- Services
insert into public.services (name, duration_minutes) values
  ('Haircut', 40),
  ('Haircut + Beard', 48),
  ('Kids Cut', 30);

-- Barbers
insert into public.barbers (name) values
  ('Julio'),
  ('Beto'),
  ('Danny'),
  ('Francisco'),
  ('Gavino'),
  ('Nacho'),
  ('Luiz'),
  ('Eduardo'),
  ('Sleepy'),
  ('Emilio'),
  ('Jesus');

-- Shop settings (single row — shop starts closed)
insert into public.shop_settings (is_open, queue_cap) values
  (false, 5);
