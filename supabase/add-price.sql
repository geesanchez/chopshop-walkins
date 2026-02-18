-- Add price column to services
alter table public.services add column price numeric(6,2);

-- Set prices: $30 for all cuts, Haircut + Beard = $45
update public.services set price = 30.00 where name = 'Haircut';
update public.services set price = 30.00 where name = 'Kids Cut';
update public.services set price = 45.00 where name = 'Haircut + Beard';
