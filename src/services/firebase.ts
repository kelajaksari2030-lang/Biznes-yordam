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

// Import provisioned config directly from root
import firebaseConfig from '../../firebase-applet-config.json';

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
