import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { order_id } = await req.json()

        if (!order_id) throw new Error('Missing order_id')

        console.log(`Processing Order ID: ${order_id}`)

        // 1. Fetch Order
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('id', order_id)
            .single()

        if (orderError || !order) {
            console.error('Order Fetch Error:', orderError)
            throw new Error('Order not found')
        }

        const tenantId = order.tenant_id
        if (!tenantId) throw new Error('Order has no tenant_id')

        // 2. Get MercadoPago credentials for THIS tenant
        const { data: mpCreds, error: mpCredsError } = await supabaseClient
            .from('mp_credentials')
            .select('access_token, public_key')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .single()

        if (mpCredsError || !mpCreds?.access_token) {
            console.error('MP Credentials Error:', mpCredsError)
            throw new Error('MercadoPago no configurado para este local. Configuralo en Integraciones.')
        }

        const mpAccessToken = mpCreds.access_token

        // 3. Get tenant name for branding
        let tenantName = 'Stacked'
        const { data: tenant } = await supabaseClient
            .from('tenants')
            .select('name, slug')
            .eq('id', tenantId)
            .single()
        if (tenant?.name) tenantName = tenant.name
        const tenantSlug = tenant?.slug || ''

        // 4. Price validation
        let safePrice = Number(order.total)
        if (isNaN(safePrice) || safePrice <= 0) {
            console.error(`Invalid Price: ${order.total}`)
            safePrice = 1.0
        }

        const items = [{
            id: "order-total",
            title: `Pedido ${tenantName}`,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: safePrice
        }]

        // 5. Create Preference
        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://stacked.com'
        const basePath = tenantSlug ? `/${tenantSlug}` : ''

        const preferenceData = {
            items,
            back_urls: {
                success: `${frontendUrl}${basePath}/my-orders?status=approved`,
                failure: `${frontendUrl}${basePath}/checkout?status=failure`,
                pending: `${frontendUrl}${basePath}/my-orders?status=pending`
            },
            auto_return: "approved",
            external_reference: order_id,
            // Encode tenant_id in metadata so webhook can resolve it
            metadata: { tenant_id: tenantId },
            statement_descriptor: tenantName.substring(0, 22).toUpperCase()
        }

        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mpAccessToken}`
            },
            body: JSON.stringify(preferenceData)
        })

        const mpData = await mpResponse.json()

        if (!mpResponse.ok) {
            console.error('Mercado Pago Error:', mpData)
            throw new Error(`Mercado Pago API Error: ${mpData.message || 'Unknown'}`)
        }

        // 6. Update Order with Preference ID
        await supabaseClient
            .from('orders')
            .update({ mercadopago_preference_id: mpData.id })
            .eq('id', order_id)

        // 7. Return init_point
        return new Response(
            JSON.stringify({ init_point: mpData.init_point, preference_id: mpData.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('CRITICAL ERROR:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Error interno', details: error.toString() }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
