import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK dynamically (server-side only)
let cachedAdminApp: any = null;

export function getAdminApp() {
  const apps = getApps();
  if (apps.length > 0) {
    cachedAdminApp = apps[0]!;
    return cachedAdminApp;
  }

  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  // 1. Try service account JSON key from env var directly (best for serverless / Vercel)
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      cachedAdminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      return cachedAdminApp;
    } catch (e: any) {
      console.error('Firebase Admin SDK: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env var:', e.message);
      throw new Error(`Firebase Admin SDK: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env var: ${e.message}`);
    }
  }

  // 2. Try service account file path
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    try {
      const resolvedPath = serviceAccountPath.startsWith('.')
        ? path.resolve(process.cwd(), serviceAccountPath)
        : serviceAccountPath;
      
      if (fs.existsSync(resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        const serviceAccount = JSON.parse(fileContent);
        cachedAdminApp = initializeApp({
          credential: cert(serviceAccount),
        });
        return cachedAdminApp;
      } else {
        console.warn(`Firebase Admin SDK: Service account file not found at: ${resolvedPath}.`);
      }
    } catch (e: any) {
      console.error(`Firebase Admin SDK: Error loading service account from file path ${serviceAccountPath}:`, e.message);
      throw new Error(`Firebase Admin SDK: Error loading service account from file path: ${e.message}`);
    }
  }

  // 3. Fallback: try GOOGLE_APPLICATION_CREDENTIALS env var (auto-detected by SDK)
  // or use project ID with default credentials
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (projectId) {
    try {
      cachedAdminApp = initializeApp({
        projectId,
      });
      return cachedAdminApp;
    } catch (e: any) {
      console.error('Firebase Admin SDK: Failed to initialize with projectId:', e.message);
      throw new Error(`Firebase Admin SDK: Failed to initialize with projectId: ${e.message}`);
    }
  }

  // 4. Ultimate fallback to prevent module loading crash during Next.js build trace phase
  // If we are in build/ci environment, return a mock app to prevent trace phase failure
  if (process.env.NODE_ENV === 'production' && !serviceAccountKey) {
    console.warn('Firebase Admin SDK: No credentials configured. Initializing with mock credentials for static trace.');
    try {
      cachedAdminApp = initializeApp({
        projectId: 'mock-project-id'
      });
      return cachedAdminApp;
    } catch (e: any) {
      const currentApps = getApps();
      if (currentApps.length > 0) {
        return currentApps[0]!;
      }
      throw e;
    }
  }

  throw new Error("Firebase Admin SDK: No credentials configured (neither FIREBASE_SERVICE_ACCOUNT_KEY nor FIREBASE_SERVICE_ACCOUNT_PATH).");
}

export function getAdminAuth() {
  const app = getAdminApp();
  return getAuth(app);
}

export function getAdminDb() {
  const app = getAdminApp();
  return getFirestore(app);
}

// Keep legacy static exports for backwards compatibility (but initialized dynamically when imported)
export const adminApp = getApps().length > 0 ? getApps()[0]! : null;
export const adminAuth = adminApp ? getAuth(adminApp) : null;
export const adminDb = adminApp ? getFirestore(adminApp) : null;
