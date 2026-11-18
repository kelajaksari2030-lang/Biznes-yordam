/**
 * BiznesYordam (BESTO) - Server-Side Gemini AI Integration Test Suite
 *
 * Covers all 5 AI endpoints:
 *   1. POST /api/generate-ad
 *   2. POST /api/ai/ad-lab
 *   3. POST /api/ai/customer-replies
 *   4. POST /api/ai/business-diagnostics
 *   5. POST /api/ai/today-navigator
 *
 * Verifies:
 *   - Successful structured JSON responses & GEMINI_MODEL ('gemini-4-hydrogen')
 *   - Invalid input rejection (400 invalid_argument) without quota consumption
 *   - Missing/placeholder GEMINI_API_KEY rejection (503 gemini_not_configured) + quota refund
 *   - Request timeout handling (504 gemini_timeout) + quota refund
 *   - Upstream API failure & retry + malformed JSON response rejection (502) + quota refund
 *   - Firebase Auth protection (401 unauthenticated)
 *   - Shared Free (5) / Pro (50) / Ultra (200) / Admin quota enforcement & concurrency lock
 *   - Frontend security check (no @google/genai or GEMINI_API_KEY in src/)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { NextFunction, Response } from 'express';
import { createApp } from '../server/src/index.js';
import { AuthenticatedRequest } from '../server/src/authMiddleware.js';
import {
  GEMINI_MODEL,
  GeminiClientLike,
  isGeminiConfigured,
  resolveGeminiApiKey,
} from '../server/src/geminiService.js';
import {
  QuotaStore,
  QuotaStoreTransaction,
  getTashkentDateKey,
} from '../server/src/quotaService.js';

class InMemoryQuotaStore implements QuotaStore {
  public users = new Map<string, { email?: string; currentPlan?: string; subscriptionStatus?: string }>();
  public usage = new Map<string, { adCount: number; lastGeneratedAt: string }>();
  private lock: Promise<void> = Promise.resolve();

  async runTransaction<T>(fn: (tx: QuotaStoreTransaction) => Promise<T>): Promise<T> {
    let release!: () => void;
    const prev = this.lock;
    this.lock = new Promise<void>((r) => {
      release = r;
    });
    await prev;

    try {
      const tx: QuotaStoreTransaction = {
        getUserProfile: async (userId) => {
          const p = this.users.get(userId);
          return p ? { ...p } : null;
        },
        getUsage: async (userId, usageDateKey) => {
          const u = this.usage.get(`${userId}/${usageDateKey}`);
          return u ? { ...u } : null;
        },
        setUsage: async (userId, usageDateKey, adCount, nowIso) => {
          this.usage.set(`${userId}/${usageDateKey}`, { adCount, lastGeneratedAt: nowIso });
        },
        updateUsage: async (userId, usageDateKey, adCount, nowIso) => {
          this.usage.set(`${userId}/${usageDateKey}`, { adCount, lastGeneratedAt: nowIso });
        },
      };
      return await fn(tx);
    } finally {
      release();
    }
  }
}

function makeTestAuthMiddleware() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        source: 'error',
        message: 'Auth required',
      });
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        source: 'error',
        message: 'Empty token',
      });
    }
    req.user = { uid: token } as any;
    next();
  };
}

async function withTestServer<T>(
  app: ReturnType<typeof createApp>,
  fn: (baseUrl: string) => Promise<T>
): Promise<T> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Failed to bind ephemeral port');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    return await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function createMockGeminiClient(): GeminiClientLike {
  return {
    async generateJson({ model, prompt }) {
      if (model !== GEMINI_MODEL) {
        throw new Error(`Unexpected model: ${model}`);
      }

      if (prompt.includes('reklama postini yozib bering')) {
        return JSON.stringify({
          adText: '✨ Erkaklar klassik soati — Sifat va zamonaviy uslub!\n✅ Tezkor yetkazib berish\n📩 Buyurtma uchun yozing.',
          headline: 'Erkaklar klassik soati',
          hashtags: ['#toshkent', '#savdo', '#soat'],
        });
      }

      if (prompt.includes("3 ta A/B reklama strategiyasini")) {
        return JSON.stringify({
          strategies: [
            {
              strategyType: 'direct_offer',
              title: "1-Strategiya: Aniq taklif",
              tagline: "Tezkor qaror uchun",
              hookHeadline: "Maxsus taklif!",
              bodyText: "Sifatli mahsulotni qulay shartlarda oling.",
              callToAction: "Directga yozing",
              recommendedAudience: "Iliq auditoriya",
              strength: "Tez murojaat",
              potentialWeakness: "Narxga sezgirlik",
              testingAdvice: "3 kun test qiling",
            },
            {
              strategyType: 'problem_solution',
              title: "2-Strategiya: Muammo va yechim",
              tagline: "Og'riqni yopish",
              hookHeadline: "Tanlashda qiynalayapsizmi?",
              bodyText: "Biz sizga tekshirilgan yechim taklif qilamiz.",
              callToAction: "Bepul maslahat oling",
              recommendedAudience: "Sovuq auditoriya",
              strength: "Chuqur qiziqish",
              potentialWeakness: "Matn uzunroq",
              testingAdvice: "Video formatda sinang",
            },
            {
              strategyType: 'social_proof',
              title: "3-Strategiya: Ijtimoiy isbot",
              tagline: "Ishonch uyg'otish",
              hookHeadline: "Mijozlarimiz fikri",
              bodyText: "Haqiqiy xaridorlar tajribasi bilan tanishing.",
              callToAction: "Sharhlarni ko'ring",
              recommendedAudience: "Keng auditoriya",
              strength: "Yuqori ishonch",
              potentialWeakness: "Haqiqiy dalil talab etadi",
              testingAdvice: "Skrinshot qo'shing",
            },
          ],
          metricsComparison: [
            {
              metric: 'CTR',
              description: 'Bosilish foizi',
              strategy1Focus: "O'rta",
              strategy2Focus: 'Yuqori',
              strategy3Focus: "O'rta",
              evaluationTip: "Sarlavhani tekshiring",
            },
            {
              metric: 'Leads',
              description: 'Murojaatlar',
              strategy1Focus: 'Tez savollar',
              strategy2Focus: 'Maslahat savollari',
              strategy3Focus: 'Ishonchli murojaat',
              evaluationTip: "CTA ni aniq yozing",
            },
            {
              metric: 'Konversiya',
              description: 'Xaridga aylanish',
              strategy1Focus: 'Yuqori',
              strategy2Focus: "O'rta",
              strategy3Focus: 'Barqaror',
              evaluationTip: "Javob tezligini oshiring",
            },
          ],
          recommendedStartingVariant: {
            strategyTitle: "1-Strategiya: Aniq taklif",
            reason: "Sotuv maqsadi uchun tez sinov beradi",
            disclaimer: "Bu dastlabki gipoteza; amaliy A/B test zarur.",
          },
          budgetTestingRecommendation: "3 kun davomida teng taqsimlab sinang.",
        });
      }

      if (prompt.includes('Mijozdan kelgan xabar:')) {
        return JSON.stringify({
          replies: [
            {
              title: 'Aniq va muloyim javob',
              category: 'price',
              replyText: "Assalomu alaykum! Mahsulot narxi 240 000 so'm, 2-3 soatda yetkazib beramiz.",
              usageTip: "Tezkor savol bergan mijozlar uchun mos.",
            },
            {
              title: 'Qiymatni tushuntiruvchi javob',
              category: 'product',
              replyText: "Assalomu alaykum! Sifat kafolati bilan beriladi, ko'rib to'lashingiz mumkin.",
              usageTip: "Ikkilanayotgan mijozlar uchun.",
            },
            {
              title: 'Buyurtmaga yoʻnaltiruvchi javob',
              category: 'delivery',
              replyText: "Assalomu alaykum! Qaysi manzilga yetkazish kerakligini yozsangiz, rasmiylashtiramiz.",
              usageTip: "Xaridga tayyor mijozlar uchun.",
            },
          ],
        });
      }

      if (prompt.includes('diagnostika va 7 kunlik')) {
        return JSON.stringify({
          summary: "Biznesingiz asosiy o'sish nuqtasi konversiya va qayta xaridlarda.",
          topRisks: [
            'Murojaatlarga kech javob berish',
            'Takroriy xaridlar tizimi yoʻqligi',
            'Marja nazorati sustligi',
          ],
          growthOpportunities: [
            'Toʻplam (bundle) sotuvlarini yoʻlga qoʻyish',
            'Eski mijozlarga Telegram xabarnoma',
            'Mijoz sharhlarini joylash',
          ],
          sevenDayActionPlan: [
            { day: '1-kun', task: 'Murojaatlar auditi', details: 'Oxirgi 20 ta savolni koʻrib chiqing' },
            { day: '2-kun', task: 'Taklif yangilash', details: 'Bonus qoʻshing' },
            { day: '3-kun', task: 'Shablonlar', details: 'Javob tezligini oshiring' },
            { day: '4-kun', task: 'Baza bilan ishlash', details: 'Eski mijozlarga yozing' },
            { day: '5-kun', task: 'Kontent', details: 'Sharh posti chiqaring' },
            { day: '6-kun', task: 'Foyda hisobi', details: 'Marjani tekshiring' },
            { day: '7-kun', task: 'Haftalik xulosa', details: 'Natijalarni solishtiring' },
          ],
          primaryPriorityTask: {
            title: "Murojaatga 5 daqiqada javob berish qoidasi",
            rationale: "Issiq mijozni yoʻqotmaslik uchun.",
            expectedOutcome: "Konversiya oshishi kutiladi.",
          },
          reasoningAndOutcome: {
            strategicReason: "Xarajatsiz ichki jarayonlarni kuchaytirish.",
            expectedImpact: "Barqaror buyurtmalar oqimi.",
            metricsToTrack: ['Konversiya foizi', "O'rtacha chek", 'Qayta xaridlar'],
          },
          confidenceNote: "Oylik tushum berilmagani uchun raqamli prognoz to'qilmadi.",
        });
      }

      if (prompt.includes('Bugungi kun uchun aniq harakatlar rejasini tuzib bering')) {
        return JSON.stringify({
          singleMostImportantTask: {
            title: "Oxirgi 10 ta iliq mijozga shaxsiy murojaat qilish",
            rationale: "Eng tez natija iliq bazadan keladi.",
            expectedResult: "Kamida 1-2 ta buyurtma.",
          },
          actionSteps: [
            { title: "Kontaktlarni yig'ish", description: 'Oxirgi yozganlarni ajrating', estimatedMinutes: 15 },
            { title: 'Audio/matn yuborish', description: 'Shaxsiy taklif yozing', estimatedMinutes: 25 },
            { title: 'Dialoglarni yopish', description: 'Buyurtmani rasmiylashtiring', estimatedMinutes: 20 },
          ],
          zeroCostCustomerAcquisitionTactic: {
            title: "0 so'm xarajatli qayta aloqa",
            channel: 'Telegram / WhatsApp',
            stepByStep: ['1-qadam: Roʻyxat tuzing', '2-qadam: Shaxsiy xabar yuboring'],
            costNote: "Xarajat: 0 so'm (mutlaqo bepul).",
          },
          antiDistractionRule: {
            whatToAvoid: 'Logotip va dizaynni qayta-qayta oʻzgartirish',
            whyItWastesTime: 'Kassaga pul olib kelmaydi',
            practicalAlternative: 'Mijozlar bilan bevosita gaplashing',
          },
          endOfDaySuccessMetrics: {
            targetMetric: 'Kamida 10 ta mijoz bilan muloqot',
            verificationQuestion: 'Bugun nechta real taklif berdim?',
            fallbackAssessment: 'Mijoz ehtiyojini aniqlash ham natija.',
          },
          expressThirtyMinPlan: {
            title: '30 daqiqalik shoshilinch reja',
            steps: [
              { minuteMark: '0-10 daqiqa', action: '5 ta mijozga yozing' },
              { minuteMark: '10-20 daqiqa', action: 'Stories joylang' },
              { minuteMark: '20-30 daqiqa', action: 'Javoblarni yoping' },
            ],
          },
          inferredAssumptionsNote: "Budjet ko'rsatilmagani uchun 0 so'mlik reja tuzildi.",
        });
      }

      throw new Error(`Unhandled prompt: ${prompt.slice(0, 80)}`);
    },
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING GEMINI AI BACKEND & SECURITY TEST SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${label}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${label}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // --- 1. Security static check: No @google/genai or GEMINI_API_KEY in frontend src/ ---
  {
    const srcDir = path.resolve(process.cwd(), 'src');
    const leakedFiles: string[] = [];
    function scanDir(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(full);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes('@google/genai') || content.includes('GEMINI_API_KEY')) {
            leakedFiles.push(path.relative(process.cwd(), full));
          }
        }
      }
    }
    scanDir(srcDir);
    assert(
      leakedFiles.length === 0,
      'Frontend src/ contains zero references to @google/genai or GEMINI_API_KEY',
      leakedFiles.join(', ')
    );
  }

  // --- 2. Placeholder / missing key detection ---
  {
    assert(resolveGeminiApiKey('') === '', 'Empty API key resolves to empty');
    assert(resolveGeminiApiKey('MY_GEMINI_API_KEY') === '', 'Placeholder API key rejected');
    assert(isGeminiConfigured('MY_GEMINI_API_KEY') === false, 'Placeholder isGeminiConfigured === false');
    assert(isGeminiConfigured('AIzaTestValidKey123') === true, 'Real-shaped key isGeminiConfigured === true');
  }

  // --- 2b. GET /health endpoint & 404 ordering ---
  {
    const previousKey = process.env.GEMINI_API_KEY;
    try {
      // Case A: GEMINI_API_KEY missing
      delete process.env.GEMINI_API_KEY;
      const appUnconfigured = createApp({ quotaStore: new InMemoryQuotaStore() });
      await withTestServer(appUnconfigured, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/health`);
        const raw = await res.text();
        const json: any = JSON.parse(raw);
        assert(
          res.status === 200 &&
            json.status === 'ok' &&
            json.geminiConfigured === false &&
            Object.keys(json).length === 2,
          'GET /health returns { status: "ok", geminiConfigured: false } when GEMINI_API_KEY is unset'
        );

        const notFoundRes = await fetch(`${baseUrl}/route-does-not-exist`);
        const notFoundJson: any = await notFoundRes.json();
        assert(
          notFoundRes.status === 404 && notFoundJson.error === 'not_found',
          'Unknown route hits 404 handler while GET /health is registered before it'
        );
      });

      // Case B: GEMINI_API_KEY placeholder rejected
      process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
      await withTestServer(appUnconfigured, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/health`);
        const json: any = await res.json();
        assert(
          res.status === 200 && json.status === 'ok' && json.geminiConfigured === false,
          'GET /health returns geminiConfigured: false for placeholder GEMINI_API_KEY'
        );
      });

      // Case C: GEMINI_API_KEY configured via process.env (must not leak secret)
      const secretEnvKey = 'AIzaSyHealthTestSecretValue987654';
      process.env.GEMINI_API_KEY = secretEnvKey;
      await withTestServer(appUnconfigured, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/health`);
        const raw = await res.text();
        const json: any = JSON.parse(raw);
        assert(
          res.status === 200 &&
            json.status === 'ok' &&
            json.geminiConfigured === true &&
            Object.keys(json).length === 2 &&
            !raw.includes(secretEnvKey),
          'GET /health returns { status: "ok", geminiConfigured: true } from GEMINI_API_KEY without exposing secret'
        );
      });
    } finally {
      if (previousKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = previousKey;
      }
    }
  }

  // --- 3. Successful structured JSON responses across all 5 endpoints ---
  {
    const quotaStore = new InMemoryQuotaStore();
    quotaStore.users.set('pro_user_1', { currentPlan: 'pro', subscriptionStatus: 'active' });

    const app = createApp({
      authMiddleware: makeTestAuthMiddleware(),
      quotaStore,
      geminiOptions: { clientOverride: createMockGeminiClient() },
    });

    await withTestServer(app, async (baseUrl) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer pro_user_1',
      };

      // 3a. Ad Generator
      const r1 = await fetch(`${baseUrl}/api/generate-ad`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ productName: 'Klassik soat', platform: 'telegram', tone: 'friendly' }),
      });
      const j1: any = await r1.json();
      assert(
        r1.status === 200 && j1.success && j1.source === 'gemini' && j1.model === GEMINI_MODEL && Boolean(j1.adText) && j1.adCount === 1,
        'POST /api/generate-ad returns Gemini structured ad & increments quota to 1'
      );

      // 3b. Ad Lab
      const r2 = await fetch(`${baseUrl}/api/ai/ad-lab`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productOrService: 'Klassik soat',
          targetAudience: 'Erkaklar',
          platform: 'instagram',
          objective: 'sales',
        }),
      });
      const j2: any = await r2.json();
      assert(
        r2.status === 200 && j2.success && j2.source === 'gemini' && j2.data?.strategies?.length === 3 && j2.adCount === 2,
        'POST /api/ai/ad-lab returns 3 strategies & increments quota to 2'
      );

      // 3c. Customer Replies
      const r3 = await fetch(`${baseUrl}/api/ai/customer-replies`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerMessage: 'Narxi qancha va qachon yetadi?',
          tone: 'friendly',
          price: '240 000',
        }),
      });
      const j3: any = await r3.json();
      assert(
        r3.status === 200 && j3.success && j3.source === 'gemini' && j3.data?.replies?.length === 3 && j3.adCount === 3,
        'POST /api/ai/customer-replies returns 3 structured suggestions & increments quota to 3'
      );

      // 3d. Business Diagnostics
      const r4 = await fetch(`${baseUrl}/api/ai/business-diagnostics`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          businessType: "Kiyim do'koni",
          productOrService: 'Erkaklar kostyumi',
          targetAudience: 'Tadbirkorlar',
          mainProblem: 'Konversiya past',
          currentGoal: 'Sotuvni oshirish',
        }),
      });
      const j4: any = await r4.json();
      assert(
        r4.status === 200 &&
          j4.success &&
          j4.source === 'gemini' &&
          j4.data?.topRisks?.length === 3 &&
          j4.data?.sevenDayActionPlan?.length === 7 &&
          j4.adCount === 4,
        'POST /api/ai/business-diagnostics returns structured 7-day report & increments quota to 4'
      );

      // 3e. Today Navigator (including 30m step minutes clamping)
      const r5 = await fetch(`${baseUrl}/api/ai/today-navigator`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          businessType: "Chakana do'kon",
          mainProblem: 'Bugun mijoz kam',
          todayGoal: '2 ta buyurtma olish',
          availableTime: '30m',
        }),
      });
      const j5: any = await r5.json();
      const totalMins30 = (j5.data?.actionSteps || []).reduce((acc: number, s: any) => acc + s.estimatedMinutes, 0);
      assert(
        r5.status === 200 &&
          j5.success &&
          j5.source === 'gemini' &&
          j5.data?.actionSteps?.length === 3 &&
          totalMins30 <= 30 &&
          j5.adCount === 5,
        `POST /api/ai/today-navigator clamps 30m plan (${totalMins30}m <= 30m) & increments quota to 5`
      );
    });
  }

  // --- 4. Unauthenticated & Invalid Input Rejection (zero quota spent) ---
  {
    const quotaStore = new InMemoryQuotaStore();
    quotaStore.users.set('free_user_1', { currentPlan: 'free', subscriptionStatus: 'active' });
    const app = createApp({
      authMiddleware: makeTestAuthMiddleware(),
      quotaStore,
      geminiOptions: { clientOverride: createMockGeminiClient() },
    });

    await withTestServer(app, async (baseUrl) => {
      const unauthRes = await fetch(`${baseUrl}/api/ai/ad-lab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productOrService: 'Test', targetAudience: 'All' }),
      });
      assert(unauthRes.status === 401, 'Unauthenticated request to /api/ai/ad-lab rejected with 401');

      const invalidHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer free_user_1' };
      const badAd = await fetch(`${baseUrl}/api/generate-ad`, {
        method: 'POST',
        headers: invalidHeaders,
        body: JSON.stringify({ productName: '' }),
      });
      const badReplies = await fetch(`${baseUrl}/api/ai/customer-replies`, {
        method: 'POST',
        headers: invalidHeaders,
        body: JSON.stringify({ customerMessage: '   ' }),
      });
      const badDiag = await fetch(`${baseUrl}/api/ai/business-diagnostics`, {
        method: 'POST',
        headers: invalidHeaders,
        body: JSON.stringify({ businessType: 'Shop' }),
      });
      const badToday = await fetch(`${baseUrl}/api/ai/today-navigator`, {
        method: 'POST',
        headers: invalidHeaders,
        body: JSON.stringify({ businessType: 'Shop' }),
      });

      const dateKey = getTashkentDateKey();
      const usageAfterInvalid = quotaStore.usage.get(`free_user_1/${dateKey}`)?.adCount || 0;
      assert(
        badAd.status === 400 &&
          badReplies.status === 400 &&
          badDiag.status === 400 &&
          badToday.status === 400 &&
          usageAfterInvalid === 0,
        'Invalid inputs return 400 invalid_argument and consume 0 quota'
      );
    });
  }

  // --- 5. Missing GEMINI_API_KEY, Timeout, Malformed JSON, and Upstream Failure + Quota Refund ---
  {
    const quotaStore = new InMemoryQuotaStore();
    quotaStore.users.set('free_err_user', { currentPlan: 'free', subscriptionStatus: 'active' });
    const prevKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      // 5a. Missing API key -> 503 gemini_not_configured, quota refunded to 0
      const noKeyApp = createApp({
        authMiddleware: makeTestAuthMiddleware(),
        quotaStore,
        geminiOptions: { apiKey: '' },
      });

      await withTestServer(noKeyApp, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/ai/customer-replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer free_err_user' },
          body: JSON.stringify({ customerMessage: 'Narxi qancha?' }),
        });
        const json: any = await res.json();
        const dateKey = getTashkentDateKey();
        const usageCount = quotaStore.usage.get(`free_err_user/${dateKey}`)?.adCount || 0;

        assert(
          res.status === 503 &&
            json.success === false &&
            json.error === 'gemini_not_configured' &&
            json.source === 'error' &&
            usageCount === 0,
          'Missing GEMINI_API_KEY returns 503 gemini_not_configured (honest error) and refunds quota to 0'
        );
      });
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
    }

    // 5b. Timeout -> 504 gemini_timeout, quota refunded to 0
    const slowApp = createApp({
      authMiddleware: makeTestAuthMiddleware(),
      quotaStore,
      geminiOptions: {
        timeoutMs: 80,
        clientOverride: {
          generateJson: () => new Promise((resolve) => setTimeout(() => resolve('{}'), 500)),
        },
      },
    });

    await withTestServer(slowApp, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/ai/today-navigator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer free_err_user' },
        body: JSON.stringify({
          businessType: "Do'kon",
          mainProblem: 'Savdo kam',
          todayGoal: 'Buyurtma olish',
          availableTime: '1h',
        }),
      });
      const json: any = await res.json();
      const dateKey = getTashkentDateKey();
      const usageCount = quotaStore.usage.get(`free_err_user/${dateKey}`)?.adCount || 0;

      assert(
        res.status === 504 && json.error === 'gemini_timeout' && usageCount === 0,
        'Slow upstream triggers 504 gemini_timeout and refunds quota to 0'
      );
    });

    // 5c. Malformed JSON -> 502 gemini_invalid_response, quota refunded to 0
    const badJsonApp = createApp({
      authMiddleware: makeTestAuthMiddleware(),
      quotaStore,
      geminiOptions: {
        clientOverride: {
          generateJson: async () => 'NOT_VALID_JSON {{{',
        },
      },
    });

    await withTestServer(badJsonApp, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/generate-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer free_err_user' },
        body: JSON.stringify({ productName: 'Test product' }),
      });
      const json: any = await res.json();
      const dateKey = getTashkentDateKey();
      const usageCount = quotaStore.usage.get(`free_err_user/${dateKey}`)?.adCount || 0;

      assert(
        res.status === 502 && json.error === 'gemini_invalid_response' && usageCount === 0,
        'Malformed Gemini JSON triggers 502 gemini_invalid_response and refunds quota'
      );
    });

    // 5d. Transient 503 failure recovers on automatic retry
    let attempts = 0;
    const flakyApp = createApp({
      authMiddleware: makeTestAuthMiddleware(),
      quotaStore,
      geminiOptions: {
        retryDelayMs: 20,
        clientOverride: {
          generateJson: async (params) => {
            attempts++;
            if (attempts === 1) {
              const err: any = new Error('503 Service Unavailable');
              err.status = 503;
              throw err;
            }
            return createMockGeminiClient().generateJson(params);
          },
        },
      },
    });

    await withTestServer(flakyApp, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/generate-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer free_err_user' },
        body: JSON.stringify({ productName: 'Klassik soat' }),
      });
      const json: any = await res.json();
      assert(
        res.status === 200 && attempts === 2 && json.adCount === 1,
        'Transient 503 error automatically retries once and succeeds'
      );
    });
  }

  // --- 6. Quota Enforcement: Free (5), Pro (50), Ultra (200), Admin & Concurrency ---
  {
    const quotaStore = new InMemoryQuotaStore();
    const today = getTashkentDateKey();

    quotaStore.users.set('q_free', { currentPlan: 'free', subscriptionStatus: 'active' });
    quotaStore.users.set('q_pro', { currentPlan: 'pro', subscriptionStatus: 'active' });
    quotaStore.users.set('q_ultra', { currentPlan: 'ultra', subscriptionStatus: 'active' });
    quotaStore.users.set('q_admin', {
      currentPlan: 'free',
      subscriptionStatus: 'active',
      email: 'kelajaksari2030@gmail.com',
    });

    // Seed near-limit counts for Pro (49/50) & Ultra (199/200)
    quotaStore.usage.set(`q_pro/${today}`, { adCount: 49, lastGeneratedAt: new Date().toISOString() });
    quotaStore.usage.set(`q_ultra/${today}`, { adCount: 199, lastGeneratedAt: new Date().toISOString() });
    quotaStore.usage.set(`q_free/${today}`, { adCount: 3, lastGeneratedAt: new Date().toISOString() });

    const app = createApp({
      authMiddleware: makeTestAuthMiddleware(),
      quotaStore,
      geminiOptions: { clientOverride: createMockGeminiClient() },
    });

    await withTestServer(app, async (baseUrl) => {
      // Concurrency on q_free (2 remaining out of 5): fire 5 simultaneous requests
      const concurrentResponses = await Promise.all(
        Array.from({ length: 5 }, () =>
          fetch(`${baseUrl}/api/ai/customer-replies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer q_free' },
            body: JSON.stringify({ customerMessage: 'Yetkazish bormi?' }),
          }).then((r) => r.status)
        )
      );
      const okCount = concurrentResponses.filter((s) => s === 200).length;
      const quotaExceededCount = concurrentResponses.filter((s) => s === 429).length;
      assert(
        okCount === 2 && quotaExceededCount === 3,
        `Concurrency: strictly 2 allowed and 3 rejected with 429 (got ok=${okCount}, 429=${quotaExceededCount})`
      );

      // Pro boundary: 50th ok, 51st 429
      const pro50 = await fetch(`${baseUrl}/api/ai/ad-lab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer q_pro' },
        body: JSON.stringify({ productOrService: 'Soat', targetAudience: 'Erkaklar' }),
      });
      const pro51 = await fetch(`${baseUrl}/api/ai/ad-lab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer q_pro' },
        body: JSON.stringify({ productOrService: 'Soat', targetAudience: 'Erkaklar' }),
      });
      assert(pro50.status === 200 && pro51.status === 429, 'Pro tier enforces 50/day limit (50th 200, 51st 429)');

      // Ultra boundary: 200th ok, 201st 429
      const ultra200 = await fetch(`${baseUrl}/api/generate-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer q_ultra' },
        body: JSON.stringify({ productName: 'Soat' }),
      });
      const ultra201 = await fetch(`${baseUrl}/api/generate-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer q_ultra' },
        body: JSON.stringify({ productName: 'Soat' }),
      });
      assert(ultra200.status === 200 && ultra201.status === 429, 'Ultra tier enforces 200/day limit (200th 200, 201st 429)');

      // Admin bypasses free limit (6th succeeds with dailyLimit: 999999)
      quotaStore.usage.set(`q_admin/${today}`, { adCount: 10, lastGeneratedAt: new Date().toISOString() });
      const adminRes = await fetch(`${baseUrl}/api/generate-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer q_admin' },
        body: JSON.stringify({ productName: 'Admin test product' }),
      });
      const adminJson: any = await adminRes.json();
      assert(
        adminRes.status === 200 && adminJson.dailyLimit === 999999 && adminJson.adCount === 11,
        'Verified admin (kelajaksari2030@gmail.com) gets unlimited quota (999999)'
      );
    });
  }

  console.log('\n====================================================');
  console.log(`🏁 GEMINI AI TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
