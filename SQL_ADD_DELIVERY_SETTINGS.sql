-- Add Delivery Settings to app_settings table
INSERT INTO app_settings (key, value, description)
VALUES 
    ('store_lat', '-34.530019', 'Latitud del local para el mapa'),
    ('store_lng', '-58.542822', 'Longitud del local para el mapa'),
    ('delivery_price_per_km', '500', 'Costo de envío por kilómetro adicional'),
    ('delivery_free_range_km', '0', 'Radio de kilómetros con envío gratis')
ON CONFLICT (key) DO NOTHING;
