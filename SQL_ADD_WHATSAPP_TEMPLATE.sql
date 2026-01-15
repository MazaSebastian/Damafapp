-- Add the WhatsApp Message Template setting
INSERT INTO app_settings (key, value, description) 
VALUES (
    'store_whatsapp_template', 
    'Hola! Quiero confirmar mi pedido *#{{id}}* 🍔\n\n📅 *Fecha:* {{fecha}}\n👤 *Cliente:* {{cliente}}\n📍 *Entrega:* {{entrega}}\n💵 *Pago:* {{pago}}\n\n📝 *Pedido:*\n{{items}}\n\n💰 *Total a Pagar:* ${{total}}', 
    'Plantilla del mensaje de WhatsApp. Variables: {{id}}, {{fecha}}, {{cliente}}, {{entrega}}, {{pago}}, {{items}}, {{total}}'
)
ON CONFLICT (key) DO NOTHING;
