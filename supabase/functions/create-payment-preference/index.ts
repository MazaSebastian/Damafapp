// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions/quickstart

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Replace with your Access Token from: https://www.mercadopago.com/developers/panel
const MP_ACCESS_TOKEN = 'TEST-00000000-0000-0000-0000-000000000000'; // PLACEHOLDER

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS for options request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { items, orderId, payerEmail } = await req.json()

        if (!items || !orderId) {
            throw new Error('Missing items or orderId')
        }

        // Format items for Mercado Pago
        // MP expects: { title, quantity, unit_price, currency_id: 'ARS' }
        const mpItems = items.map((item: any) => ({
            title: item.title,
            quantity: item.quantity,
            currency_id: 'ARS', // Change if needed (USD, etc)
            unit_price: Number(item.unit_price)
        }))

        const preferenceData = {
            items: mpItems,
            external_reference: orderId, // We link the MP preference to our Supabase Order ID
            payer: {
                email: payerEmail || 'test_user@test.com'
            },
            auto_return: 'approved',
            back_urls: {
                success: 'https://damafapp.vercel.app/checkout/success', // Update with your real URL
                failure: 'https://damafapp.vercel.app/checkout/failure',
                pending: 'https://damafapp.vercel.app/checkout/pending'
            }
        }

        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
            },
            body: JSON.stringify(preferenceData)
        })

        const data = await response.json()

        if (data.error) {
            throw new Error(data.message || 'Error creating preference')
        }

        return new Response(
            JSON.stringify({ preferenceId: data.id, init_point: data.init_point }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
