/**
 * BiznesYordam - Unified Business Profile Service
 * 
 * Manages the single authoritative business profile at:
 * /users/{userId}/businessProfile/main
 * 
 * Strictly isolated per authenticated user (ABAC/Owner-enforced).
 * Targets named Firestore Database: ai-studio-biznesyordam-e0d6389f-9af4-4469-a3e0-1826035a54fd
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logFirestoreOp } from './firebase';
import { BusinessProfile, BusinessProfileInput } from '../types/business';

export const BUSINESS_PROFILE_DOC_ID = 'main';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates business profile input data
 */
export function validateBusinessProfileInput(input: Partial<BusinessProfileInput>): ValidationResult {
  const errors: string[] = [];

  if (!input.companyName || !input.companyName.trim()) {
    errors.push("Kompaniya yoki do'kon nomi kiritilishi shart");
  } else if (input.companyName.trim().length > 150) {
    errors.push("Kompaniya nomi 150 belgidan oshmasligi kerak");
  }

  if (!input.category || !input.category.trim()) {
    errors.push("Faoliyat sohasi (kategoriya) ko'rsatilishi shart");
  }

  if (!input.targetAudience || !input.targetAudience.trim()) {
    errors.push("Maqsadli auditoriya tavsifi kiritilishi shart");
  }

  if (input.currency && !['UZS', 'USD'].includes(input.currency)) {
    errors.push("Valyuta faqat 'UZS' yoki 'USD' bo'lishi mumkin");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Fetches the user's business profile.
 * Returns null if the profile does not exist yet (safe fallback, no errors thrown).
 */
export async function getBusinessProfile(userId: string): Promise<BusinessProfile | null> {
  if (!userId || !userId.trim()) {
    return null;
  }

  const docPath = `users/${userId}/businessProfile/${BUSINESS_PROFILE_DOC_ID}`;
  logFirestoreOp(OperationType.GET, docPath);

  try {
    const docRef = doc(db, 'users', userId, 'businessProfile', BUSINESS_PROFILE_DOC_ID);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();
    return {
      userId,
      companyName: data.companyName || '',
      category: data.category || '',
      targetAudience: data.targetAudience || '',
      mainSalesChannels: Array.isArray(data.mainSalesChannels) ? data.mainSalesChannels : ['telegram', 'instagram'],
      currency: data.currency === 'USD' ? 'USD' : 'UZS',
      cityOrRegion: data.cityOrRegion || '',
      description: data.description || '',
      phone: data.phone || '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    } as BusinessProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    return null;
  }
}

/**
 * Creates or updates the user's business profile.
 * Strictly enforces that incoming data belongs to userId.
 */
export async function saveBusinessProfile(
  userId: string,
  input: Partial<BusinessProfileInput>
): Promise<BusinessProfile> {
  if (!userId || !userId.trim()) {
    throw new Error("Foydalanuvchi identifikatori (userId) mavjud emas. Tizimga qayta kiring.");
  }

  const validation = validateBusinessProfileInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('. '));
  }

  const docPath = `users/${userId}/businessProfile/${BUSINESS_PROFILE_DOC_ID}`;
  const nowIso = new Date().toISOString();

  try {
    const docRef = doc(db, 'users', userId, 'businessProfile', BUSINESS_PROFILE_DOC_ID);
    logFirestoreOp(OperationType.GET, docPath);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      // First-time creation
      const newProfile: BusinessProfile = {
        userId,
        companyName: input.companyName?.trim() || '',
        category: input.category?.trim() || '',
        targetAudience: input.targetAudience?.trim() || '',
        mainSalesChannels: input.mainSalesChannels && input.mainSalesChannels.length > 0 
          ? input.mainSalesChannels 
          : ['telegram', 'instagram'],
        currency: input.currency === 'USD' ? 'USD' : 'UZS',
        cityOrRegion: input.cityOrRegion?.trim() || '',
        description: input.description?.trim() || '',
        phone: input.phone?.trim() || '',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      logFirestoreOp(OperationType.WRITE, docPath);
      await setDoc(docRef, newProfile);
      return newProfile;
    } else {
      // Update existing profile
      const existing = snap.data();
      const updatedProfile: BusinessProfile = {
        userId,
        companyName: input.companyName?.trim() ?? existing.companyName ?? '',
        category: input.category?.trim() ?? existing.category ?? '',
        targetAudience: input.targetAudience?.trim() ?? existing.targetAudience ?? '',
        mainSalesChannels: input.mainSalesChannels ?? existing.mainSalesChannels ?? ['telegram', 'instagram'],
        currency: input.currency ?? existing.currency ?? 'UZS',
        cityOrRegion: input.cityOrRegion?.trim() ?? existing.cityOrRegion ?? '',
        description: input.description?.trim() ?? existing.description ?? '',
        phone: input.phone?.trim() ?? existing.phone ?? '',
        createdAt: existing.createdAt || nowIso,
        updatedAt: nowIso,
      };

      logFirestoreOp(OperationType.UPDATE, docPath);
      await updateDoc(docRef, {
        companyName: updatedProfile.companyName,
        category: updatedProfile.category,
        targetAudience: updatedProfile.targetAudience,
        mainSalesChannels: updatedProfile.mainSalesChannels,
        currency: updatedProfile.currency,
        cityOrRegion: updatedProfile.cityOrRegion,
        description: updatedProfile.description,
        phone: updatedProfile.phone,
        updatedAt: nowIso,
      });

      return updatedProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}
