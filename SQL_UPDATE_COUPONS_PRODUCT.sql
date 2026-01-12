-- Add target_product_id column
ALTER TABLE coupons ADD COLUMN target_product_id uuid REFERENCES products(id);

-- Update discount_type check constraint
-- First drop the existing one
ALTER TABLE coupons DROP CONSTRAINT coupons_discount_type_check;

-- Add the new one including 'product'
ALTER TABLE coupons ADD CONSTRAINT coupons_discount_type_check 
CHECK (discount_type IN ('percentage', 'fixed', 'product'));
