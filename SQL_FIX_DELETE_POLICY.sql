-- Allow Admins/Owners to DELETE orders
CREATE POLICY "Admins can delete orders" ON orders 
FOR DELETE 
USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

-- Allow Admins/Owners to DELETE order_items (just in case of direct deletion needs, though cascade handles most)
CREATE POLICY "Admins can delete order items" ON order_items 
FOR DELETE 
USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
