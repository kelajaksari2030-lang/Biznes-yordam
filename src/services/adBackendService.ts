/**
 * BiznesYordam - Client Service for Backend-Enforced Ad Generation
 * 
 * Securely communicates with:
 * 1. Free Render Node.js Backend Web Service (via VITE_BACKEND_API_URL)
 * 2. Or Firebase Cloud Functions callable (generateAd)
 * 
 * Strict Enforcement:
 * - Always sends Firebase Authentication ID token
 * - Never computes or generates ad text directly in the browser
 * - Displays clear status for Render cold-starts (free tier sleep)
 */

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from './firebase';
import { AdFormData } from '../types';

export interface BackendAdResponse {
  success: boolean;
  adText: string;
  adCount: number;
  dailyLimit: number;
  remaining: number;
  plan: 'free' | 'pro' | 'ultra';
  date: string;
}

export interface BackendAdError {
  code:
    | 'unauthenticated'
    | 'quota_exceeded'
    | 'invalid_argument'
    | 'service_unavailable'
    | 'unknown';
  message: string;
  details?: {
    currentCount?: number;
    dailyLimit?: number;
    remaining?: number;
    plan?: string;
    date?: string;
  };
}

// Render backend URL (e.g., https://biznesyordam-backend.onrender.com)
export const RENDER_BACKEND_URL: string = (
  import.meta.env.VITE_BACKEND_API_URL || ''
).replace(/\/+$/, '');

/**
 * Checks whether a separate Render backend service URL is configured
 */
export function isRenderBackendConfigured(): boolean {
  return !!RENDER_BACKEND_URL;
}

/**
 * Requests ad generation from the authoritative backend.
 * Uses Render web service if configured, or Firebase Cloud Functions callable.
 */
export async function requestAdGenerationFromBackend(
  formData: AdFormData,
  onStatusMessage?: (status: string) => void
): Promise<{ data?: BackendAdResponse; error?: BackendAdError }> {
  // 1. Check current Firebase Authentication
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    return {
      error: {
        code: 'unauthenticated',
        message: "Tizimga kirmagansiz. Reklama matnini yaratish uchun Google orqali kiring.",
      },
    };
  }

  let idToken: string;
  try {
    idToken = await currentUser.getIdToken(true);
  } catch (tokenErr) {
    console.error('Failed to retrieve Firebase ID token:', tokenErr);
    return {
      error: {
        code: 'unauthenticated',
        message: "Autentifikatsiya tokenini olishda xatolik yuz berdi. Iltimos, qaytadan kiring.",
      },
    };
  }

  // 2. PATH A: Call Free Render Node.js Backend Web Service if configured
  if (RENDER_BACKEND_URL) {
    return callRenderBackend(RENDER_BACKEND_URL, idToken, formData, onStatusMessage);
  }

  // 3. PATH B: Call Firebase Cloud Functions callable if functions is initialized
  if (functions) {
    return callFirebaseCallable(formData);
  }

  // 4. PATH C: Neither service is configured
  return {
    error: {
      code: 'service_unavailable',
      message:
        "Backend web xizmati topilmadi. Render bepul hosting URL manzilini VITE_BACKEND_API_URL orqali sozlang (batafsil ko'rsatmalar server/README.md faylida).",
    },
  };
}

/**
 * Calls Render Express backend at POST /api/generate-ad
 */
async function callRenderBackend(
  baseUrl: string,
  idToken: string,
  formData: AdFormData,
  onStatusMessage?: (status: string) => void
): Promise<{ data?: BackendAdResponse; error?: BackendAdError }> {
  const endpoint = `${baseUrl}/api/generate-ad`;

  // Start sleep warning timer for Render free tier (wakes up in ~30s after sleep)
  const sleepTimer = setTimeout(() => {
    if (onStatusMessage) {
      onStatusMessage(
        "Render bepul serveri uyqudan uyg'onmoqda (~30-40 soniya)... Iltimos, kuting."
      );
    }
  }, 3500);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 70000); // 70s timeout for cold start

  let response: Response;
  try {
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(formData),
        signal: controller.signal,
      });
    } catch (firstFetchErr: any) {
      // If network fetch failed (e.g. Render free tier cold start waking up), wait 5s and retry once
      if (firstFetchErr.name !== 'AbortError') {
        console.warn('First fetch to Render backend failed (cold start?). Retrying in 5 seconds...', firstFetchErr);
        if (onStatusMessage) {
          onStatusMessage("Render bepul serveri uyg'onmoqda (~15-20s)... Qayta bog'lanilmoqda.");
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(formData),
          signal: controller.signal,
        });
      } else {
        throw firstFetchErr;
      }
    }


    clearTimeout(sleepTimer);
    clearTimeout(timeoutId);

    const json = await response.json();

    if (response.ok && json.success) {
      return {
        data: {
          success: true,
          adText: json.adText,
          adCount: json.adCount,
          dailyLimit: json.dailyLimit,
          remaining: json.remaining,
          plan: json.plan,
          date: json.date,
        },
      };
    }

    if (response.status === 401) {
      const currentUser = auth?.currentUser;
      if (currentUser) {
        try {
          console.warn('Backend returned 401. Force refreshing ID token and retrying...');
          const freshToken = await currentUser.getIdToken(true);
          const retryResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${freshToken}`,
            },
            body: JSON.stringify(formData),
            signal: controller.signal,
          });
          const retryJson = await retryResponse.json();

          if (retryResponse.ok && retryJson.success) {
            return {
              data: {
                success: true,
                adText: retryJson.adText,
                adCount: retryJson.adCount,
                dailyLimit: retryJson.dailyLimit,
                remaining: retryJson.remaining,
                plan: retryJson.plan,
                date: retryJson.date,
              },
            };
          }
          if (retryJson.message) {
            json.message = retryJson.message;
          }
        } catch (refreshErr) {
          console.error('Failed to retry with fresh token:', refreshErr);
        }
      }

      return {
        error: {
          code: 'unauthenticated',
          message: json.message || "Tizimga kirish muddati tugagan. Qaytadan kiring.",
        },
      };
    }


    if (response.status === 429) {
      return {
        error: {
          code: 'quota_exceeded',
          message:
            json.message ||
            "Bugun uchun belgilangan reklama limiti to'ldi. Yangi kvota ertaga beriladi.",
          details: json.details,
        },
      };
    }

    if (response.status === 400) {
      return {
        error: {
          code: 'invalid_argument',
          message: json.message || "Kiritilgan ma'lumotlarda xatolik bor.",
        },
      };
    }

    if (
      json.error === 'credentials_missing' ||
      (json.message && json.message.includes('Could not load the default credentials'))
    ) {
      return {
        error: {
          code: 'service_unavailable',
          message:
            "Render backend serverida Firebase Service Account kaliti kiritilmagan. Iltimos, Render Dashboard ➔ Environment bo'limiga FIREBASE_SERVICE_ACCOUNT_KEY ni qo'shing.",
        },
      };
    }

    if (json.error === 'permission_denied') {
      return {
        error: {
          code: 'service_unavailable',
          message:
            json.message ||
            "Firebase Firestore ruxsat xatosi (PERMISSION_DENIED). Xizmat hisobingizga Google Cloud Console -> IAM bo'limida 'Cloud Datastore User' rolini berish talab etiladi.",
        },
      };
    }

    return {
      error: {
        code: 'unknown',
        message: json.message || `Server xatosi (${response.status})`,
      },
    };


  } catch (err: any) {
    clearTimeout(sleepTimer);
    clearTimeout(timeoutId);

    console.error('Fetch to Render backend failed:', err);

    if (err.name === 'AbortError') {
      return {
        error: {
          code: 'service_unavailable',
          message:
            "Serverdan javob kutish vaqti tugadi (Timeout). Render bepul serveri hali ishga tushayotgan bo'lishi mumkin. Bir ozdan so'ng qayta urinib ko'ring.",
        },
      };
    }

    return {
      error: {
        code: 'service_unavailable',
        message:
          "Render backend serveri bilan bog'lanib bo'lmadi. Server URL manzili to'g'riligini va ishlayotganini tekshiring: " +
          baseUrl,
      },
    };
  }
}

/**
 * Calls Firebase Cloud Functions callable generateAd
 */
async function callFirebaseCallable(
  formData: AdFormData
): Promise<{ data?: BackendAdResponse; error?: BackendAdError }> {
  try {
    const generateAdCallable = httpsCallable<AdFormData, BackendAdResponse>(
      functions,
      'generateAd'
    );

    const result = await generateAdCallable(formData);
    return { data: result.data };
  } catch (err: any) {
    console.error('Firebase callable ad generation failed:', err);

    const errorCode = err?.code;
    const errorMessage = err?.message || '';
    const details = err?.details;

    if (errorCode === 'functions/unauthenticated' || errorCode === 'unauthenticated') {
      return {
        error: {
          code: 'unauthenticated',
          message: "Tizimga kirmagansiz. Reklama yaratish uchun Google orqali kiring.",
        },
      };
    }

    if (errorCode === 'functions/resource-exhausted' || errorCode === 'resource-exhausted') {
      return {
        error: {
          code: 'quota_exceeded',
          message:
            errorMessage ||
            "Bugun uchun belgilangan reklama limiti to'ldi. Yangi kvota ertaga beriladi.",
          details,
        },
      };
    }

    if (errorCode === 'functions/invalid-argument' || errorCode === 'invalid-argument') {
      return {
        error: {
          code: 'invalid_argument',
          message: errorMessage || "Kiritilgan ma'lumotlarda xatolik bor.",
        },
      };
    }

    if (
      errorCode === 'functions/not-found' ||
      errorCode === 'functions/unavailable' ||
      errorMessage.includes('NOT_FOUND')
    ) {
      return {
        error: {
          code: 'service_unavailable',
          message:
            "Backend xizmati topilmadi. Bepul Render web xizmatini oching va VITE_BACKEND_API_URL manzilini ko'rsating (server/README.md).",
        },
      };
    }

    return {
      error: {
        code: 'unknown',
        message: errorMessage || "Noma'lum server xatoligi yuz berdi.",
      },
    };
  }
}
