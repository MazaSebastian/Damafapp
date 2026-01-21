import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Use SERVICE_ROLE_KEY to bypass RLS and ensure we can read the order
        // This is critical for getting the correct price if the user lacks select permissions
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const { order_id } = await req.json()

        if (!order_id) {
            console.error('Missing order_id in request body')
            throw new Error('Missing order_id')
        }

        console.log(`Processing Order ID: ${order_id}`)

        // 1. Fetch Order details
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('id', order_id)
            .single()

        if (orderError || !order) {
            console.error('Order Fetch Error:', orderError)
            throw new Error('Order not found')
        }

        // 2. Prepare items for Mercado Pago
        console.log('Order Data:', JSON.stringify(order))

        // --- STRICT PRICE VALIDATION ---
        // Force conversion to number (Handle string "100.50", number 100.50, etc.)
        let safePrice = Number(order.total)

        // Validate: If it's NaN or <= 0, we have a problem.
        if (isNaN(safePrice) || safePrice <= 0) {
            console.error(`Invalid Price Detected: ${order.total} (Type: ${typeof order.total}). Defaulting to 1.0 for debugging/fallback.`)
            // Fallback to 1.0 to prevent MP crash, but log error loudly.
            safePrice = 1.0
        } else {
            console.log(`Valid Price: ${safePrice} (Type: ${typeof safePrice})`)
        }
        // --- STRICT PRICE VALIDATION END ---

        const items = [
            {
                id: "order-total",
                title: `Pedido DamafAPP`,
                quantity: 1,
                currency_id: 'ARS',
                unit_price: safePrice // Guaranteed to be a number
            }
        ];

        // 3. Create Preference in Mercado Pago
        const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
        if (!mpAccessToken) {
            console.error('MP_ACCESS_TOKEN is not set')
            throw new Error('Server configuration error: Missing MP Token')
        }

        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://damafapp.vercel.app'

        const preferenceData = {
            items: items,
            back_urls: {
                success: `${frontendUrl}/my-orders?status=approved`,
                failure: `${frontendUrl}/checkout?status=failure`,
                pending: `${frontendUrl}/my-orders?status=pending`
            },
            auto_return: "approved",
            external_reference: order_id,
            statement_descriptor: "DAMAFAPP"
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

        // 4. Update Order with Preference ID
        await supabaseClient
            .from('orders')
            .update({ mercadopago_preference_id: mpData.id })
            .eq('id', order_id)

        // 5. Return init_point
        return new Response(
            JSON.stringify({
                init_point: mpData.init_point,
                preference_id: mpData.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        // Log the full error to Supabase Dashboard Logs
        console.error('CRITIAL ERROR IN EDGE FUNCTION:', error)

        return new Response(
            JSON.stringify({
                error: error.message || 'Error interno desconocido',
                details: error.toString()
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
