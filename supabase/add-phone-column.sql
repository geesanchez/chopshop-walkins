-- ============================================================
-- Add phone column to queue_entries + update join_queue RPC
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add nullable phone column
alter table public.queue_entries add column if not exists phone text;

-- 2. Update join_queue function to accept optional phone parameter
create or replace function public.join_queue(
  p_customer_name text,
  p_service_id uuid,
  p_source text default 'kiosk',
  p_arrival_status public.arrival_status default 'here',
  p_phone text default null
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

  -- Insert the new entry (phone is optional)
  insert into public.queue_entries (customer_name, service_id, position, source, arrival_status, phone)
  values (p_customer_name, p_service_id, v_next_position, p_source, p_arrival_status, p_phone)
  returning * into v_new_entry;

  return v_new_entry;
end;
$$;
