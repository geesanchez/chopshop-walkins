-- Rate limiting table for PIN attempts
create table if not exists public.pin_attempts (
  ip text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

-- Allow service role full access
alter table public.pin_attempts enable row level security;

create policy "Service role manages pin_attempts"
  on public.pin_attempts for all using (true);
