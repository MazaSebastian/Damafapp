-- Create orders table
create table orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id), -- Nullable for guests
  guest_info jsonb, -- To store name/contact for guests if needed later
  status text default 'pending', -- pending, preparing, ready, completed, cancelled
  total decimal(10,2) not null default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create order_items table
create table order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id), -- Main product
  quantity integer default 1,
  price_at_time decimal(10,2) not null,
  modifiers jsonb, -- Stored as JSON: [{name: 'Extra Cheddar', price: 1.50}, ...]
  side_info jsonb, -- Stored as JSON: {name: 'Papas Fritas', price: 0}
  drink_info jsonb, -- Stored as JSON: {name: 'Coca Cola', price: 0}
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table orders enable row level security;
alter table order_items enable row level security;

-- Policies
-- Admins can view/edit all orders
create policy "Admins can view all orders" on orders for select using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
create policy "Admins can update orders" on orders for update using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

-- Users can view their own orders
create policy "Users can view own orders" on orders for select using (auth.uid() = user_id);

-- Anyone (auth or anon) can insert orders (Guests need to be able to order)
-- Note: 'anon' role might need access. authenticating users is handled by supabase auth.
create policy "Public can insert orders" on orders for insert with check (true);


-- Order Items Policies
create policy "Admins can view all order items" on order_items for select using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
create policy "Users can view own order items" on order_items for select using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "Public can insert order items" on order_items for insert with check (true);
