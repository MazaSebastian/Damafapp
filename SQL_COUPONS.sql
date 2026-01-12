-- Create coupons table
create table coupons (
    id uuid default gen_random_uuid() primary key,
    code text not null unique,
    discount_type text check (discount_type in ('percentage', 'fixed')),
    value decimal(10,2) not null,
    expiration_date timestamp with time zone,
    usage_limit integer,
    usage_count integer default 0,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table coupons enable row level security;

-- Policies
-- Admins can do everything
create policy "Admins can manage coupons" on coupons 
    using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')))
    with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

-- Users can read coupons to validate them (only if active and not expired logic could be here, but simpler to just allow read)
-- Better: "Public" read allow, validation happens via query filters
create policy "Anyone can read coupons" on coupons for select using (true);


-- Update orders table to store discount info
alter table orders 
add column discount_code text,
add column discount_amount decimal(10,2) default 0.00,
add column final_total decimal(10,2); 

-- Update existing orders to have final_total = total
update orders set final_total = total where final_total is null;
