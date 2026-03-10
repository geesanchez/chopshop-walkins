-- Rate limiting table for SMS verification attempts
create table if not exists public.sms_attempts (
  phone text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

-- Allow service role full access
alter table public.sms_attempts enable row level security;

create policy "Service role manages sms_attempts"
  on public.sms_attempts for all using (true);
