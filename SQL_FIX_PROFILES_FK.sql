-- Add explicit Foreign Key relationship between orders and profiles
-- This allows Supabase to join valid user data when querying orders
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS fk_orders_profiles; -- Drop if exists to avoid dupes/errors with different names

ALTER TABLE public.orders
ADD CONSTRAINT fk_orders_profiles
FOREIGN KEY (user_id)
REFERENCES public.profiles (id)
ON DELETE SET NULL; -- If a profile is deleted, keep the order but user_id becomes null

-- Refresh the schema cache is usually automatic, but just in case:
NOTIFY pgrst, 'reload config';
