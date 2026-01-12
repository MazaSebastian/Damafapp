-- Create modifiers table
create table modifiers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price decimal(10,2) default 0.00,
  category_slug text not null, -- 'burgers', 'chicken', etc. OR 'all'
  type text default 'add', -- 'add', 'remove', 'option'
  is_available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table modifiers enable row level security;

-- Policies
create policy "Modifiers are viewable by everyone." on modifiers for select using (true);
create policy "Admins can insert modifiers." on modifiers for insert with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
create policy "Admins can update modifiers." on modifiers for update using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
create policy "Admins can delete modifiers." on modifiers for delete using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

-- Insert Sample Modifiers
insert into modifiers (name, price, category_slug, type) values
('Extra Cheddar', 1.50, 'burgers', 'add'),
('Extra Bacon', 2.00, 'burgers', 'add'),
('Sin Cebolla', 0.00, 'burgers', 'remove'),
('Sin Pepinillos', 0.00, 'burgers', 'remove'),
('Extra Salsa', 0.50, 'all', 'add');
