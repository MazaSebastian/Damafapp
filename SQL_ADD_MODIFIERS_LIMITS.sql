-- Add limit columns to modifiers table
ALTER TABLE modifiers 
ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_quantity INTEGER DEFAULT 10;

-- Optional: Update existing records to have reasonable defaults if needed
-- UPDATE modifiers SET max_quantity = 10 WHERE max_quantity IS NULL;
