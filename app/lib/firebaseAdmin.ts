import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK (server-side only)
function getAdminApp() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  // Try service account file path first
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(serviceAccountPath.startsWith('.')
      ? require('path').resolve(process.cwd(), serviceAccountPath)
      : serviceAccountPath
    );
    return initializeApp({
      credential: cert(serviceAccount),
    });
  }

  // Fallback: try GOOGLE_APPLICATION_CREDENTIALS env var (auto-detected by SDK)
  // or use project ID with default credentials
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (projectId) {
    return initializeApp({
      projectId,
    });
  }

  throw new Error('Firebase Admin SDK: No service account credentials configured. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env.local');
}

export const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
