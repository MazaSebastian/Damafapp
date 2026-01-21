-- Ensure table exists
CREATE TABLE IF NOT EXISTS production_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    start_time TEXT NOT NULL, -- Format 'HH:mm'
    max_orders INTEGER DEFAULT 5,
    is_delivery BOOLEAN DEFAULT false,
    is_takeaway BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE production_slots ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read slots" ON production_slots FOR SELECT USING (true);
CREATE POLICY "Admins full access" ON production_slots FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'owner'))
);
