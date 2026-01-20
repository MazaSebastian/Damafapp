-- Create drivers table
create table public.drivers (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  phone text null,
  status text not null default 'active'::text, -- active, inactive, busy
  current_order_id uuid null,
  last_location text null,
  constraint drivers_pkey primary key (id),
  constraint drivers_current_order_id_fkey foreign key (current_order_id) references orders (id)
) tablespace pg_default;

-- Enable RLS
alter table public.drivers enable row level security;

-- Policies (Allow full access to authenticated users/admins for now, refine later)
create policy "Enable read access for all users"
on public.drivers
as permissive
for select
to public
using (true);

create policy "Enable insert for authenticated users only"
on public.drivers
as permissive
for insert
to authenticated
with check (true);

create policy "Enable update for authenticated users only"
on public.drivers
as permissive
for update
to authenticated
using (true);

create policy "Enable delete for authenticated users only"
on public.drivers
as permissive
for delete
to authenticated
using (true);
