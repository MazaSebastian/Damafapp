import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Social Send Message Function — Multi-tenant")

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
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { tenant_id, recipient_id, message_text, platform = 'instagram' } = await req.json()

        if (!tenant_id || !recipient_id || !message_text) {
            throw new Error('Missing tenant_id, recipient_id, or message_text')
        }

        // 1. Get Meta credentials for this tenant
        const { data: creds } = await supabaseClient
            .from('meta_credentials')
            .select('*')
            .eq('tenant_id', tenant_id)
            .single()

        if (!creds) throw new Error('Meta no configurado para este local')

        let accessToken: string | null = null

        if (platform === 'whatsapp') {
            if (!creds.wa_enabled || !creds.wa_access_token || !creds.wa_phone_number_id) {
                throw new Error('WhatsApp no configurado o desactivado')
            }
            accessToken = creds.wa_access_token

            // WhatsApp Cloud API
            const waUrl = `https://graph.facebook.com/v18.0/${creds.wa_phone_number_id}/messages`
            const waPayload = {
                messaging_product: "whatsapp",
                to: recipient_id,  // Phone number with country code (e.g. 5491112345678)
                type: "text",
                text: { body: message_text }
            }

            const waResponse = await fetch(waUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(waPayload)
            })

            const waData = await waResponse.json()

            if (!waResponse.ok) {
                console.error('WhatsApp API Error:', waData)
                throw new Error(`WhatsApp Error: ${waData.error?.message || 'Unknown'}`)
            }

            // Save to DB
            await supabaseClient.from('social_messages').insert({
                tenant_id,
                platform: 'whatsapp',
                external_id: waData.messages?.[0]?.id,
                sender_id: creds.wa_phone_number_id,
                recipient_id,
                message_text,
                direction: 'outgoing',
                status: 'sent',
                raw_data: waData
            })

            return new Response(
                JSON.stringify({ success: true, message_id: waData.messages?.[0]?.id }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

        } else {
            // Instagram DM via Graph API
            if (!creds.ig_enabled || !creds.ig_page_access_token) {
                throw new Error('Instagram no configurado o desactivado')
            }
            accessToken = creds.ig_page_access_token

            const igUrl = `https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`
            const igPayload = {
                recipient: { id: recipient_id },
                message: { text: message_text }
            }

            const igResponse = await fetch(igUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(igPayload)
            })

            const igData = await igResponse.json()

            if (!igResponse.ok) {
                console.error('Meta IG API Error:', igData)
                throw new Error(`Meta API Error: ${igData.error?.message || 'Unknown'}`)
            }

            await supabaseClient.from('social_messages').insert({
                tenant_id,
                platform: 'instagram',
                external_id: igData.message_id,
                sender_id: 'me',
                recipient_id,
                message_text,
                direction: 'outgoing',
                status: 'replied',
                raw_data: igData
            })

            return new Response(
                JSON.stringify({ success: true, message_id: igData.message_id }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

    } catch (error: any) {
        console.error('Error sending message:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
