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
  createOrder,
  handleClickPrepare,
  handleClickComplete,
  handleClickCancel,
} from './clickService.js';
import {
  isFirebaseAdminInitialized,
  NAMED_DATABASE_ID,
  PROJECT_ID,
  adminDb,
  adminAuth,
  serviceAccountEmail,
} from './firebaseAdmin.js';

import { AdFormData } from './adGenerator.js';
import { provisionAdminClaims } from './adminClaimProvisioning.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const ALLOWED_CORS_ORIGINS = new Set(
  (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header are typically server-to-server or local health checks.
      if (!origin) return callback(null, true);
      // Browser origins must be explicitly allowlisted in CORS_ORIGIN (comma-separated).
      return callback(null, ALLOWED_CORS_ORIGINS.has(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json());


// Health Check & Status Endpoint (Useful for Render health checks and wake-up verification)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
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
 * Click Payment API Routes
 */

app.post('/api/payment/click/create-order', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
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

app.get('/api/payment/click/status/:orderId', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'internal' });
  }
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
      const result = await enforceQuotaAndGenerateAd(userId, formData, req.user?.admin === true);

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

      const errMsg = error?.message || String(error);
      const errCode = error?.code;
      console.error(`Ad generation processing error [Code ${errCode}]:`, errMsg);

      if (errMsg.includes('Could not load the default credentials')) {
        return res.status(500).json({
          success: false,
          error: 'credentials_missing',
          message:
            "Render backend serverida Firebase Service Account kaliti topilmadi. Iltimos, Render Dashboard ➔ Environment bo'limiga FIREBASE_SERVICE_ACCOUNT_KEY ni kiriting.",
        });
      }

      if (errCode === 7 || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('permission')) {
        console.error(`[Firestore 7 PERMISSION_DENIED] Backend service account lacks database permissions.`);
        return res.status(500).json({
          success: false,
          error: 'permission_denied',
          message: "Serverda ma'lumotlar bazasiga ulanish huquqi bilan bog'liq xatolik yuz berdi. Iltimos, administratorga murojaat qiling.",
        });
      }


      return res.status(500).json({
        success: false,
        error: 'internal',
        message:
          errMsg ||
          "Serverda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.",
      });

    }
  }
);

if (isFirebaseAdminInitialized) {
  void provisionAdminClaims(adminAuth, process.env.FIREBASE_ADMIN_CLAIM_UIDS)
    .then(({ updated, unchanged }) => {
      if (updated || unchanged) {
        console.log(`[Admin Claim Provisioning] updated=${updated}, unchanged=${unchanged}`);
      }
    })
    .catch((error) => {
      console.error('[Admin Claim Provisioning] Failed to provision configured admin claims:', error);
    });
}

app.listen(PORT, () => {
  console.log(`[BiznesYordam Backend] Server listening on port ${PORT}`);
  console.log(`[BiznesYordam Backend] Target Firestore: ${NAMED_DATABASE_ID}`);
});
