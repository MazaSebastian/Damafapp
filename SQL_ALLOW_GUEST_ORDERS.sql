-- Allow anonymous users to INSERT into orders
-- This is necessary for guest checkout flows where user_id is null

DROP POLICY IF EXISTS "Enable insert for all users" ON public.orders;
CREATE POLICY "Enable insert for all users" ON public.orders
FOR INSERT 
WITH CHECK (true);

-- Allow anonymous users to INSERT into order_items
DROP POLICY IF EXISTS "Enable insert for all users" ON public.order_items;
CREATE POLICY "Enable insert for all users" ON public.order_items
FOR INSERT 
WITH CHECK (true);

-- Ensure they can verify the order creation (Read their own order?)
-- For now, allowing insert is the priority to fix blocking error.
-- Usually status is redirected to MercadoPago or a success page.
