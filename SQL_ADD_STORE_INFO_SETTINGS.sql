-- Add new settings for Store Info & Hours
INSERT INTO app_settings (key, value, description) VALUES
('store_status', 'open', 'Estado del local: "open" o "closed". Controla si se pueden hacer pedidos.'),
('store_schedule_text', 'Jueves a Domingos de 20hs a 23hs', 'Texto visible de los horarios de atención.'),
('store_address', 'Carapachay, Vicente López', 'Dirección del local visible en la cabecera.'),
('store_slogan', 'Perfectamente desubicadas.', 'Slogan que aparece debajo del logo.'),
('store_instagram', 'https://instagram.com/damafa', 'Link al perfil de Instagram.')
ON CONFLICT (key) DO NOTHING;
