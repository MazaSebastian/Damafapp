-- Add order_type and delivery_address columns
ALTER TABLE orders 
ADD COLUMN order_type text CHECK (order_type IN ('takeaway', 'delivery')) DEFAULT 'takeaway',
ADD COLUMN delivery_address text;

-- Update existing orders to have a default type if needed (optional, clean start preferred but good for safety)
UPDATE orders SET order_type = 'takeaway' WHERE order_type IS NULL;
