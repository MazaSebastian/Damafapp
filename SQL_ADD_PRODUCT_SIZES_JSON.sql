-- Add sizes JSONB column for dynamic sizing (Simple, Doble, Triple, etc.)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products.sizes IS 'Array of additional sizes. Example: [{"name": "Doble", "price": 1400}, {"name": "Triple", "price": 1800}]';
