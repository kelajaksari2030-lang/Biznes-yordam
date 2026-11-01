/**
 * BiznesYordam - Core Type Definitions
 */

export type ToolType =
  | 'home'
  | 'ad-generator'
  | 'ad-lab'
  | 'profit-calculator'
  | 'reply-templates'
  | 'business-diagnostics'
  | 'today-navigator'
  | 'crm'
  | 'inventory'
  | 'orders'
  | 'finance'
  | 'business-forecast'
  | 'suppliers'
  | 'staff'
  | 'loyalty'
  | 'multi-branch'
  | 'barcode-print'
  | 'settings';

export type AvailableTimeOption = '30m' | '1h' | '2h' | '4h+';

export interface TodayNavigatorInput {
  businessType: string;
  mainProblem: string;
  todayGoal: string;
  availableTime: AvailableTimeOption;
  budget?: string; // Optional
  clientStatus?: string; // Optional
}

export interface TodayTaskStep {
  id: string;
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface TodayNavigatorPlan {
  id: string;
  createdAt: string;
  dateFormatted: string;
  input: TodayNavigatorInput;
  singleMostImportantTask: {
    title: string;
    rationale: string;
    expectedResult: string;
  };
  actionSteps: TodayTaskStep[];
  zeroCostCustomerAcquisitionTactic: {
    title: string;
    channel: string;
    stepByStep: string[];
    costNote: string;
  };
  antiDistractionRule: {
    whatToAvoid: string;
    whyItWastesTime: string;
    practicalAlternative: string;
  };
  endOfDaySuccessMetrics: {
    targetMetric: string;
    verificationQuestion: string;
    fallbackAssessment: string;
  };
  expressThirtyMinPlan: {
    title: string;
    steps: { minuteMark: string; action: string }[];
  };
  inferredAssumptionsNote?: string;
}

export interface BusinessDiagnosticsInput {
  businessType: string;
  productOrService: string;
  targetAudience: string;
  monthlyRevenue?: string; // Optional
  mainProblem: string;
  currentGoal: string;
}

export interface BusinessDiagnosticsResult {
  id: string;
  createdAt: string;
  input: BusinessDiagnosticsInput;
  summary: string;
  topRisks: string[];
  growthOpportunities: string[];
  sevenDayActionPlan: { day: string; task: string; details: string }[];
  primaryPriorityTask: { title: string; rationale: string; expectedOutcome: string };
  reasoningAndOutcome: {
    strategicReason: string;
    expectedImpact: string;
    metricsToTrack: string[];
  };
  confidenceNote?: string;
}

export type AdLabPlatform = 'instagram' | 'telegram' | 'tiktok' | 'other';
export type AdLabObjective = 'sales' | 'leads' | 'followers' | 'brand_awareness';

export interface AdLabInput {
  productOrService: string;
  targetAudience: string;
  platform: AdLabPlatform;
  objective: AdLabObjective;
  budget?: string; // Optional
  specialOfferOrStyle?: string; // Optional
}

export interface AdLabStrategy {
  id: string;
  strategyType: 'direct_offer' | 'problem_solution' | 'social_proof';
  title: string;
  tagline: string;
  hookHeadline: string;
  bodyText: string;
  callToAction: string;
  recommendedAudience: string;
  strength: string;
  potentialWeakness: string;
  testingAdvice: string;
}

export interface AdLabMetricComparison {
  metric: string;
  description: string;
  strategy1Focus: string;
  strategy2Focus: string;
  strategy3Focus: string;
  evaluationTip: string;
}

export interface AdLabResult {
  id: string;
  createdAt: string;
  input: AdLabInput;
  strategies: AdLabStrategy[];
  metricsComparison: AdLabMetricComparison[];
  recommendedStartingVariant: {
    strategyTitle: string;
    reason: string;
    disclaimer: string;
  };
  budgetTestingRecommendation: string;
}


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

// Re-export unified business platform models
export type {
  BusinessProfile,
  BusinessProfileInput,
  BusinessCurrency,
  SalesChannel,
  Order,
  OrderItem,
  OrderStatus,
  OrderPaymentStatus,
  FinancialTransaction,
  TransactionType,
  TransactionCategory,
  MarketingCampaign,
  CampaignPlatform,
  CampaignObjective,
  BusinessTask,
  TaskSource,
  TaskPriority,
} from './business';
export * from './crm';
export * from './inventory';
export * from './modules';
