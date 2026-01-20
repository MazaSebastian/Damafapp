-- Add client_name to orders for explicit identification
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_name text;

COMMENT ON COLUMN orders.client_name IS 'Explicit name of the client (from Profile or Guest) for easy display';
