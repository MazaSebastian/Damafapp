-- Add scheduled_time to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_time text;

COMMENT ON COLUMN orders.scheduled_time IS 'Selected delivery/pickup time slot (e.g. 20:45, 21:15)';
