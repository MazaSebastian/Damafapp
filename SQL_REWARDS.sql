-- Create rewards table
create table rewards (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  cost integer not null default 100,
  image_url text,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table rewards enable row level security;

-- Policy: Everyone can read active rewards
create policy "Active rewards are viewable by everyone." on rewards
  for select using (active = true);

-- Policy: Admins can manage rewards
create policy "Admins can insert rewards." on rewards
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')
    )
  );

create policy "Admins can update rewards." on rewards
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')
    )
  );

create policy "Admins can delete rewards." on rewards
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')
    )
  );
