-- Create news_events table
create table news_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  image_url text,
  type text default 'news', -- 'promo', 'news', 'event'
  action_text text default 'Ver más',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table news_events enable row level security;

-- Policy: Anyone can read news
create policy "news_events are viewable by everyone." on news_events
  for select using (true);

-- Policy: Only admins can insert/update/delete (We reuse the profile check)
create policy "Admins can insert news." on news_events
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')
    )
  );

create policy "Admins can update news." on news_events
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')
    )
  );

create policy "Admins can delete news." on news_events
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')
    )
  );
