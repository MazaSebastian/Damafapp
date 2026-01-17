-- Seed Bank Details in App Settings
INSERT INTO app_settings (key, value, description) VALUES 
('bank_alias', 'DAMAF.APP.MP', 'Alias CBU para transferencias'),
('bank_cbu', '0000003100000000000000', 'CBU/CVU para transferencias'),
('bank_name', 'Mercado Pago', 'Nombre del Banco/Billetera'),
('bank_cuit', '20-12345678-9', 'CUIT del titular')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
