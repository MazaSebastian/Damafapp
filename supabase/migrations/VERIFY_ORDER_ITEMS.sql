-- Verify order_items table structure
-- This will show all columns in the order_items table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_items'
ORDER BY ordinal_position;

-- Check if there are ANY order_items in the database
SELECT COUNT(*) as total_order_items FROM public.order_items;

-- Check recent orders and their items (last 5)
SELECT 
    o.id as order_id,
    o.created_at,
    o.client_name,
    COUNT(oi.id) as items_count
FROM public.orders o
LEFT JOIN public.order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.created_at, o.client_name
ORDER BY o.created_at DESC
LIMIT 5;
