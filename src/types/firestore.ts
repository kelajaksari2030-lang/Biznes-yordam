/**
 * BiznesYordam - Firestore Data Models & Types
 * Strictly enforces association with Firebase Authentication UID
 * Defines Authoritative User Profile, Subscription Status, and Daily Usage
 */

export type PlanTier = 'free' | 'pro' | 'ultra';
export type SubscriptionStatus = 'active' | 'none' | 'pending' | 'expired';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  currentPlan: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  planExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyUsageDoc {
  id: string; // YYYY-MM-DD
  userId: string;
  date: string; // YYYY-MM-DD
  adCount: number;
  lastGeneratedAt: string;
}

export interface AdDraftDoc {
  id: string;
  userId: string;
  title: string;
  productName: string;
  platform: 'telegram' | 'instagram';
  content: string;
  createdAt: string;
}

export interface CalculationDoc {
  id: string;
  userId: string;
  name: string;
  date: string;
  purchaseCost: number;
  sellingPrice: number;
  quantity: number;
  extraCostPerItem: number;
  fixedCosts: number;
  netProfit: number;
  marginPercent: number;
  markupPercent: number;
  createdAt: string;
}

export interface CustomTemplateDoc {
  id: string;
  userId: string;
  title: string;
  category: string;
  template: string;
  description: string;
  createdAt: string;
}
