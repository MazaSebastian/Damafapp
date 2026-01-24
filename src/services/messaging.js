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

// VAPID Key from Console -> Project Settings -> Cloud Messaging -> Web Configuration
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const requestForToken = async (userId) => {
    try {
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notification');
            return { token: null, error: 'unsupported_browser' };
        }

        if (!messaging) {
            console.warn('Messaging not initialized. Check Env Vars.');
            return { token: null, error: 'missing_config' };
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            try {
                const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
                if (currentToken) {
                    console.log('FCM Token:', currentToken);
                    if (userId) {
                        await saveTokenToDatabase(currentToken, userId);
                    }
                    return { token: currentToken, error: null };
                } else {
                    console.log('No registration token available.');
                    return { token: null, error: 'no_token' };
                }
            } catch (tokenError) {
                console.error('Error getting token:', tokenError);
                return { token: null, error: 'token_error: ' + tokenError.message };
            }
        } else {
            console.log('Notification permission denied.');
            return { token: null, error: 'permission_denied' };
        }
    } catch (err) {
        console.log('An error occurred while retrieving token. ', err);
        return { token: null, error: 'unknown_error: ' + err.message };
    }
};

const saveTokenToDatabase = async (token, userId) => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: token })
            .eq('id', userId);

        if (error) throw error;
        console.log('FCM Token saved to profile');
    } catch (error) {
        console.error('Error saving FCM token to DB:', error);
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
