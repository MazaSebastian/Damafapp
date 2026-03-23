-- Fix: Allow customers to read their own order_items
-- The tenant_order_items_user_select policy requires both user_id match AND tenant_id match,
-- which can fail if current_tenant_id() is not properly set for customer sessions.
-- This adds a simpler policy that only checks user ownership through the orders table.

-- Drop the potentially broken user-select policy
DROP POLICY IF EXISTS "tenant_order_items_user_select" ON public.order_items;

-- Recreate with a simpler check that doesn't depend on current_tenant_id()
CREATE POLICY "tenant_order_items_user_select" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- Also ensure anon users can read order_items for guest order tracking
-- (guest orders have user_id = NULL, tracked via localStorage on the client)
