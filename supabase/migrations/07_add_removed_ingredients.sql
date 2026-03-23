-- Add removed_ingredients column to order_items
-- Stores array of ingredient names the customer wants removed (e.g., ["lechuga", "tomate"])
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS removed_ingredients JSONB DEFAULT '[]';

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'order_items'
AND column_name IN ('removed_ingredients', 'notes', 'modifiers', 'side_info', 'drink_info');
