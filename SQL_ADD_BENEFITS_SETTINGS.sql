-- Add Settings for Loyalty Level Benefits
INSERT INTO app_settings (key, value, description) VALUES
('loyalty_benefits_welcome', 'Bebida de cumpleaños', 'Beneficios del Nivel Welcome (separados por coma)'),
('loyalty_benefits_green', 'Refill Café del Día, Ofertas especiales', 'Beneficios del Nivel Green (separados por coma)'),
('loyalty_benefits_gold', 'Bebida Alta cada 100 stars, Eventos VIP, Gold Card Digital', 'Beneficios del Nivel Gold (separados por coma)')
ON CONFLICT (key) DO NOTHING;
