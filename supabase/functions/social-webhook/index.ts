import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Social Webhook Function — Multi-tenant")

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)

    // ──────────────────────────────────────
    // GET: Webhook Verification (Hub Challenge)
    // ──────────────────────────────────────
    if (req.method === 'GET') {
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        if (mode && token) {
            // Try to find a tenant with this verify token
            const { data: creds } = await supabaseClient
                .from('meta_credentials')
                .select('tenant_id, wa_webhook_verify_token')
                .eq('wa_webhook_verify_token', token)
                .single()

            // Fallback: check legacy app_settings
            let isValid = !!creds

            if (!isValid) {
                const { data: setting } = await supabaseClient
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'instagram_verify_token')
                    .single()
                isValid = setting?.value === token
            }

            if (mode === 'subscribe' && isValid) {
                console.log('WEBHOOK_VERIFIED')
                return new Response(challenge, { status: 200 })
            } else {
                return new Response('Forbidden', { status: 403 })
            }
        }
        return new Response('Bad Request', { status: 400 })
    }

    // ──────────────────────────────────────
    // POST: Event Handling (Incoming Messages)
    // ──────────────────────────────────────
    if (req.method === 'POST') {
        try {
            const body = await req.json()
            console.log('Webhook Body:', JSON.stringify(body))

            if (body.object === 'instagram' || body.object === 'page') {
                for (const entry of body.entry) {
                    if (entry.messaging) {
                        for (const event of entry.messaging) {
                            await processMessageEvent(supabaseClient, event, 'instagram')
                        }
                    }
                }
                return new Response('EVENT_RECEIVED', { status: 200 })
            }

            // WhatsApp webhook
            if (body.object === 'whatsapp_business_account') {
                for (const entry of body.entry) {
                    const changes = entry.changes || []
                    for (const change of changes) {
                        if (change.field === 'messages') {
                            const value = change.value
                            const phoneNumberId = value.metadata?.phone_number_id

                            // Resolve tenant by phone_number_id
                            let tenantId = null
                            if (phoneNumberId) {
                                const { data: creds } = await supabaseClient
                                    .from('meta_credentials')
                                    .select('tenant_id')
                                    .eq('wa_phone_number_id', phoneNumberId)
                                    .single()
                                tenantId = creds?.tenant_id
                            }

                            for (const msg of (value.messages || [])) {
                                await supabaseClient.from('social_messages').insert({
                                    tenant_id: tenantId,
                                    platform: 'whatsapp',
                                    external_id: msg.id,
                                    sender_id: msg.from,
                                    recipient_id: phoneNumberId,
                                    message_text: msg.text?.body || '',
                                    direction: 'incoming',
                                    status: 'received',
                                    raw_data: msg
                                })
                            }
                        }
                    }
                }
                return new Response('EVENT_RECEIVED', { status: 200 })
            }

            return new Response('Not Found', { status: 404 })

        } catch (error) {
            console.error('Error processing webhook:', error)
            return new Response('Internal Server Error', { status: 500 })
        }
    }

    return new Response('Method Not Allowed', { status: 405 })
})

async function processMessageEvent(supabase: any, event: any, platform: string) {
    if (event.message && !event.message.is_echo) {
        const senderId = event.sender.id
        const recipientId = event.recipient.id
        const messageText = event.message.text
        const messageId = event.message.mid
        const mediaUrl = event.message.attachments?.[0]?.payload?.url || null

        // Try to resolve tenant by IG account ID
        let tenantId = null
        const { data: creds } = await supabase
            .from('meta_credentials')
            .select('tenant_id')
            .eq('ig_account_id', recipientId)
            .single()
        if (creds) tenantId = creds.tenant_id

        console.log(`MSG from ${senderId} (tenant: ${tenantId}): ${messageText}`)

        const { error } = await supabase.from('social_messages').insert({
            tenant_id: tenantId,
            platform,
            external_id: messageId,
            sender_id: senderId,
            recipient_id: recipientId,
            message_text: messageText,
            media_url: mediaUrl,
            direction: 'incoming',
            status: 'received',
            raw_data: event
        })

        if (error) console.error('Error saving message:', error)
    }
}
