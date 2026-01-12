-- Add media_type column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video'));
