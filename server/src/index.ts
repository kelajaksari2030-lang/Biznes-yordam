/**
 * BiznesYordam - Standalone Express Backend Web Service for Render
 * Enforces daily AI generation quotas via Firebase Admin SDK & Named Firestore Database
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { requireFirebaseAuth, AuthenticatedRequest } from './authMiddleware.js';
import {
  enforceQuotaAndGenerateAd,
  executeWithAiQuota,
  QuotaExceededError,
  QuotaStore,
} from './quotaService.js';
import {
  createOrder,
  handleClickPrepare,
  handleClickComplete,
  handleClickCancel,
} from './clickService.js';
import {
  NAMED_DATABASE_ID,
  PROJECT_ID,
  adminDb,
} from './firebaseAdmin.js';
import {
  GEMINI_MODEL,
  GeminiCallOptions,
  GeminiServiceError,
  generateAdLabWithGemini,
  generateBusinessDiagnosticsWithGemini,
  generateCustomerRepliesWithGemini,
  generateTodayPlanWithGemini,
  isGeminiConfigured,
  validateAdGeneratorInput,
  validateAdLabInput,
  validateBusinessDiagnosticsInput,
  validateCustomerRepliesInput,
  validateTodayNavigatorInput,
} from './geminiService.js';

dotenv.config();

export interface AppDependencies {
  authMiddleware?: (req: AuthenticatedRequest, res: Response, next: NextFunction) => any;
  quotaStore?: QuotaStore;
  geminiOptions?: GeminiCallOptions;
}

function handleAiEndpointError(error: any, res: Response, contextLabel: string) {
  if (error instanceof QuotaExceededError) {
    return res.status(429).json({
      success: false,
      error: 'quota_exceeded',
      source: 'error',
      message: error.message,
      details: {
        currentCount: error.currentCount,
        dailyLimit: error.dailyLimit,
        remaining: 0,
        plan: error.plan,
        date: error.date,
      },
    });
  }

  if (error instanceof GeminiServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.code,
      source: 'error',
      message: error.message,
    });
  }

  const errMsg = error?.message || String(error);
  const errCode = error?.code;
  console.error(`${contextLabel} error [Code ${errCode}]:`, errMsg);

  if (errMsg.includes('Could not load the default credentials')) {
    return res.status(500).json({
      success: false,
      error: 'credentials_missing',
      source: 'error',
      message:
        "Render backend serverida Firebase Service Account kaliti topilmadi. Iltimos, Render Dashboard ➔ Environment bo'limiga FIREBASE_SERVICE_ACCOUNT_KEY ni kiriting.",
    });
  }

  if (errCode === 7 || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('permission')) {
    console.error(`[Firestore 7 PERMISSION_DENIED] Backend service account lacks database permissions.`);
    return res.status(500).json({
      success: false,
      error: 'permission_denied',
      source: 'error',
      message:
        "Serverda ma'lumotlar bazasiga ulanish huquqi bilan bog'liq xatolik yuz berdi. Iltimos, administratorga murojaat qiling.",
    });
  }

  return res.status(500).json({
    success: false,
    error: 'internal',
    source: 'error',
    message: errMsg || "Serverda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.",
  });
}

export function createApp(deps?: AppDependencies) {
  const app = express();
  const authGuard = deps?.authMiddleware || requireFirebaseAuth;

  const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
  const allowedOrigins = CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS policy: Origin not allowed'), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      geminiConfigured: isGeminiConfigured(deps?.geminiOptions?.apiKey),
    });
  });

  app.get('/', (_req: Request, res: Response) => {
    res.status(200).send(`
      <html>
        <head><title>BiznesYordam API</title></head>
        <body style="font-family: sans-serif; padding: 40px; background: #FAF6F0; color: #493329;">
          <h2>✨ BiznesYordam Backend API</h2>
          <p>Render web xizmati faol ishlamoqda.</p>
          <ul>
            <li>Status: <strong>Healthy</strong></li>
            <li>Loyiha: <code>${PROJECT_ID}</code></li>
            <li>Ma'lumotlar bazasi: <code>${NAMED_DATABASE_ID}</code></li>
            <li>AI Model: <code>${GEMINI_MODEL}</code> (${isGeminiConfigured(deps?.geminiOptions?.apiKey) ? 'Configured' : 'GEMINI_API_KEY not configured'})</li>
            <li>AI Endpointlar: <code>/api/generate-ad</code>, <code>/api/ai/ad-lab</code>, <code>/api/ai/customer-replies</code>, <code>/api/ai/business-diagnostics</code>, <code>/api/ai/today-navigator</code></li>
          </ul>
        </body>
      </html>
    `);
  });

  /**
   * Click Payment API Routes
   */
  app.post('/api/payment/click/create-order', authGuard, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ success: false, error: 'unauthenticated' });

    const { plan } = req.body;
    if (plan !== 'pro' && plan !== 'ultra') {
      return res.status(400).json({ success: false, error: 'invalid_plan' });
    }

    try {
      const order = await createOrder(userId, req.user?.email || null, plan);
      res.json({ success: true, ...order });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  app.post('/api/payment/click/prepare', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
    const result = await handleClickPrepare(req.body);
    res.json(result);
  });

  app.post('/api/payment/click/complete', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
    if (String(req.body.action) === '2') {
      const result = await handleClickCancel(req.body);
      return res.json(result);
    }
    const result = await handleClickComplete(req.body);
    res.json(result);
  });

  app.get('/api/payment/click/status/:orderId', authGuard, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.uid;
    const { orderId } = req.params;
    try {
      const orderRef = adminDb.collection('orders').doc(orderId);
      const snap = await orderRef.get();
      if (!snap.exists || snap.data()?.userId !== userId) {
        return res.status(404).json({ success: false, error: 'not_found' });
      }
      const data = snap.data() as any;
      res.json({ success: true, status: data.status, plan: data.plan });
    } catch {
      res.status(500).json({ success: false, error: 'internal' });
    }
  });

  /**
   * Protected AI Route 1: POST /api/generate-ad
   */
  app.post('/api/generate-ad', authGuard, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        source: 'error',
        message: "Foydalanuvchi identifikatori topilmadi.",
      });
    }

    try {
      const validatedInput = validateAdGeneratorInput(req.body);
      const result = await enforceQuotaAndGenerateAd(userId, validatedInput, {
        quotaStore: deps?.quotaStore,
        geminiOptions: deps?.geminiOptions,
      });

      return res.status(200).json({
        success: true,
        source: 'gemini',
        model: GEMINI_MODEL,
        ...result,
      });
    } catch (error: any) {
      return handleAiEndpointError(error, res, 'Ad generation');
    }
  });

  /**
   * Protected AI Route 2: POST /api/ai/ad-lab
   */
  app.post('/api/ai/ad-lab', authGuard, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        source: 'error',
        message: "Foydalanuvchi identifikatori topilmadi.",
      });
    }

    try {
      const validatedInput = validateAdLabInput(req.body);
      const { result, quota } = await executeWithAiQuota(
        userId,
        validatedInput.simulatedTier,
        () => generateAdLabWithGemini(validatedInput, deps?.geminiOptions),
        { quotaStore: deps?.quotaStore }
      );

      return res.status(200).json({
        success: true,
        source: 'gemini',
        model: GEMINI_MODEL,
        data: result,
        ...quota,
      });
    } catch (error: any) {
      return handleAiEndpointError(error, res, 'Ad Lab AI');
    }
  });

  /**
   * Protected AI Route 3: POST /api/ai/customer-replies
   */
  app.post('/api/ai/customer-replies', authGuard, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        source: 'error',
        message: "Foydalanuvchi identifikatori topilmadi.",
      });
    }

    try {
      const validatedInput = validateCustomerRepliesInput(req.body);
      const { result, quota } = await executeWithAiQuota(
        userId,
        validatedInput.simulatedTier,
        () => generateCustomerRepliesWithGemini(validatedInput, deps?.geminiOptions),
        { quotaStore: deps?.quotaStore }
      );

      return res.status(200).json({
        success: true,
        source: 'gemini',
        model: GEMINI_MODEL,
        data: result,
        ...quota,
      });
    } catch (error: any) {
      return handleAiEndpointError(error, res, 'Customer Replies AI');
    }
  });

  /**
   * Protected AI Route 4: POST /api/ai/business-diagnostics
   */
  app.post('/api/ai/business-diagnostics', authGuard, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        source: 'error',
        message: "Foydalanuvchi identifikatori topilmadi.",
      });
    }

    try {
      const validatedInput = validateBusinessDiagnosticsInput(req.body);
      const { result, quota } = await executeWithAiQuota(
        userId,
        validatedInput.simulatedTier,
        () => generateBusinessDiagnosticsWithGemini(validatedInput, deps?.geminiOptions),
        { quotaStore: deps?.quotaStore }
      );

      return res.status(200).json({
        success: true,
        source: 'gemini',
        model: GEMINI_MODEL,
        data: result,
        ...quota,
      });
    } catch (error: any) {
      return handleAiEndpointError(error, res, 'Business Diagnostics AI');
    }
  });

  /**
   * Protected AI Route 5: POST /api/ai/today-navigator
   */
  app.post('/api/ai/today-navigator', authGuard, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        source: 'error',
        message: "Foydalanuvchi identifikatori topilmadi.",
      });
    }

    try {
      const validatedInput = validateTodayNavigatorInput(req.body);
      const { result, quota } = await executeWithAiQuota(
        userId,
        validatedInput.simulatedTier,
        () => generateTodayPlanWithGemini(validatedInput, deps?.geminiOptions),
        { quotaStore: deps?.quotaStore }
      );

      return res.status(200).json({
        success: true,
        source: 'gemini',
        model: GEMINI_MODEL,
        data: result,
        ...quota,
      });
    } catch (error: any) {
      return handleAiEndpointError(error, res, 'Today Navigator AI');
    }
  });

  // 404 catch-all handler (registered strictly after /health and all API routes)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'not_found',
      message: 'Endpoint topilmadi.',
    });
  });

  return app;
}

function isDirectEntryInvocation(): boolean {
  if (typeof process === 'undefined' || !Array.isArray(process.argv) || !process.argv[1]) {
    return false;
  }
  try {
    const resolvedEntry = fs.realpathSync(process.argv[1]);
    return import.meta.url === pathToFileURL(resolvedEntry).href;
  } catch {
    return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
  }
}

if (isDirectEntryInvocation()) {
  const app = createApp();
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, () => {
    console.log(`[BiznesYordam Backend] Server listening on port ${PORT}`);
    console.log(`[BiznesYordam Backend] Target Firestore: ${NAMED_DATABASE_ID}`);
    console.log(
      `[BiznesYordam Backend] Gemini Model: ${GEMINI_MODEL} (${isGeminiConfigured() ? 'API key present' : 'GEMINI_API_KEY missing'})`
    );
  });
}
