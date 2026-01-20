-- 1. Create Tax Conditions Table
CREATE TABLE IF NOT EXISTS tax_conditions (
    id SERIAL PRIMARY KEY,
    name text NOT NULL, -- 'Responsable Inscripto', 'Monotributista', etc.
    afip_code text NOT NULL, -- Code used by AFIP (e.g., '1', '6')
    created_at timestamptz DEFAULT now()
);

-- Insert default AFIP conditions (Common ones)
INSERT INTO tax_conditions (name, afip_code) VALUES
('IVA Responsable Inscripto', '1'),
('IVA Responsable No Inscripto', '2'),
('IVA No Responsable', '3'),
('IVA Sujeto Exento', '4'),
('Consumidor Final', '5'),
('Responsable Monotributo', '6'),
('Sujeto No Categorizado', '7')
ON CONFLICT DO NOTHING;


-- 2. Create Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id), -- Link to existing order
    
    cbte_tipo int NOT NULL, -- 1=Factura A, 6=Factura B, 11=Factura C
    pto_venta int NOT NULL, -- Point of Sale number (e.g. 1)
    cbte_nro int NOT NULL, -- Receipt Number
    
    cae text, -- Authorization Code
    cae_fch_vto date, -- Expiration of CAE
    
    doc_tipo int, -- 80=CUIT, 96=DNI, 99=Consumidor Final
    doc_nro text, -- The actual number
    
    imp_total numeric(10,2) NOT NULL,
    imp_neto numeric(10,2) NOT NULL,
    imp_iva numeric(10,2) DEFAULT 0,
    
    status text DEFAULT 'pending', -- pending, authorized, rejected
    afip_response jsonb, -- Store full response for debugging
    
    created_at timestamptz DEFAULT now()
);

-- 3. Create Storage Bucket for Certificates
-- This requires the 'storage' schema extension which is usually enabled by default in Supabase

INSERT INTO storage.buckets (id, name, public)
VALUES ('afip-certs', 'afip-certs', false)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users (Admins) to upload/read certs
-- Adjust 'authenticated' to specific admin role if needed later
CREATE POLICY "Admin Access to AFIP Certs"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'afip-certs' )
WITH CHECK ( bucket_id = 'afip-certs' );
