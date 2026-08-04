import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './db';

// Request notification permission and get FCM registration token
export async function requestNotificationPermissionAndGetToken(uid: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const supported = await isSupported();
    if (!supported || !app || !db) {
      console.log('FCM Messaging is not supported in this browser environment.');
      return null;
    }

    // Request browser notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission not granted by user.');
      return null;
    }

    const messaging = getMessaging(app);

    // Register service worker if not already registered
    let swRegistration: ServiceWorkerRegistration | undefined = undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      } catch (swErr) {
        console.warn('Service worker registration warning:', swErr);
      }
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: swRegistration
    });

    if (token && uid) {
      // Save FCM token under user's profile in Firestore (arrayUnion prevents duplicates)
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token)
      });
      console.log('FCM Token successfully registered & saved for salesman:', uid);
      return token;
    }

    return null;
  } catch (error) {
    console.warn('FCM Token generation warning:', error);
    return null;
  }
}
