/**
 * BiznesYordam - Standalone Express Backend Web Service for Render
 * Enforces daily ad generation quotas via Firebase Admin SDK & Named Firestore Database
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireFirebaseAuth, AuthenticatedRequest } from './authMiddleware.js';
import {
  enforceQuotaAndGenerateAd,
  QuotaExceededError,
  PLAN_DAILY_LIMITS,
} from './quotaService.js';
import {
  isFirebaseAdminInitialized,
  NAMED_DATABASE_ID,
  PROJECT_ID,
} from './firebaseAdmin.js';
import { AdFormData } from './adGenerator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middlewares
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
    credentials: true,
  })
);
app.use(express.json());

// Health Check & Status Endpoint (Useful for Render health checks and wake-up verification)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'biznesyordam-backend',
    firebaseAdminInitialized: isFirebaseAdminInitialized,
    projectId: PROJECT_ID,
    firestoreDatabaseId: NAMED_DATABASE_ID,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req: Request, res: Response) => {
  res.status(200).send(`
    <html>
      <head><title>BiznesYordam API</title></head>
      <body style="font-family: sans-serif; padding: 40px; background: #FAF6F0; color: #493329;">
        <h2>✨ BiznesYordam Backend API</h2>
        <p>Render bepul web xizmati faol ishlamoqda.</p>
        <ul>
          <li>Status: <strong>Healthy</strong></li>
          <li>Loyiha: <code>${PROJECT_ID}</code></li>
          <li>Ma'lumotlar bazasi: <code>${NAMED_DATABASE_ID}</code></li>
          <li>Himoyalangan endpoint: <code>POST /api/generate-ad</code></li>
        </ul>
      </body>
    </html>
  `);
});

/**
 * Protected Route: POST /api/generate-ad
 * Requires valid Firebase Auth ID token
 * Enforces authoritative daily quota atomically in Firestore
 */
app.post(
  '/api/generate-ad',
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        message: "Foydalanuvchi identifikatori topilmadi.",
      });
    }

    const rawData = req.body as Partial<AdFormData>;
    const productName = (rawData.productName || '').trim();

    if (!productName) {
      return res.status(400).json({
        success: false,
        error: 'invalid_argument',
        message: "Mahsulot yoki xizmat nomi ko'rsatilishi shart.",
      });
    }

    const formData: AdFormData = {
      productName,
      targetAudience: (rawData.targetAudience || '').trim(),
      keyBenefits: (rawData.keyBenefits || '').trim(),
      platform: rawData.platform === 'instagram' ? 'instagram' : 'telegram',
      tone: ['friendly', 'formal', 'short', 'urgent'].includes(rawData.tone as string)
        ? (rawData.tone as any)
        : 'friendly',
      variant: ['classic', 'discount', 'problem_solution', 'social_proof'].includes(
        rawData.variant as string
      )
        ? (rawData.variant as any)
        : 'classic',
      specialOffer: (rawData.specialOffer || '').trim(),
      contactInfo: (rawData.contactInfo || '').trim(),
    };

    try {
      const result = await enforceQuotaAndGenerateAd(userId, formData);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      if (error instanceof QuotaExceededError) {
        return res.status(429).json({
          success: false,
          error: 'quota_exceeded',
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

      console.error('Ad generation processing error:', error);
      return res.status(500).json({
        success: false,
        error: 'internal',
        message:
          error?.message ||
          "Serverda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.",
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(`[BiznesYordam Backend] Server listening on port ${PORT}`);
  console.log(`[BiznesYordam Backend] Target Firestore: ${NAMED_DATABASE_ID}`);
});
