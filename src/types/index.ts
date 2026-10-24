/**
 * BiznesYordam - Core Type Definitions
 */

export type ToolType = 'home' | 'ad-generator' | 'profit-calculator' | 'reply-templates';

export type PlatformType = 'telegram' | 'instagram';

export type ToneType = 'friendly' | 'formal' | 'short' | 'urgent';

export type AdStyleVariant = 'classic' | 'discount' | 'problem_solution' | 'social_proof';

export interface AdFormData {
  productName: string;
  targetAudience: string;
  keyBenefits: string;
  platform: PlatformType;
  tone: ToneType;
  variant: AdStyleVariant;
  specialOffer: string;
  contactInfo: string;
}

export interface AdDraft {
  id: string;
  title: string;
  productName: string;
  platform: PlatformType;
  content: string;
  createdAt: string;
}

export interface ProfitInputs {
  purchaseCost: number;
  sellingPrice: number;
  quantity: number;
  extraCostPerItem: number;
  fixedCosts: number;
}

export interface ProfitResults {
  totalRevenue: number;
  totalDirectCost: number;
  totalExtraItemCost: number;
  totalFixedCost: number;
  totalAllCost: number;
  netProfit: number;
  profitPerItem: number;
  marginPercent: number;
  markupPercent: number;
  breakEvenUnits: number;
  isProfitable: boolean;
}

export interface SavedCalculation {
  id: string;
  name: string;
  date: string;
  inputs: ProfitInputs;
  results: ProfitResults;
}

export type ReplyCategory = 'all' | 'product' | 'price' | 'delivery' | 'payment' | 'followup' | 'complaint';

export interface ReplyTemplate {
  id: string;
  category: 'product' | 'price' | 'delivery' | 'payment' | 'followup' | 'complaint';
  title: string;
  description: string;
  template: string;
  usageTip: string;
  isCustom?: boolean;
}

export interface QuickVariables {
  productName: string;
  price: string;
  deliveryTime: string;
  cardNumber: string;
  discount: string;
  shopName: string;
  phoneNumber: string;
}
