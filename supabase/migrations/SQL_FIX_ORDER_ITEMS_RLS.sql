-- Fix RLS policies for order_items to allow INSERT
-- Problem: order_items table only had SELECT policy, causing silent insert failures

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Public order items view" ON public.order_items;
DROP POLICY IF EXISTS "Allow insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert their order items" ON public.order_items;

-- Allow anyone to view order items (needed for admin dashboard)
CREATE POLICY "Public order items view" 
ON public.order_items 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert order items
CREATE POLICY "Authenticated users can insert order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow anonymous users to insert order items (for guest checkout)
CREATE POLICY "Anonymous users can insert order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (auth.role() = 'anon');
