INSERT INTO app_settings (key, value, description) 
VALUES ('store_phone', '5491100000000', 'Número de WhatsApp para pedidos (Formato internacional sin +)')
ON CONFLICT (key) DO NOTHING;
