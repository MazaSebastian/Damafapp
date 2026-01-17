-- 1. Create table for realtime checkout sessions (IF NOT EXISTS protects from error)
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  status TEXT DEFAULT 'idle',
  cart_items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_method TEXT,
  qr_code_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Realtime (This block handles the error if it's already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE checkout_sessions;
EXCEPTION
  WHEN duplicate_object THEN NULL; -- Ignore if already added
  WHEN OTHERS THEN NULL; -- Ignore other errors here to allow script to proceed
END $$;

-- 3. Security Policies (Drop first to avoid "already exists" error)
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for checkout sessions" ON checkout_sessions;
CREATE POLICY "Allow public read for checkout sessions" ON checkout_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin update checkout sessions" ON checkout_sessions;
CREATE POLICY "Allow admin update checkout sessions" ON checkout_sessions
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. Create the Singleton Row (If not exists)
INSERT INTO checkout_sessions (id, status)
SELECT '00000000-0000-0000-0000-000000000000', 'idle'
WHERE NOT EXISTS (SELECT 1 FROM checkout_sessions WHERE id = '00000000-0000-0000-0000-000000000000');
