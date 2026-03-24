import { supabase } from '../supabaseClient';
import { initMercadoPago as initMPSDK } from '@mercadopago/sdk-react';

/**
 * Fetch MercadoPago Public Key for the current tenant.
 * Tries mp_credentials table first (new multi-tenant),
 * falls back to app_settings (legacy).
 */
export const getMercadoPagoPublicKey = async (tenantId) => {
    try {
        // 1. Try mp_credentials table (multi-tenant)
        if (tenantId) {
            const { data: creds } = await supabase
                .from('mp_credentials')
                .select('public_key')
                .eq('tenant_id', tenantId)
                .eq('is_active', true)
                .maybeSingle();

            if (creds?.public_key) return creds.public_key;
        }

        // 2. Fallback: app_settings (legacy)
        const { data: setting } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'mp_public_key')
            .maybeSingle();

        return setting?.value || null;
    } catch (error) {
        console.error('Error fetching MP Public Key:', error);
        return null;
    }
};

/**
 * Initialize MercadoPago SDK with the tenant's public key.
 * @param {string} tenantId — UUID of the current tenant
 */
export const initMercadoPago = async (tenantId) => {
    const key = await getMercadoPagoPublicKey(tenantId);
    if (key) {
        console.log('Initializing Mercado Pago with tenant key...');
        initMPSDK(key);
    } else {
        console.warn('MercadoPago Public Key missing. Payment components may fail.');
    }
};
