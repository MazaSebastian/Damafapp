-- Create settings table for global app configuration
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL, -- Storing as text for flexibility, cast as needed
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policies
-- Only Admins can view and edit settings
CREATE POLICY "Admins can view settings" ON app_settings 
    FOR SELECT USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

CREATE POLICY "Admins can update settings" ON app_settings 
    FOR UPDATE USING (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

CREATE POLICY "Admins can insert settings" ON app_settings 
    FOR INSERT WITH CHECK (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

-- Seed default loyalty rule
INSERT INTO app_settings (key, value, description) 
VALUES ('stars_exchange_rate', '1', 'Cantidad de estrellas ganadas por cada 1 peso gastado (Ej: 1 = 1 estrella por peso, 0.1 = 1 estrella cada 10 pesos)')
ON CONFLICT (key) DO NOTHING;
