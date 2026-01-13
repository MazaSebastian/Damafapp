-- Add Delivery Tracking Columns to Orders Table

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS driver_name text,
ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending', -- pending, assigned, picked_up, delivered
ADD COLUMN IF NOT EXISTS driver_lat float8,
ADD COLUMN IF NOT EXISTS driver_lng float8,
ADD COLUMN IF NOT EXISTS last_location_update timestamptz;

-- Create index for faster filtering by delivery status
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);

-- Comments for documentation
COMMENT ON COLUMN orders.driver_id IS 'ID of the assigned driver (if any)';
COMMENT ON COLUMN orders.delivery_status IS 'Status of the delivery: pending, assigned, picked_up, delivered';
COMMENT ON COLUMN orders.driver_lat IS 'Current latitude of the driver';
COMMENT ON COLUMN orders.driver_lng IS 'Current longitude of the driver';
