-- ============================================================
-- The Chop Shop — Walk-in Queue Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. SERVICES TABLE
-- Static list of services offered
create table public.services (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  duration_minutes integer not null, -- average duration for wait estimates
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. BARBERS TABLE
-- Staff members who perform cuts (for analytics/tracking)
create table public.barbers (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. SHOP SETTINGS TABLE
-- Single-row table for global shop state
create table public.shop_settings (
  id uuid default gen_random_uuid() primary key,
  is_open boolean default false,
  queue_cap integer default 5,
  active_barbers integer not null default 1,
  staff_pin_hash text,
  updated_at timestamptz default now()
);

-- 4. QUEUE ENTRIES TABLE
-- The live queue — heart of the system
create type public.queue_status as enum ('waiting', 'in_progress', 'completed', 'skipped', 'removed');
create type public.arrival_status as enum ('here', 'on_my_way');

create table public.queue_entries (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  service_id uuid not null references public.services(id),
  status public.queue_status default 'waiting',
  arrival_status public.arrival_status default 'here',
  position integer not null,
  source text not null default 'kiosk', -- 'kiosk' or 'remote'
  assigned_barber_id uuid references public.barbers(id),
  created_at timestamptz default now(),
  called_at timestamptz,
  completed_at timestamptz
);

-- Index for fast queue queries
create index idx_queue_entries_status on public.queue_entries(status);
create index idx_queue_entries_position on public.queue_entries(position);
create index idx_queue_entries_created on public.queue_entries(created_at);

-- 5. CUT HISTORY TABLE
-- Completed cuts for analytics (who cut, what service, when)
create table public.cut_history (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  service_id uuid not null references public.services(id),
  barber_id uuid not null references public.barbers(id),
  source text not null default 'kiosk',
  started_at timestamptz,
  completed_at timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_cut_history_barber on public.cut_history(barber_id);
create index idx_cut_history_completed on public.cut_history(completed_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- All tables are readable by anon (public displays need this).
-- Writes are also allowed via anon key — PIN check happens in app.
-- For a small barbershop, this is the right tradeoff: simple + functional.
-- ============================================================

alter table public.services enable row level security;
alter table public.barbers enable row level security;
alter table public.shop_settings enable row level security;
alter table public.queue_entries enable row level security;
alter table public.cut_history enable row level security;

-- Services: read-only for everyone
create policy "Services are publicly readable"
  on public.services for select using (true);

-- Barbers: read-only for everyone
create policy "Barbers are publicly readable"
  on public.barbers for select using (true);

-- Shop settings: readable by all, writable by all (PIN gated in app)
create policy "Shop settings are publicly readable"
  on public.shop_settings for select using (true);

create policy "Shop settings are writable"
  on public.shop_settings for update using (true);

-- Queue entries: full access (PIN gated in app for mutations)
create policy "Queue entries are publicly readable"
  on public.queue_entries for select using (true);

create policy "Queue entries are insertable"
  on public.queue_entries for insert with check (true);

create policy "Queue entries are updatable"
  on public.queue_entries for update using (true);

create policy "Queue entries are deletable"
  on public.queue_entries for delete using (true);

-- Cut history: readable by all, insertable by all (PIN gated in app)
create policy "Cut history is publicly readable"
  on public.cut_history for select using (true);

create policy "Cut history is insertable"
  on public.cut_history for insert with check (true);

-- ============================================================
-- REALTIME
-- Enable realtime for queue_entries and shop_settings
-- ============================================================

alter publication supabase_realtime add table public.queue_entries;
alter publication supabase_realtime add table public.shop_settings;

-- ============================================================
-- DATABASE FUNCTION: Enforce queue cap at DB level
-- Returns the new queue entry or raises an exception
-- ============================================================

create or replace function public.join_queue(
  p_customer_name text,
  p_service_id uuid,
  p_source text default 'kiosk',
  p_arrival_status public.arrival_status default 'here'
)
returns public.queue_entries
language plpgsql
security definer
as $$
declare
  v_is_open boolean;
  v_queue_cap integer;
  v_current_count integer;
  v_next_position integer;
  v_new_entry public.queue_entries;
begin
  -- Check if shop is open
  select is_open, queue_cap into v_is_open, v_queue_cap
  from public.shop_settings
  limit 1;

  if not v_is_open then
    raise exception 'Shop is currently closed';
  end if;

  -- Count active queue entries (waiting or in_progress)
  select count(*) into v_current_count
  from public.queue_entries
  where status in ('waiting', 'in_progress');

  if v_current_count >= v_queue_cap then
    raise exception 'Queue is full (% / %)', v_current_count, v_queue_cap;
  end if;

  -- Get next position number
  select coalesce(max(position), 0) + 1 into v_next_position
  from public.queue_entries
  where status in ('waiting', 'in_progress');

  -- Insert the new entry
  insert into public.queue_entries (customer_name, service_id, position, source, arrival_status)
  values (p_customer_name, p_service_id, v_next_position, p_source, p_arrival_status)
  returning * into v_new_entry;

  return v_new_entry;
end;
$$;
