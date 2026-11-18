/**
 * BiznesYordam (BESTO) - Server-side Google Gemini AI Service
 *
 * Strictly runs on the Node.js Express backend.
 * Uses @google/genai SDK with structured JSON output schemas and runtime validation.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { AdFormData } from './adGenerator.js';

export const GEMINI_MODEL = 'gemini-4-hydrogen' as const;
export const DEFAULT_GEMINI_TIMEOUT_MS = 25000;

export type GeminiErrorCode =
  | 'invalid_argument'
  | 'gemini_not_configured'
  | 'gemini_timeout'
  | 'gemini_upstream_error'
  | 'gemini_invalid_response';

export class GeminiServiceError extends Error {
  code: GeminiErrorCode;
  statusCode: number;

  constructor(code: GeminiErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface GeminiClientLike {
  generateJson(params: {
    model: string;
    systemInstruction: string;
    prompt: string;
    responseSchema: unknown;
  }): Promise<string>;
}

export interface GeminiCallOptions {
  apiKey?: string;
  timeoutMs?: number;
  clientOverride?: GeminiClientLike;
  retryDelayMs?: number;
}

export interface AdGeneratorAiResponse {
  adText: string;
  headline?: string;
  hashtags?: string[];
}

export type AdLabPlatform = 'instagram' | 'telegram' | 'tiktok' | 'other';
export type AdLabObjective = 'sales' | 'leads' | 'followers' | 'brand_awareness';

export interface AdLabInput {
  productOrService: string;
  targetAudience: string;
  platform: AdLabPlatform;
  objective: AdLabObjective;
  budget?: string;
  specialOfferOrStyle?: string;
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

export type CustomerReplyTone = 'friendly' | 'formal' | 'persuasive' | 'empathetic';
export type CustomerReplyCategory =
  | 'product'
  | 'price'
  | 'delivery'
  | 'payment'
  | 'followup'
  | 'complaint';

export interface CustomerReplyAiInput {
  customerMessage: string;
  tone?: CustomerReplyTone;
  shopName?: string;
  productName?: string;
  price?: string;
  deliveryTime?: string;
  cardNumber?: string;
  discount?: string;
  additionalContext?: string;
}

export interface CustomerReplySuggestion {
  title: string;
  category: CustomerReplyCategory;
  replyText: string;
  usageTip: string;
}

export interface CustomerRepliesAiResult {
  replies: CustomerReplySuggestion[];
}

export interface BusinessDiagnosticsInput {
  businessType: string;
  productOrService: string;
  targetAudience: string;
  monthlyRevenue?: string;
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

export type AvailableTimeOption = '30m' | '1h' | '2h' | '4h+';

export interface TodayNavigatorInput {
  businessType: string;
  mainProblem: string;
  todayGoal: string;
  availableTime: AvailableTimeOption;
  budget?: string;
  clientStatus?: string;
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

function cleanString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function assertNonEmptyString(val: unknown, fieldLabel: string, minLen = 2): string {
  if (typeof val !== 'string' || val.trim().length < minLen) {
    throw new GeminiServiceError(
      'invalid_argument',
      `${fieldLabel} bo'sh bo'lmasligi kerak.`,
      400
    );
  }
  return val.trim();
}

export function resolveGeminiApiKey(overrideKey?: string): string {
  const candidate = (overrideKey !== undefined ? overrideKey : process.env.GEMINI_API_KEY || '').trim();
  if (
    !candidate ||
    candidate === 'MY_GEMINI_API_KEY' ||
    candidate === 'your_gemini_api_key' ||
    candidate.toLowerCase().includes('placeholder')
  ) {
    return '';
  }
  return candidate;
}

export function isGeminiConfigured(overrideKey?: string): boolean {
  return resolveGeminiApiKey(overrideKey).length > 0;
}

export function resolveTimeoutMs(overrideTimeoutMs?: number): number {
  if (typeof overrideTimeoutMs === 'number' && Number.isFinite(overrideTimeoutMs) && overrideTimeoutMs > 0) {
    return Math.min(overrideTimeoutMs, 60000);
  }
  const envVal = Number(process.env.GEMINI_TIMEOUT_MS);
  if (Number.isFinite(envVal) && envVal >= 1000) {
    return Math.min(envVal, 60000);
  }
  return DEFAULT_GEMINI_TIMEOUT_MS;
}

export function createSdkGeminiClient(apiKey: string): GeminiClientLike {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return {
    async generateJson({ model, systemInstruction, prompt, responseSchema }) {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: responseSchema as any,
        },
      });
      return typeof response.text === 'string' ? response.text : '';
    },
  };
}

function isTransientError(err: any): boolean {
  if (!err) return false;
  if (err instanceof GeminiServiceError) return false;
  const status = Number(err?.status || err?.statusCode || err?.code);
  if (status === 429 || (status >= 500 && status < 600)) return true;
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('500') ||
    msg.includes('429') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed') ||
    msg.includes('temporarily unavailable')
  );
}

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new GeminiServiceError(
              'gemini_timeout',
              "Gemini AI javob berish vaqti tugadi. Iltimos, birozdan so'ng qayta urinib ko'ring.",
              504
            )
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function callGeminiStructuredJson<T>(params: {
  systemInstruction: string;
  prompt: string;
  responseSchema: unknown;
  validate: (parsed: any) => T;
  options?: GeminiCallOptions;
}): Promise<T> {
  const { systemInstruction, prompt, responseSchema, validate, options } = params;

  const client = options?.clientOverride
    ? options.clientOverride
    : (() => {
        const apiKey = resolveGeminiApiKey(options?.apiKey);
        if (!apiKey) {
          throw new GeminiServiceError(
            'gemini_not_configured',
            "Serverda GEMINI_API_KEY sozlanmagan. Haqiqiy AI javoblari uchun backend muhitida GEMINI_API_KEY ni kiriting.",
            503
          );
        }
        return createSdkGeminiClient(apiKey);
      })();

  const timeoutMs = resolveTimeoutMs(options?.timeoutMs);
  const retryDelayMs = options?.retryDelayMs ?? 350;
  const startedAt = Date.now();

  let rawText = '';
  let lastError: any;

  for (let attempt = 0; attempt < 2; attempt++) {
    const elapsed = Date.now() - startedAt;
    const remainingMs = timeoutMs - elapsed;
    if (remainingMs <= 50) {
      throw new GeminiServiceError(
        'gemini_timeout',
        "Gemini AI javob berish vaqti tugadi. Iltimos, qayta urinib ko'ring.",
        504
      );
    }

    try {
      rawText = await runWithTimeout(
        client.generateJson({
          model: GEMINI_MODEL,
          systemInstruction,
          prompt,
          responseSchema,
        }),
        remainingMs
      );
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      if (err instanceof GeminiServiceError) {
        throw err;
      }
      if (attempt === 0 && isTransientError(err) && timeoutMs - (Date.now() - startedAt) > retryDelayMs + 200) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }
      throw new GeminiServiceError(
        'gemini_upstream_error',
        `Gemini AI xizmati bilan ishlashda xatolik yuz berdi: ${err?.message || "Noma'lum xato"}`,
        502
      );
    }
  }

  if (lastError) {
    throw lastError;
  }

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new GeminiServiceError(
      'gemini_invalid_response',
      "Gemini AI bo'sh javob qaytardi.",
      502
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new GeminiServiceError(
      'gemini_invalid_response',
      "Gemini AI noto'g'ri JSON formatda javob qaytardi.",
      502
    );
  }

  try {
    return validate(parsed);
  } catch (err: any) {
    if (err instanceof GeminiServiceError) {
      throw err;
    }
    throw new GeminiServiceError(
      'gemini_invalid_response',
      `Gemini AI javobi kutilgan tuzilmaga mos kelmadi: ${err?.message || ''}`.trim(),
      502
    );
  }
}

// ============================================================
// 1. AD GENERATOR
// ============================================================

export function validateAdGeneratorInput(raw: any): AdFormData & { simulatedTier?: string } {
  if (!raw || typeof raw !== 'object') {
    throw new GeminiServiceError('invalid_argument', "So'rov ma'lumotlari noto'g'ri.", 400);
  }
  const productName = cleanString(raw.productName, 200);
  if (!productName) {
    throw new GeminiServiceError(
      'invalid_argument',
      "Mahsulot yoki xizmat nomi ko'rsatilishi shart.",
      400
    );
  }

  return {
    productName,
    targetAudience: cleanString(raw.targetAudience, 300),
    keyBenefits: cleanString(raw.keyBenefits, 1200),
    platform: raw.platform === 'instagram' ? 'instagram' : 'telegram',
    tone: ['friendly', 'formal', 'short', 'urgent'].includes(raw.tone) ? raw.tone : 'friendly',
    variant: ['classic', 'discount', 'problem_solution', 'social_proof'].includes(raw.variant)
      ? raw.variant
      : 'classic',
    specialOffer: cleanString(raw.specialOffer, 400),
    contactInfo: cleanString(raw.contactInfo, 400),
    simulatedTier: typeof raw.simulatedTier === 'string' ? raw.simulatedTier : undefined,
  };
}

const AD_GENERATOR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    adText: {
      type: Type.STRING,
      description: "Tayyor reklama matni (o'zbek lotin alifbosida, platformaga mos formatda).",
    },
    headline: {
      type: Type.STRING,
      description: "Qisqa sarlavha yoki diqqat tortuvchi birinchi qator.",
    },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Platformaga mos 3-6 ta heshteg (Instagram uchun tavsiya etiladi).",
    },
  },
  required: ['adText'],
};

export async function generateAdWithGemini(
  rawInput: any,
  options?: GeminiCallOptions
): Promise<AdGeneratorAiResponse> {
  const input = validateAdGeneratorInput(rawInput);

  const systemInstruction = [
    "Siz O'zbekiston bozori uchun ixtisoslashgan tajribali marketing kopirayterisiz.",
    "Barcha javoblar faqat toza O'zbekcha (Lotin yozuvida) bo'lsin.",
    "Foydalanuvchi kiritmagan narx, telefon raqami, chegirma foizi yoki kafolat raqamlarini o'zingizdan o'ylab topmang.",
    "Agar aloqa ma'lumoti bo'sh bo'lsa, umumiy murojaatga chaqiruv yozing (soxta raqam to'qimang).",
    "Platforma talabiga mos yozing: Telegram uchun o'qishga qulay, aniq blokli va ixcham (1024 belgidan oshmasin); Instagram uchun esa kuchli hook va oxirida heshteglar bilan.",
  ].join(' ');

  const prompt = [
    `Quyidagi ma'lumotlar asosida bitta tayyor reklama postini yozib bering:`,
    `- Mahsulot / Xizmat: ${input.productName}`,
    `- Maqsadli auditoriya: ${input.targetAudience || "Ko'rsatilmagan (umumiy xaridorlar)"}`,
    `- Asosiy afzalliklar: ${input.keyBenefits || "Ko'rsatilmagan"}`,
    `- Platforma: ${input.platform}`,
    `- Murojaat ohangi (tone): ${input.tone}`,
    `- Reklama formati (variant): ${input.variant}`,
    `- Maxsus taklif / aksiya: ${input.specialOffer || "Ko'rsatilmagan"}`,
    `- Bog'lanish ma'lumoti: ${input.contactInfo || "Ko'rsatilmagan"}`,
  ].join('\n');

  return callGeminiStructuredJson<AdGeneratorAiResponse>({
    systemInstruction,
    prompt,
    responseSchema: AD_GENERATOR_SCHEMA,
    options,
    validate: (parsed) => {
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Object expected');
      }
      const adText = assertNonEmptyString(parsed.adText, 'adText', 20);
      const headline = cleanString(parsed.headline, 240) || undefined;
      const hashtags = Array.isArray(parsed.hashtags)
        ? parsed.hashtags
            .filter((h: any) => typeof h === 'string' && h.trim().length > 1)
            .slice(0, 8)
            .map((h: string) => h.trim())
        : undefined;
      return { adText, headline, hashtags };
    },
  });
}

// ============================================================
// 2. AD LAB
// ============================================================

export function validateAdLabInput(raw: any): AdLabInput & { simulatedTier?: string } {
  if (!raw || typeof raw !== 'object') {
    throw new GeminiServiceError('invalid_argument', "So'rov ma'lumotlari noto'g'ri.", 400);
  }
  const productOrService = cleanString(raw.productOrService, 300);
  const targetAudience = cleanString(raw.targetAudience, 300);

  if (!productOrService || !targetAudience) {
    throw new GeminiServiceError(
      'invalid_argument',
      "Mahsulot/xizmat nomi va maqsadli auditoriya kiritilishi shart.",
      400
    );
  }

  const platform: AdLabPlatform = ['instagram', 'telegram', 'tiktok', 'other'].includes(raw.platform)
    ? raw.platform
    : 'instagram';
  const objective: AdLabObjective = ['sales', 'leads', 'followers', 'brand_awareness'].includes(raw.objective)
    ? raw.objective
    : 'sales';

  return {
    productOrService,
    targetAudience,
    platform,
    objective,
    budget: cleanString(raw.budget, 150) || undefined,
    specialOfferOrStyle: cleanString(raw.specialOfferOrStyle, 300) || undefined,
    simulatedTier: typeof raw.simulatedTier === 'string' ? raw.simulatedTier : undefined,
  };
}

const AD_LAB_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    strategies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          strategyType: { type: Type.STRING, enum: ['direct_offer', 'problem_solution', 'social_proof'] },
          title: { type: Type.STRING },
          tagline: { type: Type.STRING },
          hookHeadline: { type: Type.STRING },
          bodyText: { type: Type.STRING },
          callToAction: { type: Type.STRING },
          recommendedAudience: { type: Type.STRING },
          strength: { type: Type.STRING },
          potentialWeakness: { type: Type.STRING },
          testingAdvice: { type: Type.STRING },
        },
        required: [
          'strategyType',
          'title',
          'tagline',
          'hookHeadline',
          'bodyText',
          'callToAction',
          'recommendedAudience',
          'strength',
          'potentialWeakness',
          'testingAdvice',
        ],
      },
    },
    metricsComparison: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          metric: { type: Type.STRING },
          description: { type: Type.STRING },
          strategy1Focus: { type: Type.STRING },
          strategy2Focus: { type: Type.STRING },
          strategy3Focus: { type: Type.STRING },
          evaluationTip: { type: Type.STRING },
        },
        required: ['metric', 'description', 'strategy1Focus', 'strategy2Focus', 'strategy3Focus', 'evaluationTip'],
      },
    },
    recommendedStartingVariant: {
      type: Type.OBJECT,
      properties: {
        strategyTitle: { type: Type.STRING },
        reason: { type: Type.STRING },
        disclaimer: { type: Type.STRING },
      },
      required: ['strategyTitle', 'reason', 'disclaimer'],
    },
    budgetTestingRecommendation: { type: Type.STRING },
  },
  required: ['strategies', 'metricsComparison', 'recommendedStartingVariant', 'budgetTestingRecommendation'],
};

export async function generateAdLabWithGemini(
  rawInput: any,
  options?: GeminiCallOptions
): Promise<AdLabResult> {
  const input = validateAdLabInput(rawInput);

  const systemInstruction = [
    "Siz O'zbekiston bozorida ishlovchi performance-marketing strategiyasini tuzuvchi tahlilchisiz.",
    "Barcha matnlarni faqat toza O'zbekcha (Lotin yozuvida) qaytaring.",
    "QAT'IY QOIDA: Hech qachon kafolatlangan ROI, aniq konversiya foizi yoki soxta mijoz sharhi raqamlarini fakt sifatida uydirmang.",
    "3 ta strategiya turlari aynan 'direct_offer', 'problem_solution', 'social_proof' bo'lsin.",
    "metricsComparison jadvalida 4 ta ko'rsatkich bo'lsin: CTR, Murojaatlar (Leads), Konversiya, Xarajat va ROI.",
  ].join(' ');

  const prompt = [
    "Quyidagi parametrlar bo'yicha 3 ta A/B reklama strategiyasini solishtirib bering:",
    `- Mahsulot / Xizmat: ${input.productOrService}`,
    `- Maqsadli auditoriya: ${input.targetAudience}`,
    `- Platforma: ${input.platform}`,
    `- Asosiy maqsad: ${input.objective}`,
    `- Budjet: ${input.budget || "Ko'rsatilmagan"}`,
    `- Maxsus taklif yoki uslub: ${input.specialOfferOrStyle || "Ko'rsatilmagan"}`,
  ].join('\n');

  const generated = await callGeminiStructuredJson<{
    strategies: AdLabStrategy[];
    metricsComparison: AdLabMetricComparison[];
    recommendedStartingVariant: AdLabResult['recommendedStartingVariant'];
    budgetTestingRecommendation: string;
  }>({
    systemInstruction,
    prompt,
    responseSchema: AD_LAB_SCHEMA,
    options,
    validate: (parsed) => {
      if (!parsed || typeof parsed !== 'object') throw new Error('Object expected');
      if (!Array.isArray(parsed.strategies) || parsed.strategies.length < 3) {
        throw new Error('3 strategies required');
      }
      const allowedTypes = ['direct_offer', 'problem_solution', 'social_proof'] as const;
      const strategies: AdLabStrategy[] = parsed.strategies.slice(0, 3).map((s: any, idx: number) => {
        const sType = allowedTypes.includes(s?.strategyType) ? s.strategyType : allowedTypes[idx];
        return {
          id: `strat_${sType}_${idx + 1}`,
          strategyType: sType,
          title: assertNonEmptyString(s?.title, 'strategy.title'),
          tagline: assertNonEmptyString(s?.tagline, 'strategy.tagline'),
          hookHeadline: assertNonEmptyString(s?.hookHeadline, 'strategy.hookHeadline'),
          bodyText: assertNonEmptyString(s?.bodyText, 'strategy.bodyText'),
          callToAction: assertNonEmptyString(s?.callToAction, 'strategy.callToAction'),
          recommendedAudience: assertNonEmptyString(s?.recommendedAudience, 'strategy.recommendedAudience'),
          strength: assertNonEmptyString(s?.strength, 'strategy.strength'),
          potentialWeakness: assertNonEmptyString(s?.potentialWeakness, 'strategy.potentialWeakness'),
          testingAdvice: assertNonEmptyString(s?.testingAdvice, 'strategy.testingAdvice'),
        };
      });

      if (!Array.isArray(parsed.metricsComparison) || parsed.metricsComparison.length < 3) {
        throw new Error('metricsComparison required');
      }
      const metricsComparison: AdLabMetricComparison[] = parsed.metricsComparison.slice(0, 6).map((m: any) => ({
        metric: assertNonEmptyString(m?.metric, 'metric'),
        description: assertNonEmptyString(m?.description, 'metric.description'),
        strategy1Focus: assertNonEmptyString(m?.strategy1Focus, 'strategy1Focus'),
        strategy2Focus: assertNonEmptyString(m?.strategy2Focus, 'strategy2Focus'),
        strategy3Focus: assertNonEmptyString(m?.strategy3Focus, 'strategy3Focus'),
        evaluationTip: assertNonEmptyString(m?.evaluationTip, 'evaluationTip'),
      }));

      const rec = parsed.recommendedStartingVariant;
      if (!rec || typeof rec !== 'object') throw new Error('recommendedStartingVariant required');

      return {
        strategies,
        metricsComparison,
        recommendedStartingVariant: {
          strategyTitle: assertNonEmptyString(rec.strategyTitle, 'recommendedStartingVariant.strategyTitle'),
          reason: assertNonEmptyString(rec.reason, 'recommendedStartingVariant.reason'),
          disclaimer: assertNonEmptyString(rec.disclaimer, 'recommendedStartingVariant.disclaimer'),
        },
        budgetTestingRecommendation: assertNonEmptyString(
          parsed.budgetTestingRecommendation,
          'budgetTestingRecommendation'
        ),
      };
    },
  });

  return {
    id: `adlab_${Date.now()}`,
    createdAt: new Date().toISOString(),
    input: {
      productOrService: input.productOrService,
      targetAudience: input.targetAudience,
      platform: input.platform,
      objective: input.objective,
      budget: input.budget,
      specialOfferOrStyle: input.specialOfferOrStyle,
    },
    ...generated,
  };
}

// ============================================================
// 3. CUSTOMER REPLIES
// ============================================================

export function validateCustomerRepliesInput(
  raw: any
): CustomerReplyAiInput & { simulatedTier?: string } {
  if (!raw || typeof raw !== 'object') {
    throw new GeminiServiceError('invalid_argument', "So'rov ma'lumotlari noto'g'ri.", 400);
  }
  const customerMessage = cleanString(raw.customerMessage, 1500);
  if (!customerMessage) {
    throw new GeminiServiceError(
      'invalid_argument',
      "Mijoz xabari yoki savoli kiritilishi shart.",
      400
    );
  }

  const tone: CustomerReplyTone = ['friendly', 'formal', 'persuasive', 'empathetic'].includes(raw.tone)
    ? raw.tone
    : 'friendly';

  return {
    customerMessage,
    tone,
    shopName: cleanString(raw.shopName, 120) || undefined,
    productName: cleanString(raw.productName, 180) || undefined,
    price: cleanString(raw.price, 100) || undefined,
    deliveryTime: cleanString(raw.deliveryTime, 120) || undefined,
    cardNumber: cleanString(raw.cardNumber, 60) || undefined,
    discount: cleanString(raw.discount, 150) || undefined,
    additionalContext: cleanString(raw.additionalContext, 500) || undefined,
    simulatedTier: typeof raw.simulatedTier === 'string' ? raw.simulatedTier : undefined,
  };
}

const CUSTOMER_REPLIES_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    replies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ['product', 'price', 'delivery', 'payment', 'followup', 'complaint'],
          },
          replyText: { type: Type.STRING },
          usageTip: { type: Type.STRING },
        },
        required: ['title', 'category', 'replyText', 'usageTip'],
      },
    },
  },
  required: ['replies'],
};

export async function generateCustomerRepliesWithGemini(
  rawInput: any,
  options?: GeminiCallOptions
): Promise<CustomerRepliesAiResult> {
  const input = validateCustomerRepliesInput(rawInput);

  const systemInstruction = [
    "Siz O'zbekistondagi savdo va xizmat ko'rsatish bizneslari uchun mijozlar bilan muloqot bo'yicha mutaxassissiz.",
    "Barcha javoblarni faqat toza O'zbekcha (Lotin yozuvida) yozing.",
    "Mijoz xabariga qarab 3 ta turlicha yondashuvdagi tayyor javob variantini tuzing (masalan: Qisqa va aniq, Qiymatni tushuntiruvchi, Keyingi qadamga undovchi).",
    "QAT'IY QOIDA: Foydalanuvchi bermagan narx, chegirma, karta raqami yoki yetkazish muddatini o'ylab topmang; agar kerak bo'lsa [Narx] yoki shunga o'xshash aniq ishora ishlating yoki berilgan kontekstdan foydalaning.",
  ].join(' ');

  const prompt = [
    `Mijozdan kelgan xabar: "${input.customerMessage}"`,
    `Kerakli ohang (tone): ${input.tone || 'friendly'}`,
    `Biznes / Do'kon konteksti:`,
    `- Do'kon nomi: ${input.shopName || "Ko'rsatilmagan"}`,
    `- Mahsulot: ${input.productName || "Ko'rsatilmagan"}`,
    `- Narxi: ${input.price || "Ko'rsatilmagan"}`,
    `- Yetkazish muddati: ${input.deliveryTime || "Ko'rsatilmagan"}`,
    `- Chegirma / aksiya: ${input.discount || "Ko'rsatilmagan"}`,
    `- Qo'shimcha ma'lumot: ${input.additionalContext || "Yo'q"}`,
  ].join('\n');

  return callGeminiStructuredJson<CustomerRepliesAiResult>({
    systemInstruction,
    prompt,
    responseSchema: CUSTOMER_REPLIES_SCHEMA,
    options,
    validate: (parsed) => {
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.replies) || parsed.replies.length === 0) {
        throw new Error('replies array required');
      }
      const allowedCats: CustomerReplyCategory[] = ['product', 'price', 'delivery', 'payment', 'followup', 'complaint'];
      const replies: CustomerReplySuggestion[] = parsed.replies.slice(0, 3).map((item: any) => ({
        title: assertNonEmptyString(item?.title, 'reply.title'),
        category: allowedCats.includes(item?.category) ? item.category : 'product',
        replyText: assertNonEmptyString(item?.replyText, 'reply.replyText', 10),
        usageTip: assertNonEmptyString(item?.usageTip, 'reply.usageTip'),
      }));
      return { replies };
    },
  });
}

// ============================================================
// 4. BUSINESS DIAGNOSTICS
// ============================================================

export function validateBusinessDiagnosticsInput(
  raw: any
): BusinessDiagnosticsInput & { simulatedTier?: string } {
  if (!raw || typeof raw !== 'object') {
    throw new GeminiServiceError('invalid_argument', "So'rov ma'lumotlari noto'g'ri.", 400);
  }
  const businessType = cleanString(raw.businessType, 180);
  const productOrService = cleanString(raw.productOrService, 300);
  const targetAudience = cleanString(raw.targetAudience, 300);
  const mainProblem = cleanString(raw.mainProblem, 600);
  const currentGoal = cleanString(raw.currentGoal, 300);

  if (!businessType || !productOrService || !mainProblem || !currentGoal) {
    throw new GeminiServiceError(
      'invalid_argument',
      "Biznes turi, mahsulot/xizmat, asosiy muammo va maqsad maydonlari to'ldirilishi shart.",
      400
    );
  }

  return {
    businessType,
    productOrService,
    targetAudience: targetAudience || 'Mahalliy xaridorlar',
    monthlyRevenue: cleanString(raw.monthlyRevenue, 120) || undefined,
    mainProblem,
    currentGoal,
    simulatedTier: typeof raw.simulatedTier === 'string' ? raw.simulatedTier : undefined,
  };
}

const BUSINESS_DIAGNOSTICS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    topRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
    growthOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
    sevenDayActionPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING },
          task: { type: Type.STRING },
          details: { type: Type.STRING },
        },
        required: ['day', 'task', 'details'],
      },
    },
    primaryPriorityTask: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        rationale: { type: Type.STRING },
        expectedOutcome: { type: Type.STRING },
      },
      required: ['title', 'rationale', 'expectedOutcome'],
    },
    reasoningAndOutcome: {
      type: Type.OBJECT,
      properties: {
        strategicReason: { type: Type.STRING },
        expectedImpact: { type: Type.STRING },
        metricsToTrack: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['strategicReason', 'expectedImpact', 'metricsToTrack'],
    },
    confidenceNote: { type: Type.STRING },
  },
  required: [
    'summary',
    'topRisks',
    'growthOpportunities',
    'sevenDayActionPlan',
    'primaryPriorityTask',
    'reasoningAndOutcome',
    'confidenceNote',
  ],
};

export async function generateBusinessDiagnosticsWithGemini(
  rawInput: any,
  options?: GeminiCallOptions
): Promise<BusinessDiagnosticsResult> {
  const input = validateBusinessDiagnosticsInput(rawInput);

  const systemInstruction = [
    "Siz O'zbekistondagi kichik va o'rta bizneslar uchun boshqaruv va savdo bo'yicha katta maslahatchisiz.",
    "Barcha matnlarni faqat toza O'zbekcha (Lotin yozuvida) yozing.",
    "QAT'IY QOIDA: Foydalanuvchi oylik daromad/tushumni bermagan bo'lsa, soxta moliyaviy raqamlar (so'm/dollar tushum) to'qimang va confidenceNote maydonida ma'lumot cheklanganligini ochiq qayd eting.",
    "topRisks ro'yxatida aniq 3 ta xavf, growthOpportunities ro'yxatida aniq 3 ta imkoniyat, sevenDayActionPlan ro'yxatida 7 kunlik reja (1-kun .. 7-kun) bo'lsin.",
  ].join(' ');

  const prompt = [
    "Quyidagi biznes ma'lumotlari asosida to'liq amaliy diagnostika va 7 kunlik harakatlar rejasini tuzing:",
    `- Biznes turi: ${input.businessType}`,
    `- Mahsulot / Xizmat: ${input.productOrService}`,
    `- Maqsadli auditoriya: ${input.targetAudience}`,
    `- Oylik tushum / aylanma: ${input.monthlyRevenue || "Ko'rsatilmagan"}`,
    `- Asosiy muammo / to'siq: ${input.mainProblem}`,
    `- Hozirgi bosh maqsad: ${input.currentGoal}`,
  ].join('\n');

  const generated = await callGeminiStructuredJson<{
    summary: string;
    topRisks: string[];
    growthOpportunities: string[];
    sevenDayActionPlan: { day: string; task: string; details: string }[];
    primaryPriorityTask: BusinessDiagnosticsResult['primaryPriorityTask'];
    reasoningAndOutcome: BusinessDiagnosticsResult['reasoningAndOutcome'];
    confidenceNote?: string;
  }>({
    systemInstruction,
    prompt,
    responseSchema: BUSINESS_DIAGNOSTICS_SCHEMA,
    options,
    validate: (parsed) => {
      if (!parsed || typeof parsed !== 'object') throw new Error('Object expected');
      if (!Array.isArray(parsed.topRisks) || parsed.topRisks.length < 3) throw new Error('topRisks requires 3 items');
      if (!Array.isArray(parsed.growthOpportunities) || parsed.growthOpportunities.length < 3) {
        throw new Error('growthOpportunities requires 3 items');
      }
      if (!Array.isArray(parsed.sevenDayActionPlan) || parsed.sevenDayActionPlan.length < 5) {
        throw new Error('sevenDayActionPlan required');
      }
      const prio = parsed.primaryPriorityTask;
      const reason = parsed.reasoningAndOutcome;
      if (!prio || typeof prio !== 'object' || !reason || typeof reason !== 'object') {
        throw new Error('primaryPriorityTask & reasoningAndOutcome required');
      }

      return {
        summary: assertNonEmptyString(parsed.summary, 'summary', 20),
        topRisks: parsed.topRisks.slice(0, 3).map((r: any) => assertNonEmptyString(r, 'topRisk')),
        growthOpportunities: parsed.growthOpportunities.slice(0, 3).map((g: any) => assertNonEmptyString(g, 'growthOpportunity')),
        sevenDayActionPlan: parsed.sevenDayActionPlan.slice(0, 7).map((d: any) => ({
          day: assertNonEmptyString(d?.day, 'day'),
          task: assertNonEmptyString(d?.task, 'task'),
          details: assertNonEmptyString(d?.details, 'details'),
        })),
        primaryPriorityTask: {
          title: assertNonEmptyString(prio.title, 'primaryPriorityTask.title'),
          rationale: assertNonEmptyString(prio.rationale, 'primaryPriorityTask.rationale'),
          expectedOutcome: assertNonEmptyString(prio.expectedOutcome, 'primaryPriorityTask.expectedOutcome'),
        },
        reasoningAndOutcome: {
          strategicReason: assertNonEmptyString(reason.strategicReason, 'reasoningAndOutcome.strategicReason'),
          expectedImpact: assertNonEmptyString(reason.expectedImpact, 'reasoningAndOutcome.expectedImpact'),
          metricsToTrack: Array.isArray(reason.metricsToTrack) && reason.metricsToTrack.length > 0
            ? reason.metricsToTrack.slice(0, 5).map((m: any) => assertNonEmptyString(m, 'metricToTrack'))
            : ["Murojaatdan sotuvga o'tish foizi"],
        },
        confidenceNote: cleanString(parsed.confidenceNote, 400) || undefined,
      };
    },
  });

  return {
    id: `diag_${Date.now()}`,
    createdAt: new Date().toISOString(),
    input: {
      businessType: input.businessType,
      productOrService: input.productOrService,
      targetAudience: input.targetAudience,
      monthlyRevenue: input.monthlyRevenue,
      mainProblem: input.mainProblem,
      currentGoal: input.currentGoal,
    },
    ...generated,
  };
}

// ============================================================
// 5. TODAY NAVIGATOR
// ============================================================

export function validateTodayNavigatorInput(
  raw: any
): TodayNavigatorInput & { simulatedTier?: string } {
  if (!raw || typeof raw !== 'object') {
    throw new GeminiServiceError('invalid_argument', "So'rov ma'lumotlari noto'g'ri.", 400);
  }
  const businessType = cleanString(raw.businessType, 180);
  const mainProblem = cleanString(raw.mainProblem, 500);
  const todayGoal = cleanString(raw.todayGoal, 300);

  if (!businessType || !mainProblem || !todayGoal) {
    throw new GeminiServiceError(
      'invalid_argument',
      "Biznes turi, bugungi muammo va asosiy maqsad kiritilishi shart.",
      400
    );
  }

  const availableTime: AvailableTimeOption = ['30m', '1h', '2h', '4h+'].includes(raw.availableTime)
    ? raw.availableTime
    : '1h';

  return {
    businessType,
    mainProblem,
    todayGoal,
    availableTime,
    budget: cleanString(raw.budget, 120) || undefined,
    clientStatus: cleanString(raw.clientStatus, 300) || undefined,
    simulatedTier: typeof raw.simulatedTier === 'string' ? raw.simulatedTier : undefined,
  };
}

const TODAY_NAVIGATOR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    singleMostImportantTask: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        rationale: { type: Type.STRING },
        expectedResult: { type: Type.STRING },
      },
      required: ['title', 'rationale', 'expectedResult'],
    },
    actionSteps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          estimatedMinutes: { type: Type.NUMBER },
        },
        required: ['title', 'description', 'estimatedMinutes'],
      },
    },
    zeroCostCustomerAcquisitionTactic: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        channel: { type: Type.STRING },
        stepByStep: { type: Type.ARRAY, items: { type: Type.STRING } },
        costNote: { type: Type.STRING },
      },
      required: ['title', 'channel', 'stepByStep', 'costNote'],
    },
    antiDistractionRule: {
      type: Type.OBJECT,
      properties: {
        whatToAvoid: { type: Type.STRING },
        whyItWastesTime: { type: Type.STRING },
        practicalAlternative: { type: Type.STRING },
      },
      required: ['whatToAvoid', 'whyItWastesTime', 'practicalAlternative'],
    },
    endOfDaySuccessMetrics: {
      type: Type.OBJECT,
      properties: {
        targetMetric: { type: Type.STRING },
        verificationQuestion: { type: Type.STRING },
        fallbackAssessment: { type: Type.STRING },
      },
      required: ['targetMetric', 'verificationQuestion', 'fallbackAssessment'],
    },
    expressThirtyMinPlan: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              minuteMark: { type: Type.STRING },
              action: { type: Type.STRING },
            },
            required: ['minuteMark', 'action'],
          },
        },
      },
      required: ['title', 'steps'],
    },
    inferredAssumptionsNote: { type: Type.STRING },
  },
  required: [
    'singleMostImportantTask',
    'actionSteps',
    'zeroCostCustomerAcquisitionTactic',
    'antiDistractionRule',
    'endOfDaySuccessMetrics',
    'expressThirtyMinPlan',
  ],
};

export async function generateTodayPlanWithGemini(
  rawInput: any,
  options?: GeminiCallOptions
): Promise<TodayNavigatorPlan> {
  const input = validateTodayNavigatorInput(rawInput);

  const cleanedBudget = (input.budget || '').replace(/[\s_]+/g, '').toLowerCase();
  const isZeroOrFree =
    !cleanedBudget ||
    cleanedBudget === '0' ||
    cleanedBudget === "0so'm" ||
    cleanedBudget === '0som' ||
    cleanedBudget.includes("yo'q") ||
    cleanedBudget.includes('bepul') ||
    cleanedBudget === 'mavjudemas';

  const maxMinutesMap: Record<AvailableTimeOption, number> = {
    '30m': 30,
    '1h': 60,
    '2h': 120,
    '4h+': 240,
  };
  const maxMinutes = maxMinutesMap[input.availableTime];

  const systemInstruction = [
    "Siz O'zbekistondagi tadbirkorlar uchun kundalik amaliy ijro bo'yicha biznes murabbiysiz.",
    "Barcha matnlarni faqat toza O'zbekcha (Lotin yozuvida), motivatsion balandparvoz gaplarsiz, aniq harakatlar shaklida yozing.",
    `Ajratilgan vaqt: ${input.availableTime} (maksimal ${maxMinutes} daqiqa). actionSteps qadamlarining soni 3 tadan 5 tagacha bo'lsin va ularning estimatedMinutes yig'indisi ${maxMinutes} daqiqadan oshmasin.`,
    isZeroOrFree
      ? "Budjet ko'rsatilmagan yoki 0 so'm: zeroCostCustomerAcquisitionTactic qismida faqat mutlaqo bepul (0 so'm) organik mijoz topish usulini yozing, pullik reklama majburiy qilmang."
      : `Berilgan budjet (${input.budget}) ni inobatga olib tejamkor tavsiya bering.`,
    "expressThirtyMinPlan da 3 ta aniq vaqt bo'lagi (minuteMark va action) bo'lsin.",
  ].join(' ');

  const prompt = [
    "Bugungi kun uchun aniq harakatlar rejasini tuzib bering:",
    `- Biznes turi: ${input.businessType}`,
    `- Asosiy muammo: ${input.mainProblem}`,
    `- Bugungi maqsad: ${input.todayGoal}`,
    `- Ajratilgan vaqt: ${input.availableTime}`,
    `- Budjet: ${input.budget || "0 so'm (ko'rsatilmagan)"}`,
    `- Mijozlar / so'rovlar holati: ${input.clientStatus || "Ko'rsatilmagan"}`,
  ].join('\n');

  const generated = await callGeminiStructuredJson<{
    singleMostImportantTask: TodayNavigatorPlan['singleMostImportantTask'];
    actionSteps: TodayTaskStep[];
    zeroCostCustomerAcquisitionTactic: TodayNavigatorPlan['zeroCostCustomerAcquisitionTactic'];
    antiDistractionRule: TodayNavigatorPlan['antiDistractionRule'];
    endOfDaySuccessMetrics: TodayNavigatorPlan['endOfDaySuccessMetrics'];
    expressThirtyMinPlan: TodayNavigatorPlan['expressThirtyMinPlan'];
    inferredAssumptionsNote?: string;
  }>({
    systemInstruction,
    prompt,
    responseSchema: TODAY_NAVIGATOR_SCHEMA,
    options,
    validate: (parsed) => {
      if (!parsed || typeof parsed !== 'object') throw new Error('Object expected');

      const focus = parsed.singleMostImportantTask;
      if (!focus || typeof focus !== 'object') throw new Error('singleMostImportantTask required');

      if (!Array.isArray(parsed.actionSteps) || parsed.actionSteps.length < 3) {
        throw new Error('At least 3 actionSteps required');
      }

      // Clamp/normalize step minutes to fit user's availableTime constraint if needed
      let rawSteps = parsed.actionSteps.slice(0, input.availableTime === '30m' ? 3 : 5).map((s: any, idx: number) => ({
        id: `step_${idx + 1}`,
        order: idx + 1,
        title: assertNonEmptyString(s?.title, 'step.title'),
        description: assertNonEmptyString(s?.description, 'step.description'),
        estimatedMinutes: Math.max(5, Math.min(maxMinutes, Math.round(Number(s?.estimatedMinutes) || 10))),
        completed: false,
      }));

      const totalMins = rawSteps.reduce((acc: number, s: TodayTaskStep) => acc + s.estimatedMinutes, 0);
      if (totalMins > maxMinutes) {
        const scale = maxMinutes / totalMins;
        rawSteps = rawSteps.map((s: TodayTaskStep, idx: number) => {
          if (idx === rawSteps.length - 1) {
            const used = rawSteps.slice(0, idx).reduce((sum: number, prev: TodayTaskStep) => sum + prev.estimatedMinutes, 0);
            return { ...s, estimatedMinutes: Math.max(5, maxMinutes - used) };
          }
          return { ...s, estimatedMinutes: Math.max(5, Math.floor(s.estimatedMinutes * scale)) };
        });
      }

      const tactic = parsed.zeroCostCustomerAcquisitionTactic;
      const anti = parsed.antiDistractionRule;
      const kpi = parsed.endOfDaySuccessMetrics;
      const express = parsed.expressThirtyMinPlan;
      if (!tactic || !anti || !kpi || !express || !Array.isArray(express.steps) || express.steps.length < 3) {
        throw new Error('Missing required TodayNavigator sections');
      }

      return {
        singleMostImportantTask: {
          title: assertNonEmptyString(focus.title, 'singleMostImportantTask.title'),
          rationale: assertNonEmptyString(focus.rationale, 'singleMostImportantTask.rationale'),
          expectedResult: assertNonEmptyString(focus.expectedResult, 'singleMostImportantTask.expectedResult'),
        },
        actionSteps: rawSteps,
        zeroCostCustomerAcquisitionTactic: {
          title: assertNonEmptyString(tactic.title, 'tactic.title'),
          channel: assertNonEmptyString(tactic.channel, 'tactic.channel'),
          stepByStep: Array.isArray(tactic.stepByStep) && tactic.stepByStep.length >= 2
            ? tactic.stepByStep.slice(0, 6).map((st: any) => assertNonEmptyString(st, 'tactic.step'))
            : ["Mavjud mijozlarga shaxsiy murojaat yuboring"],
          costNote: assertNonEmptyString(tactic.costNote, 'tactic.costNote'),
        },
        antiDistractionRule: {
          whatToAvoid: assertNonEmptyString(anti.whatToAvoid, 'antiDistraction.whatToAvoid'),
          whyItWastesTime: assertNonEmptyString(anti.whyItWastesTime, 'antiDistraction.whyItWastesTime'),
          practicalAlternative: assertNonEmptyString(anti.practicalAlternative, 'antiDistraction.practicalAlternative'),
        },
        endOfDaySuccessMetrics: {
          targetMetric: assertNonEmptyString(kpi.targetMetric, 'endOfDay.targetMetric'),
          verificationQuestion: assertNonEmptyString(kpi.verificationQuestion, 'endOfDay.verificationQuestion'),
          fallbackAssessment: assertNonEmptyString(kpi.fallbackAssessment, 'endOfDay.fallbackAssessment'),
        },
        expressThirtyMinPlan: {
          title: assertNonEmptyString(express.title, 'express.title'),
          steps: express.steps.slice(0, 3).map((st: any) => ({
            minuteMark: assertNonEmptyString(st?.minuteMark, 'express.minuteMark'),
            action: assertNonEmptyString(st?.action, 'express.action'),
          })),
        },
        inferredAssumptionsNote: cleanString(parsed.inferredAssumptionsNote, 400) || undefined,
      };
    },
  });

  const dateFormatted = new Intl.DateTimeFormat('uz-UZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    dateFormatted,
    input: {
      businessType: input.businessType,
      mainProblem: input.mainProblem,
      todayGoal: input.todayGoal,
      availableTime: input.availableTime,
      budget: input.budget,
      clientStatus: input.clientStatus,
    },
    ...generated,
  };
}
