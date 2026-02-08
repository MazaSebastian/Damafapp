-- =====================================================
-- BUSINESS SETTINGS TABLE
-- Stores company information for invoice generation
-- =====================================================

CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    trade_name TEXT,           -- Nombre de fantasía
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT,
    province TEXT,
    cuit TEXT NOT NULL,
    tax_condition TEXT NOT NULL CHECK (tax_condition IN ('monotributo', 'inscripto', 'exento')),
    start_date DATE,           -- Inicio de actividades
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,             -- URL del logo en Storage
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage
DROP POLICY IF EXISTS "Admins can manage business_settings" ON public.business_settings;
CREATE POLICY "Admins can manage business_settings" ON public.business_settings
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

-- Insert default configuration (to be updated by admin)
INSERT INTO public.business_settings (
    business_name,
    address,
    city,
    cuit,
    tax_condition
) VALUES (
    'MI EMPRESA',
    'Dirección Comercial',
    'Ciudad',
    '00-00000000-0',
    'monotributo'
) ON CONFLICT DO NOTHING;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_settings_active ON public.business_settings(is_active);
