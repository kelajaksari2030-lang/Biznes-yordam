/**
 * Firebase Authentication & Firestore Service for BiznesYordam
 * Fully configured with provisioned project and database
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  Firestore 
} from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';
import { emitError } from '../utils/errorBus';

// Import provisioned config directly from root as default fallback
import appletConfig from '../../firebase-applet-config.json';

// Helper to sanitize Vite environment variables and ignore empty/undefined strings
const getValidEnvStr = (val: unknown): string => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed && trimmed !== 'undefined' && trimmed !== 'null' && trimmed !== 'YOUR_API_KEY') {
      return trimmed;
    }
  }
  return '';
};

export const TARGET_PROJECT_ID = 'gen-lang-client-0498548617';
export const TARGET_DATABASE_ID = 'ai-studio-biznesyordam-e0d6389f-9af4-4469-a3e0-1826035a54fd';

const getMetaEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta && (import.meta as any).env) {
      return getValidEnvStr((import.meta as any).env[key]);
    }
  } catch {
    // Ignore in non-Vite ESM environments
  }
  return '';
};

// Support Vite environment variables for production deployments while locking Project and Database IDs
export const firebaseConfig = {
  apiKey: getMetaEnv('VITE_FIREBASE_API_KEY') || appletConfig.apiKey,
  authDomain: `${TARGET_PROJECT_ID}.firebaseapp.com`,
  projectId: TARGET_PROJECT_ID,
  appId: getMetaEnv('VITE_FIREBASE_APP_ID') || appletConfig.appId,
  firestoreDatabaseId: TARGET_DATABASE_ID,
  storageBucket: `${TARGET_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: getMetaEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || appletConfig.messagingSenderId,
};


if (typeof window !== 'undefined') {
  const maskedKey = firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 6)}...` : 'MISSING';
  console.log(`[Firebase Service] Initialized for project: "${firebaseConfig.projectId}", authDomain: "${firebaseConfig.authDomain}", apiKey: "${maskedKey}"`);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface FirebaseConfigStatus {
  isConfigured: boolean;
  projectId: string;
  databaseId: string;
  missingFields: string[];
  setupSteps: string[];
}

export const FIREBASE_SETUP_STEPS: string[] = [
  'Firebase muvaffaqiyatli ulandi va loyiha sozlandi.',
  'Google autentifikatsiyasi va Firestore ma\'lumotlar bazasi faollashtirildi.',
  'Zero-Trust xavfsizlik qoidalari serverga joylashtirildi.',
];

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let googleProvider: GoogleAuthProvider;
let isConfigured = false;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  // CRITICAL: Must use provisioned firestoreDatabaseId
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(app);
  functions = getFunctions(app, 'asia-southeast1');
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  isConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY';

  // Test connection asynchronously
  if (typeof window !== 'undefined' && isConfigured) {
    getDocFromServer(doc(db, 'test', 'connection'))
      .then(() => {
        // Connection verified
      })
      .catch((error) => {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn('Firebase connection check: client is offline or network restricted.');
        }
      });
  }
} catch (err) {
  console.error('Firebase initialization error:', err);
  isConfigured = false;
}

export { app, auth, db, functions, googleProvider, isConfigured };

export function logFirestoreOp(operationType: OperationType, path: string | null) {
  const currentAuth = auth ? auth.currentUser : null;
  console.log(`[Firestore Operation] ${operationType.toUpperCase()} at ${path}`, {
    userId: currentAuth?.uid,
    databaseId: firebaseConfig.firestoreDatabaseId,
  });
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = auth ? auth.currentUser : null;
  const errMsg = error instanceof Error ? error.message : String(error);
  const isOffline = errMsg.toLowerCase().includes('client is offline') || 
                    errMsg.toLowerCase().includes('unavailable') || 
                    errMsg.toLowerCase().includes('network-request-failed');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: currentAuth?.uid,
      email: currentAuth?.email,
      emailVerified: currentAuth?.emailVerified,
      isAnonymous: currentAuth?.isAnonymous,
      tenantId: currentAuth?.tenantId,
      providerInfo: currentAuth?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  if (isOffline) {
    console.warn(`[Firestore Offline Notice] ${operationType.toUpperCase()} at ${path || 'unknown'}: ${errMsg}`);
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  emitError(errInfo);
}


export const checkFirebaseStatus = (): FirebaseConfigStatus => {
  return {
    isConfigured,
    projectId: firebaseConfig.projectId || '',
    databaseId: firebaseConfig.firestoreDatabaseId || '',
    missingFields: [],
    setupSteps: FIREBASE_SETUP_STEPS,
  };
};
