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
        if (!messaging) return null;
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (currentToken) {
                console.log('FCM Token:', currentToken);
                // Save token to database
                if (userId) {
                    await saveTokenToDatabase(currentToken, userId);
                }
                return currentToken;
            } else {
                console.log('No registration token available. Request permission to generate one.');
                return null;
            }
        } else {
            console.log('Notification permission denied.');
            return null;
        }
    } catch (err) {
        console.log('An error occurred while retrieving token. ', err);
        return null;
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
