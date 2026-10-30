-- ============================================================
-- TEST KIT ONLY — fake data, never run in production.
-- Run AFTER seed.sql and 00-prod-like-grants.sql.
-- All names/phones are fictional (555 numbers are reserved
-- for fiction). The PIN hash is a literal placeholder string,
-- not a hash of any real PIN.
-- ============================================================

-- Fake staff PIN hash on the seeded settings row + open the shop
-- (join_queue refuses joins while closed).
update public.shop_settings
   set staff_pin_hash = 'FAKE_HASH_FOR_LOCAL_TEST_ONLY',
       is_open = true;

-- Two fake queue entries with fake phones.
insert into public.queue_entries
  (customer_name, service_id, status, arrival_status, position, source, phone, assigned_barber_id)
values
  ('Test Customer One',
   (select id from public.services where name = 'Haircut'),
   'waiting', 'here', 1, 'remote', '555-0101',
   (select id from public.barbers where name = 'Julio')),
  ('Test Customer Two',
   (select id from public.services where name = 'Kids Cut'),
   'waiting', 'on_my_way', 2, 'remote', '555-0102', null);

-- One fake cut-history row.
insert into public.cut_history (customer_name, service_id, barber_id, source)
values
  ('Test Customer Done',
   (select id from public.services where name = 'Haircut'),
   (select id from public.barbers where name = 'Julio'),
   'kiosk');

-- Fake rate-limit rows (IPs/phones are fictional).
insert into public.pin_attempts (ip, count) values ('192.0.2.10', 3)
  on conflict (ip) do nothing;
insert into public.sms_attempts (phone, count) values ('555-0199', 2)
  on conflict (phone) do nothing;
