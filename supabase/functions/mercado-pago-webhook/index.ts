import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        const url = new URL(req.url)

        // 1. Parse notification type
        const topic = url.searchParams.get('topic') || url.searchParams.get('type')
        const paymentId = url.searchParams.get('id') || url.searchParams.get('data.id')

        console.log(`Webhook Received: Topic=${topic}, ID=${paymentId}`)

        // Only process payments
        if (topic !== 'payment' || !paymentId) {
            return new Response(JSON.stringify({ message: "Ignored non-payment notification" }), { status: 200 })
        }

        // 2. Setup Supabase Admin Client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 3. We need to figure out WHICH tenant's access token to use.
        // Strategy: Try to get the payment info with the order's external_reference first,
        // then look up the tenant from the order, then use that tenant's MP credentials.

        // But IPN doesn't tell us the order_id upfront — only the payment_id.
        // We need to try ALL active MP credentials to find the right one.
        // Optimization: In practice, there are very few tenants, so this is fast.

        const { data: allCreds } = await supabase
            .from('mp_credentials')
            .select('tenant_id, access_token')
            .eq('is_active', true)

        if (!allCreds || allCreds.length === 0) {
            console.error("No active MP credentials found")
            return new Response("No credentials", { status: 200 })
        }

        // Try each tenant's token to fetch the payment
        let paymentData = null
        let matchedTenantId = null
        let matchedAccessToken = null

        for (const creds of allCreds) {
            try {
                const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: { 'Authorization': `Bearer ${creds.access_token}` }
                })

                if (mpResponse.ok) {
                    paymentData = await mpResponse.json()
                    matchedTenantId = creds.tenant_id
                    matchedAccessToken = creds.access_token
                    console.log(`Payment found with tenant: ${matchedTenantId}`)
                    break
                }
            } catch (e) {
                // Try next tenant
                continue
            }
        }

        if (!paymentData) {
            console.error("Could not find payment with any tenant's credentials")
            return new Response("Payment not found", { status: 200 })
        }

        console.log("Payment Status:", paymentData.status)

        // 4. Update Order
        const orderId = paymentData.external_reference

        if (!orderId) {
            console.error("No external_reference found in payment")
            return new Response("No order ID found", { status: 200 })
        }

        const status = paymentData.status
        const updateData: any = {
            payment_id: String(paymentId),
            payment_status: status,
            last_updated: new Date().toISOString()
        }

        if (status === 'approved') {
            updateData.status = 'paid'
        } else if (status === 'cancelled' || status === 'rejected') {
            updateData.status = 'cancelled'
        }

        const { data: order, error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId)
            .select()
            .single()

        if (updateError) {
            console.error("Error updating order:", updateError)
            throw updateError
        }

        // 5. Award Loyalty Stars (If Approved)
        if (status === 'approved' && order && !order.stars_awarded && order.user_id) {
            const amount = Number(order.total) || 0
            const starsToAward = Math.floor(amount)

            if (starsToAward > 0) {
                console.log(`Awarding ${starsToAward} stars to user ${order.user_id}`)

                const { error: rpcError } = await supabase
                    .rpc('award_stars', {
                        user_id: order.user_id,
                        stars_count: starsToAward
                    })

                if (!rpcError) {
                    await supabase
                        .from('orders')
                        .update({ stars_awarded: true })
                        .eq('id', orderId)
                } else {
                    console.error("Error awarding stars:", rpcError)
                }
            }
        }

        return new Response(JSON.stringify({ message: "Webhook processed successfully" }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        })

    } catch (error) {
        console.error("Webhook Error:", error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        })
    }
})
