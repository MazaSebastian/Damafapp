// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Configuration from .env (Hardcoded here because SW has no access to Vite env vars at runtime)
const firebaseConfig = {
    apiKey: "AIzaSyDsA4genzkrB5woNu4GoBcaDjCHC0qer3w",
    authDomain: "damafapp-8c839.firebaseapp.com",
    projectId: "damafapp-8c839",
    storageBucket: "damafapp-8c839.firebasestorage.app",
    messagingSenderId: "624716664875",
    appId: "1:624716664875:web:4b63dea006be9d1e4a5a6e",
    measurementId: "G-5DM78R91PB"
};

// Initialize Firebase
if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.image || '/logo-damaf.png',
        image: payload.notification.image,
        // Customize vibration/badge here if needed
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
