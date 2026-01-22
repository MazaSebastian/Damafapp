INSERT INTO app_settings (key, value, description)
VALUES ('delivery_fixed_price', '0', 'Costo de envío fijo (Si es mayor a 0, anula el cálculo por KM)')
ON CONFLICT (key) DO NOTHING;
