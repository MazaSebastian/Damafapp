-- Add price_at_time column to order_items to store price snapshot at time of order
-- This prevents price changes from affecting historical orders

ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS price_at_time DECIMAL(10,2) DEFAULT 0;

-- Update existing records to populate price_at_time from products table (best effort)
UPDATE public.order_items oi
SET price_at_time = COALESCE(
    (SELECT p.price FROM public.products p WHERE p.id = oi.product_id),
    0
)
WHERE oi.price_at_time IS NULL OR oi.price_at_time = 0;
