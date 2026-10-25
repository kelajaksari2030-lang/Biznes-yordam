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
} from './clickService.js';
import {
  isFirebaseAdminInitialized,
  NAMED_DATABASE_ID,
  PROJECT_ID,
  adminDb,
  serviceAccountEmail,
} from './firebaseAdmin.js';

import { AdFormData } from './adGenerator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all requesting origins (AI Studio Preview, Render Static Site, etc.)
      return callback(null, true);
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

app.get('/debug-db', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const collections = await adminDb.listCollections();
    res.json({
        success: true,
        collections: collections.map((c: any) => c.id),
        projectId: PROJECT_ID,
        databaseId: NAMED_DATABASE_ID
    });
  } catch (err: any) {
    res.status(500).json({ 
      success: false,
      error: err.message, 
      databaseId: NAMED_DATABASE_ID,
      projectId: PROJECT_ID
    });
  }
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
    console.warn('[Click] action=2 (Cancel) received but not implemented.');
    return res.json({ error: 0, error_note: 'Not implemented' });
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
        console.error(
          `[Firestore 7 PERMISSION_DENIED] Service Account "${serviceAccountEmail}" does not have write/read permissions on database "${NAMED_DATABASE_ID}" in project "${PROJECT_ID}". Check IAM roles in Google Cloud Console.`
        );
        return res.status(500).json({
          success: false,
          error: 'permission_denied',
          message: `Firebase Firestore ruxsat xatosi (Code 7 PERMISSION_DENIED). "${serviceAccountEmail}" xizmat hisobi "${PROJECT_ID}" loyihasidagi "${NAMED_DATABASE_ID}" ma'lumotlar bazasiga kirish huquqiga ega emas. Google Cloud Console -> IAM bo'limida ushbu hisobga 'Cloud Datastore User' yoki 'Firebase Admin' rolini bering.`,
          details: {
            serviceAccountEmail,
            projectId: PROJECT_ID,
            databaseId: NAMED_DATABASE_ID,
          },
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

app.listen(PORT, () => {
  console.log(`[BiznesYordam Backend] Server listening on port ${PORT}`);
  console.log(`[BiznesYordam Backend] Target Firestore: ${NAMED_DATABASE_ID}`);
});
