-- Add payment fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_id text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected', 'in_process', 'refunded'));

-- Add index for faster lookup by payment_id
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
