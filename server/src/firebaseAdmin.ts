/**
 * BiznesYordam - Firebase Admin SDK Initialization
 * Authoritative connection to Firestore Named Database and Auth
 * Secrets are loaded strictly from Render environment variables
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import dotenv from 'dotenv';

dotenv.config();

export const NAMED_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID ||
  'ai-studio-biznesyordam-e0d6389f-9af4-4469-a3e0-1826035a54fd';

export const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0498548617';

let app: App;
let adminAuth: Auth;
let adminDb: Firestore;
let isFirebaseAdminInitialized = false;

try {
  if (getApps().length === 0) {
    let credential;

    // Option A: Single JSON string stored in Render environment secret
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const parsedKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = cert(parsedKey);
      } catch (parseErr) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', parseErr);
      }
    }

    // Option B: Individual environment variables (mobile phone friendly)
    if (!credential && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = cert({
        projectId: PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines with actual newlines
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    }

    if (credential) {
      app = initializeApp({
        credential,
        projectId: PROJECT_ID,
      });
      isFirebaseAdminInitialized = true;
    } else {
      // Fallback: Default initialization (e.g. for local testing or GCP ADC)
      console.warn(
        '⚠️ Warning: No explicit Firebase Admin credentials found in environment. Initializing default app.'
      );
      app = initializeApp({
        projectId: PROJECT_ID,
      });
      isFirebaseAdminInitialized = false;
    }
  } else {
    app = getApps()[0];
    isFirebaseAdminInitialized = true;
  }

  adminAuth = getAuth(app);
  // CRITICAL: Must target the named Firestore database
  adminDb = getFirestore(app, NAMED_DATABASE_ID);
} catch (error) {
  console.error('Fatal Firebase Admin initialization error:', error);
  isFirebaseAdminInitialized = false;
}

export { app, adminAuth, adminDb, isFirebaseAdminInitialized };
