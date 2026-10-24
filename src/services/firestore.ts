/**
 * BiznesYordam - Firestore Database Service
 * Provides secure, strictly scoped operations against the provisioned Firestore database
 * Complies with Zero-Trust Firestore Security and ABAC patterns
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  UserProfile,
  DailyUsageDoc,
  AdDraftDoc,
  CalculationDoc,
  CustomTemplateDoc,
} from '../types/firestore';

export const getTodayDateKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Fetch authoritative user profile from Firestore
 * Client plan is strictly governed by this document, never browser state
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docPath = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    return null;
  }
}

/**
 * Synchronize user profile on Google Sign-In
 * Creates initial profile with Free tier if not exists
 * Preserves existing subscription plan and status (cannot be overwritten by client)
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  const docPath = `users/${user.uid}`;
  const nowIso = new Date().toISOString();

  try {
    const docRef = doc(db, 'users', user.uid);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      // First-time registration: strictly 'free' plan
      const initialProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Tadbirkor',
        photoURL: user.photoURL || '',
        currentPlan: 'free',
        subscriptionStatus: 'active',
        planExpiresAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await setDoc(docRef, initialProfile);
      return initialProfile;
    } else {
      // Existing profile: update non-critical profile fields only
      const existing = snap.data() as UserProfile;
      const updates: Partial<UserProfile> = {
        displayName: user.displayName || existing.displayName,
        photoURL: user.photoURL || existing.photoURL,
        updatedAt: nowIso,
      };

      await updateDoc(docRef, updates);
      return {
        ...existing,
        ...updates,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    // Fallback safe representation
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      currentPlan: 'free',
      subscriptionStatus: 'active',
      planExpiresAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }
}

/**
 * Fetch today's ad-generation usage count for the authenticated user
 */
export async function getTodayAdUsage(userId: string): Promise<DailyUsageDoc> {
  const dateKey = getTodayDateKey();
  const docPath = `users/${userId}/usage/${dateKey}`;

  try {
    const docRef = doc(db, 'users', userId, 'usage', dateKey);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data() as DailyUsageDoc;
    }

    return {
      id: dateKey,
      userId,
      date: dateKey,
      adCount: 0,
      lastGeneratedAt: '',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    return {
      id: dateKey,
      userId,
      date: dateKey,
      adCount: 0,
      lastGeneratedAt: '',
    };
  }
}

/**
 * Record an ad-generation event in Firestore
 * Note: While tracked in Firestore, client-side requests remain subject to backend verification
 */
export async function recordAdGeneration(userId: string): Promise<DailyUsageDoc> {
  const dateKey = getTodayDateKey();
  const docPath = `users/${userId}/usage/${dateKey}`;
  const nowIso = new Date().toISOString();

  try {
    const docRef = doc(db, 'users', userId, 'usage', dateKey);
    const snap = await getDoc(docRef);

    let updatedUsage: DailyUsageDoc;
    if (snap.exists()) {
      const data = snap.data() as DailyUsageDoc;
      updatedUsage = {
        ...data,
        adCount: (data.adCount || 0) + 1,
        lastGeneratedAt: nowIso,
      };
      await updateDoc(docRef, {
        adCount: updatedUsage.adCount,
        lastGeneratedAt: nowIso,
      });
    } else {
      updatedUsage = {
        id: dateKey,
        userId,
        date: dateKey,
        adCount: 1,
        lastGeneratedAt: nowIso,
      };
      await setDoc(docRef, updatedUsage);
    }

    return updatedUsage;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    return {
      id: dateKey,
      userId,
      date: dateKey,
      adCount: 1,
      lastGeneratedAt: nowIso,
    };
  }
}

/**
 * Ad Drafts CRUD
 */
export async function getUserAdDrafts(userId: string): Promise<AdDraftDoc[]> {
  const collectionPath = `users/${userId}/adDrafts`;
  try {
    const colRef = collection(db, 'users', userId, 'adDrafts');
    const snap = await getDocs(colRef);
    const drafts: AdDraftDoc[] = [];
    snap.forEach((docSnap) => {
      drafts.push(docSnap.data() as AdDraftDoc);
    });
    return drafts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

export async function saveAdDraft(userId: string, draft: Omit<AdDraftDoc, 'userId'>): Promise<void> {
  const docPath = `users/${userId}/adDrafts/${draft.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'adDrafts', draft.id);
    const payload: AdDraftDoc = {
      ...draft,
      userId,
    };
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteAdDraft(userId: string, draftId: string): Promise<void> {
  const docPath = `users/${userId}/adDrafts/${draftId}`;
  try {
    const docRef = doc(db, 'users', userId, 'adDrafts', draftId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Saved Calculations CRUD
 */
export async function getUserCalculations(userId: string): Promise<CalculationDoc[]> {
  const collectionPath = `users/${userId}/calculations`;
  try {
    const colRef = collection(db, 'users', userId, 'calculations');
    const snap = await getDocs(colRef);
    const items: CalculationDoc[] = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data() as CalculationDoc);
    });
    return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

export async function saveCalculation(
  userId: string,
  calc: Omit<CalculationDoc, 'userId'>
): Promise<void> {
  const docPath = `users/${userId}/calculations/${calc.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'calculations', calc.id);
    const payload: CalculationDoc = {
      ...calc,
      userId,
    };
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteCalculation(userId: string, calcId: string): Promise<void> {
  const docPath = `users/${userId}/calculations/${calcId}`;
  try {
    const docRef = doc(db, 'users', userId, 'calculations', calcId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Custom Reply Templates CRUD
 */
export async function getUserCustomTemplates(userId: string): Promise<CustomTemplateDoc[]> {
  const collectionPath = `users/${userId}/customTemplates`;
  try {
    const colRef = collection(db, 'users', userId, 'customTemplates');
    const snap = await getDocs(colRef);
    const items: CustomTemplateDoc[] = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data() as CustomTemplateDoc);
    });
    return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

export async function saveCustomTemplate(
  userId: string,
  tpl: Omit<CustomTemplateDoc, 'userId'>
): Promise<void> {
  const docPath = `users/${userId}/customTemplates/${tpl.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'customTemplates', tpl.id);
    const payload: CustomTemplateDoc = {
      ...tpl,
      userId,
    };
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteCustomTemplate(userId: string, templateId: string): Promise<void> {
  const docPath = `users/${userId}/customTemplates/${templateId}`;
  try {
    const docRef = doc(db, 'users', userId, 'customTemplates', templateId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
