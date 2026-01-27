ALTER TABLE public.afip_credentials 
ADD COLUMN IF NOT EXISTS tax_condition TEXT DEFAULT 'monotributo'; 
-- Values: 'monotributo', 'inscripto'
