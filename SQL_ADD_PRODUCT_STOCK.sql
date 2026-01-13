-- Add stock column to products table for inventory management
-- NULL means "Unlimited" stock (default)
-- 0 means "Out of Stock" (though is_available handles visibility, stock=0 should disable adding to cart)
-- > 0 means tracked quantity

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT NULL;

COMMENT ON COLUMN products.stock IS 'Inventory count. NULL = Unlimited, 0 = Out of Stock, >0 = Quantity available';
