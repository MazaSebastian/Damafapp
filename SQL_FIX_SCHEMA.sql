-- 1. Check if column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'order_items'
        AND column_name = 'unit_price'
    ) THEN
        ALTER TABLE order_items ADD COLUMN unit_price NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 2. Force Schema Cache Reload again (just in case)
NOTIFY pgrst, 'reload config';
