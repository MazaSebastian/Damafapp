-- Add removable_ingredients column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS removable_ingredients TEXT[] DEFAULT '{}';

-- Ensure product_modifiers table is ready (re-run safe)
CREATE TABLE IF NOT EXISTS product_modifiers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    modifier_id UUID REFERENCES modifiers(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(product_id, modifier_id)
);

-- RLS Policies for product_modifiers
ALTER TABLE product_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON product_modifiers FOR SELECT USING (true);
CREATE POLICY "Enable insert for admins only" ON product_modifiers FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'owner')));
CREATE POLICY "Enable delete for admins only" ON product_modifiers FOR DELETE USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'owner')));
