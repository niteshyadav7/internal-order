import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK (server-side only)
function getAdminApp() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  // 1. Try service account JSON key from env var directly (best for serverless / Vercel)
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      return initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (e: any) {
      console.error('Firebase Admin SDK: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env var:', e.message);
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
        return initializeApp({
          credential: cert(serviceAccount),
        });
      } else {
        console.warn(`Firebase Admin SDK: Service account file not found at: ${resolvedPath}. Falling back...`);
      }
    } catch (e: any) {
      console.error(`Firebase Admin SDK: Error loading service account from file path ${serviceAccountPath}:`, e.message);
    }
  }

  // 3. Fallback: try GOOGLE_APPLICATION_CREDENTIALS env var (auto-detected by SDK)
  // or use project ID with default credentials
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (projectId) {
    try {
      return initializeApp({
        projectId,
      });
    } catch (e: any) {
      console.error('Firebase Admin SDK: Failed to initialize with projectId:', e.message);
    }
  }

  // 4. Ultimate fallback to prevent module loading crash
  console.error('Firebase Admin SDK: No credentials configured. Initializing with mock credentials to prevent module import crash.');
  try {
    return initializeApp({
      projectId: 'mock-project-id'
    });
  } catch (e: any) {
    const currentApps = getApps();
    if (currentApps.length > 0) {
      return currentApps[0]!;
    }
    throw e;
  }
}

export const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
