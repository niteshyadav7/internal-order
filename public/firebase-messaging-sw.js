// Firebase Cloud Messaging Background Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase compat app inside service worker
// Default config container (handles background push notifications)
try {
  firebase.initializeApp({
    apiKey: "PLACEHOLDER",
    authDomain: "PLACEHOLDER",
    projectId: "PLACEHOLDER",
    storageBucket: "PLACEHOLDER",
    messagingSenderId: "PLACEHOLDER",
    appId: "PLACEHOLDER"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message: ', payload);
    const notificationTitle = payload.notification?.title || '🚨 New Order Alert!';
    const notificationOptions = {
      body: payload.notification?.body || 'A new order has been received.',
      icon: '/icon.png',
      badge: '/icon.png',
      data: payload.data || {},
      tag: 'order-notification-' + Date.now(),
      renotify: true
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.warn('[firebase-messaging-sw.js] Init warning:', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/salesman') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/salesman');
      }
    })
  );
});
