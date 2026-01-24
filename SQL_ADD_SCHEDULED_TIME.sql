-- Add scheduled_time column to orders table if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS scheduled_time TEXT;

-- Verify it was added
COMMENT ON COLUMN orders.scheduled_time IS 'Selected delivery or pickup time slot (e.g. 20:30)';
