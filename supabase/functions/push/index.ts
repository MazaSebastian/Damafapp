
// supabase/functions/push/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1. Get Service Account from Env Var (Secure)
// 1. Get Service Account from Env Var (Secure)
const getServiceAccount = () => {
    try {
        const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
        if (!serviceAccountStr) {
            console.error("Missing FIREBASE_SERVICE_ACCOUNT");
            return null;
        }

        let serviceAccount;
        try {
            serviceAccount = JSON.parse(serviceAccountStr);
        } catch (jsonError) {
            console.error("JSON Parse Error of Service Account:", jsonError.message);
            // Attempt to fix common copy-paste issue (extra quotes)
            try {
                if (serviceAccountStr.startsWith("'") || serviceAccountStr.startsWith('"')) {
                    const clean = serviceAccountStr.slice(1, -1);
                    serviceAccount = JSON.parse(clean);
                } else {
                    throw jsonError;
                }
            } catch (e) {
                throw new Error("Invalid JSON in FIREBASE_SERVICE_ACCOUNT: " + jsonError.message);
            }
        }

        // Fix Private Key newlines if they are literal "\n"
        if (serviceAccount.private_key && serviceAccount.private_key.includes("\\n")) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
        }

        return serviceAccount;
    } catch (e) {
        console.error("Error parsing service account:", e);
        throw e; // Re-throw to be caught in main handler
    }
};

// 2. Generate Access Token specifically for Firebase Cloud Messaging
const getAccessToken = async ({ client_email, private_key }: any) => {
    const alg = "RS256";
    const pk = await jose.importPKCS8(private_key, alg);

    const jwt = await new jose.SignJWT({
        iss: client_email,
        sub: client_email,
        aud: "https://oauth2.googleapis.com/token",
        scope: "https://www.googleapis.com/auth/firebase.messaging",
    })
        .setProtectedHeader({ alg, typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(pk);

    return jwt;
};

// 3. Exchange JWT for Google Access Token (OAuth2)
const getGoogleAccessToken = async (jwt: string) => {
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    });
    const data = await res.json();
    return data.access_token;
};

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        let serviceAccount;
        try {
            serviceAccount = getServiceAccount();
        } catch (secretError) {
            return new Response(JSON.stringify({ error: "Secret Configuration Error", details: secretError.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!serviceAccount) {
            throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env var (Check Supabase Dashboard > Settings > Edge Functions)");
        }

        // Parse Request
        const { userId, token: explicitToken, title, body, openUrl } = await req.json();

        if ((!userId && !explicitToken) || !title || !body) {
            return new Response(JSON.stringify({ error: "Missing required fields (userId or token, title, body)" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Initialize Supabase Client
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        // --- SECURITY CHECK (Manual Verification) ---
        // We do this manually so we can deploy with --no-verify-jwt and bypass Gateway 401 issues
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Authorization Header" }), { status: 401, headers: corsHeaders });
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401, headers: corsHeaders });
        }

        // Check Role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'owner')) {
            return new Response(JSON.stringify({ error: "Unauthorized: Admin Only" }), { status: 403, headers: corsHeaders });
        }
        // ---------------------------------------------


        let targetToken = explicitToken;

        // If no explicit token, look it up via userId
        if (!targetToken && userId) {
            // Get FCM Token from DB
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("fcm_token")
                .eq("id", userId)
                .single();

            if (profileError || !profile?.fcm_token) {
                console.error("Profile/Token error:", profileError);
                return new Response(JSON.stringify({ error: "User has no FCM Token" }), {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            targetToken = profile.fcm_token;
        }

        // Authenticate with Google
        const jwt = await getAccessToken(serviceAccount);
        const googleToken = await getGoogleAccessToken(jwt);

        // Send Notification via HTTP v1 API
        const projectId = serviceAccount.project_id;
        const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

        const message = {
            message: {
                token: targetToken,
                notification: {
                    title: title,
                    body: body,
                    image: 'https://damafapp-six.vercel.app/logo-damaf.png'
                },
                data: {
                    url: openUrl || "/", // Custom data for redirection
                },
                webpush: {
                    fcm_options: {
                        link: openUrl || "/"
                    }
                }
            }
        };

        const fcmRes = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${googleToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        });

        const fcmData = await fcmRes.json();

        if (!fcmRes.ok) {
            console.error("FCM API Error:", fcmData);
            return new Response(JSON.stringify({ error: "FCM Error", details: fcmData }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ success: true, data: fcmData }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
