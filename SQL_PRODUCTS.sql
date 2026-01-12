-- Create categories table
create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create products table
create table products (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references categories(id),
  name text not null,
  description text,
  price decimal(10,2) not null,
  image_url text,
  is_available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table categories enable row level security;
alter table products enable row level security;

-- Policies (Public read, Admin write)
create policy "Categories are viewable by everyone." on categories for select using (true);
create policy "Products are viewable by everyone." on products for select using (true);

create policy "Admins can insert categories." on categories for insert with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
create policy "Admins can update categories." on categories for update using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
create policy "Admins can delete categories." on categories for delete using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

create policy "Admins can insert products." on products for insert with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
create policy "Admins can update products." on products for update using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
create policy "Admins can delete products." on products for delete using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

-- Insert Initial Data
insert into categories (name, slug, sort_order) values
('Hamburguesas', 'burgers', 1),
('Pollo', 'chicken', 2),
('Papas & Acompañamientos', 'sides', 3),
('Bebidas', 'drinks', 4),
('Postres', 'desserts', 5);

-- Insert Sample Products (We rely on categories existing, but for simplicity in this script we assume IDs or just insert via dashboard later. 
-- Actually, let's insert some mock products using subqueries to get category IDs)

insert into products (category_id, name, description, price, image_url)
select id, 'Classic Gourmet', 'Carne angus, queso cheddar, lechuga, tomate y salsa secreta.', 12.50, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000'
from categories where slug = 'burgers';

insert into products (category_id, name, description, price, image_url)
select id, 'Bacon King', 'Doble carne, cuádruple bacon, queso americano y ketchup.', 14.99, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=1000'
from categories where slug = 'burgers';

insert into products (category_id, name, description, price, image_url)
select id, 'Crispy Chicken', 'Pollo crujiente, mayonesa y lechuga fresca.', 10.50, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=1000'
from categories where slug = 'chicken';

insert into products (category_id, name, description, price, image_url)
select id, 'Papas Fritas Grandes', 'Crocantes y doradas.', 4.50, 'https://images.unsplash.com/photo-1630384031162-91469a319dd6?q=80&w=1000'
from categories where slug = 'sides';
