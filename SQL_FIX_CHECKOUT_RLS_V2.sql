-- FIX: Enable RLS but create PERMISSIVE policies for Orders to allow Guest Checkout

-- 1. ORDERS TABLE
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow INSERT for everyone (Authenticated and Anon)
-- This fixes the "new row violates row-level security policy" during creation
DROP POLICY IF EXISTS "Allow insert for all" ON public.orders;
CREATE POLICY "Allow insert for all" ON public.orders FOR INSERT WITH CHECK (true);

-- Allow SELECT for everyone 
-- This fixes the error when the app tries to read the order ID returning from the insert (.select())
DROP POLICY IF EXISTS "Allow select for all" ON public.orders;
CREATE POLICY "Allow select for all" ON public.orders FOR SELECT USING (true);

-- Allow UPDATE for everyone (Optional, but good if we need to update status later as guest)
DROP POLICY IF EXISTS "Allow update for all" ON public.orders;
CREATE POLICY "Allow update for all" ON public.orders FOR UPDATE USING (true);


-- 2. ORDER ITEMS TABLE
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow INSERT for everyone
DROP POLICY IF EXISTS "Allow insert items for all" ON public.order_items;
CREATE POLICY "Allow insert items for all" ON public.order_items FOR INSERT WITH CHECK (true);

-- Allow SELECT for everyone
DROP POLICY IF EXISTS "Allow select items for all" ON public.order_items;
CREATE POLICY "Allow select items for all" ON public.order_items FOR SELECT USING (true);
