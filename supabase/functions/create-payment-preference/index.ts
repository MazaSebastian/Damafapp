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
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { order_id } = await req.json()

        if (!order_id) {
            throw new Error('Missing order_id')
        }

        // 1. Fetch Order details from Database (Security Best Practice: Don't trust frontend prices)
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select('*, order_items(*, products(*))')
            .eq('id', order_id)
            .single()

        if (orderError || !order) {
            throw new Error('Order not found')
        }

        // 2. Prepare items for Mercado Pago
        const items = order.order_items.map((item: any) => ({
            id: item.product_id,
            title: item.products.name,
            quantity: item.quantity,
            currency_id: 'ARS', // Argentina Peso
            unit_price: Number(item.price)
        }))

        // 3. Create Preference in Mercado Pago
        const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
        if (!mpAccessToken) {
            console.error('MP_ACCESS_TOKEN is not set')
            throw new Error('Server configuration error: Missing MP Token')
        }

        const preferenceData = {
            items: items,
            back_urls: {
                success: "https://damafapp.vercel.app/my-orders?status=approved", // Update with your domain
                failure: "https://damafapp.vercel.app/checkout?status=failure",
                pending: "https://damafapp.vercel.app/my-orders?status=pending"
            },
            auto_return: "approved",
            external_reference: order_id, // Link MP payment to our Order ID
            statement_descriptor: "DAMAFAPP",
            payer: {
                // Optional: Pre-fill user info if available in 'profiles'
                // email: ...
            }
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

        // 4. Update Order with Preference ID (Optional but useful)
        await supabaseClient
            .from('orders')
            .update({ mercadopago_preference_id: mpData.id })
            .eq('id', order_id)

        // 5. Return init_point (Checkout URL) and preference_id
        return new Response(
            JSON.stringify({
                init_point: mpData.init_point, // For production (or sandbox_init_point if testing)
                preference_id: mpData.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error(error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
