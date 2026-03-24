
// supabase/functions/push/index.ts — Multi-tenant FCM Push Notifications
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1. Get Service Account from Env Var
const getServiceAccount = () => {
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountStr) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env var");

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountStr);
    } catch {
        // Try removing wrapping quotes
        try {
            serviceAccount = JSON.parse(serviceAccountStr.slice(1, -1));
        } catch (e) {
            throw new Error("Invalid JSON in FIREBASE_SERVICE_ACCOUNT: " + e.message);
        }
    }

    if (serviceAccount.private_key?.includes("\\n")) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    return serviceAccount;
};

// 2. Generate signed JWT for FCM
const getAccessToken = async ({ client_email, private_key }: any) => {
    const pk = await jose.importPKCS8(private_key, "RS256");
    return await new jose.SignJWT({
        iss: client_email, sub: client_email,
        aud: "https://oauth2.googleapis.com/token",
        scope: "https://www.googleapis.com/auth/firebase.messaging",
    })
        .setProtectedHeader({ alg: "RS256", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(pk);
};

// 3. Exchange JWT for Google Access Token
const getGoogleAccessToken = async (jwt: string) => {
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    });
    const data = await res.json();
    return data.access_token;
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const serviceAccount = getServiceAccount();

        // Parse Request
        // Accepts: { tenant_id, userId?, token?, title, body, openUrl? }
        // If tenant_id provided → broadcast to all devices of that tenant (or specific userId)
        // If token provided → send to specific device
        const { tenant_id, userId, token: explicitToken, title, body, openUrl } = await req.json();

        if (!title || !body) {
            return new Response(JSON.stringify({ error: "Missing title or body" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Security: verify caller is admin/owner
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Authorization" }), { status: 401, headers: corsHeaders });
        }

        const authToken = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(authToken)
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401, headers: corsHeaders });
        }

        const { data: callerProfile } = await supabase
            .from('profiles')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single()

        if (!callerProfile || !['admin', 'owner'].includes(callerProfile.role)) {
            return new Response(JSON.stringify({ error: "Unauthorized: Admin Only" }), { status: 403, headers: corsHeaders });
        }

        // Resolve tenant_id from request or caller's profile
        const resolvedTenantId = tenant_id || callerProfile.tenant_id

        // Authenticate with Google
        const jwt = await getAccessToken(serviceAccount);
        const googleToken = await getGoogleAccessToken(jwt);
        const projectId = serviceAccount.project_id;
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

        // Get tenant logo for notification image
        let logoUrl = 'https://stacked.com/logo-stacked.png'
        if (resolvedTenantId) {
            const { data: t } = await supabase.from('tenants').select('logo_url').eq('id', resolvedTenantId).single()
            if (t?.logo_url) logoUrl = t.logo_url
        }

        // Determine target tokens
        let targetTokens: string[] = [];

        if (explicitToken) {
            targetTokens = [explicitToken];
        } else if (userId) {
            // Get tokens for specific user within tenant
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('fcm_token')
                .eq('user_id', userId)
                .eq('tenant_id', resolvedTenantId)
                .eq('is_active', true)

            targetTokens = subs?.map(s => s.fcm_token) || []

            // Fallback: check profiles.fcm_token (legacy)
            if (targetTokens.length === 0) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('fcm_token')
                    .eq('id', userId)
                    .single()
                if (profile?.fcm_token) targetTokens = [profile.fcm_token]
            }
        } else if (resolvedTenantId) {
            // Broadcast to ALL devices of this tenant
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('fcm_token')
                .eq('tenant_id', resolvedTenantId)
                .eq('is_active', true)

            targetTokens = subs?.map(s => s.fcm_token) || []
        }

        if (targetTokens.length === 0) {
            return new Response(JSON.stringify({ error: "No FCM tokens found", sent: 0 }), {
                status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Send to all tokens
        let successCount = 0
        let failCount = 0
        const staleTokens: string[] = []

        for (const fcmToken of targetTokens) {
            const message = {
                message: {
                    token: fcmToken,
                    notification: { title, body, image: logoUrl },
                    data: { url: openUrl || "/" },
                    webpush: { fcm_options: { link: openUrl || "/" } }
                }
            };

            const fcmRes = await fetch(fcmUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${googleToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(message),
            });

            if (fcmRes.ok) {
                successCount++
            } else {
                failCount++
                const errData = await fcmRes.json()
                // If token is invalid, mark as stale
                if (errData.error?.details?.[0]?.errorCode === 'UNREGISTERED') {
                    staleTokens.push(fcmToken)
                }
            }
        }

        // Cleanup stale tokens
        if (staleTokens.length > 0) {
            await supabase
                .from('push_subscriptions')
                .update({ is_active: false })
                .in('fcm_token', staleTokens)
            console.log(`Deactivated ${staleTokens.length} stale tokens`)
        }

        return new Response(JSON.stringify({
            success: true,
            sent: successCount,
            failed: failCount,
            cleaned: staleTokens.length
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Push Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
