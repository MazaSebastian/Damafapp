import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { supabase } from '../supabaseClient';

// Configuration from Environment Variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase (Safeguarded)
let app;
let messaging;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined") {
    try {
        app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);
    } catch (error) {
        console.warn('Firebase init failed (likely missing config):', error);
    }
} else {
    console.warn('Firebase config missing. FCM disabled.');
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Request FCM token and save to push_subscriptions (multi-tenant)
 * Falls back to profiles.fcm_token (legacy) as a safety net.
 *
 * @param {string} userId - auth.uid()
 * @param {string} tenantId - current tenant UUID
 */
export const requestForToken = async (userId, tenantId) => {
    console.log('requestForToken called:', { userId, tenantId });

    if (!userId) {
        return { token: null, error: 'missing_user_id' };
    }

    try {
        if (!('Notification' in window)) {
            return { token: null, error: 'unsupported_browser' };
        }

        if (!messaging) {
            return { token: null, error: 'missing_config' };
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            try {
                const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
                if (currentToken) {
                    console.log('FCM Token generated:', currentToken.substring(0, 20) + '...');

                    // Save to push_subscriptions (multi-tenant)
                    const { success, error } = await saveTokenToDatabase(currentToken, userId, tenantId);

                    if (!success) {
                        const errorMsg = error?.message || JSON.stringify(error) || 'Unknown DB Error';
                        console.error('DB Save Failed:', errorMsg);
                        return { token: null, error: 'db_save_error: ' + errorMsg };
                    }

                    return { token: currentToken, error: null };
                } else {
                    return { token: null, error: 'no_token' };
                }
            } catch (tokenError) {
                console.error('Error getting token:', tokenError);
                return { token: null, error: 'token_error: ' + tokenError.message };
            }
        } else {
            return { token: null, error: 'permission_denied' };
        }
    } catch (err) {
        console.log('Error retrieving token:', err);
        return { token: null, error: 'unknown_error: ' + err.message };
    }
};

/**
 * Save FCM token to push_subscriptions table (multi-tenant)
 * Also updates legacy profiles.fcm_token for backward compatibility
 */
const saveTokenToDatabase = async (token, userId, tenantId) => {
    try {
        // 1. Upsert into push_subscriptions (new multi-tenant table)
        if (tenantId) {
            const deviceInfo = {
                platform: 'web',
                browser: navigator.userAgent.includes('Chrome') ? 'Chrome' :
                    navigator.userAgent.includes('Firefox') ? 'Firefox' :
                        navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown',
                screen: `${window.screen.width}x${window.screen.height}`,
            };

            const { error: upsertError } = await supabase
                .from('push_subscriptions')
                .upsert({
                    fcm_token: token,
                    user_id: userId,
                    tenant_id: tenantId,
                    device_info: deviceInfo,
                    is_active: true,
                    last_seen_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'fcm_token' });

            if (upsertError) {
                console.error('push_subscriptions upsert error:', upsertError);
                // Don't fail — try legacy fallback
            } else {
                console.log('FCM Token saved to push_subscriptions (tenant:', tenantId, ')');
            }
        }

        // 2. Legacy: also update profiles.fcm_token (backward compat)
        const { data, error } = await supabase
            .from('profiles')
            .update({ fcm_token: token })
            .eq('id', userId)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            console.warn('Profile not found for FCM token save, ID:', userId);
            // If push_subscriptions worked, still return success
            if (tenantId) return { success: true };
            return { success: false, error: { message: 'Profile not found' } };
        }

        console.log('FCM Token saved to profile (legacy)');
        return { success: true };
    } catch (error) {
        console.error('Error saving FCM token:', error);
        return { success: false, error };
    }
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        if (!messaging) return;
        onMessage(messaging, (payload) => {
            console.log("Message received. ", payload);
            resolve(payload);
        });
    });
