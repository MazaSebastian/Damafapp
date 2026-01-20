ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_order SERIAL;

-- Function to swap orders (optional, but UI can just update IDs)
-- We will just use client side logic to swap values and update batch.
