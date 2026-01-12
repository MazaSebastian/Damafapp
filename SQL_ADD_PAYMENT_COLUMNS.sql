-- Add columns to track Mercado Pago payments
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending'; -- 'pending', 'approved', 'rejected'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mercadopago_preference_id text;

-- Optional: Create an index for faster lookups by payment_id
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
