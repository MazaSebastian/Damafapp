-- Update the function to handle new user signup with metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, full_name, phone, birth_date, zip_code)
  values (
    new.id,
    new.email,
    'user',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    NULLIF(new.raw_user_meta_data->>'birth_date', '')::date,
    new.raw_user_meta_data->>'zip_code'
  );
  return new;
end;
$$ language plpgsql security definer;
