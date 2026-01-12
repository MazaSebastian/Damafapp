-- Add stars column to profiles table
alter table profiles 
add column if not exists stars integer default 0;

-- Update existing profiles to have 0 stars if null (though default handles new ones)
update profiles set stars = 0 where stars is null;
