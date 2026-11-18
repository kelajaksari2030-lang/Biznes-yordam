/**
 * BiznesYordam (BESTO) - Client Service for Backend-Enforced Gemini AI Generation
 *
 * Securely communicates with:
 * 1. Express Backend Web Service (VITE_BACKEND_API_URL or local http://localhost:10000)
 * 2. Or Firebase Cloud Functions callable (generateAd fallback)
 *
 * Strict Enforcement:
 * - Always sends Firebase Authentication ID token
 * - Never holds or accesses Gemini API keys or SDKs in frontend
 * - Surfaces honest unconfigured/upstream/timeout errors so UI can offer explicit offline fallback
 */

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from './firebase';
import { AdFormData } from '../types';

export interface BackendQuotaMeta {
  adCount: number;
  dailyLimit: number;
  remaining: number;
  plan: 'free' | 'pro' | 'ultra';
  date: string;
}

export interface BackendAdResponse extends BackendQuotaMeta {
  success: boolean;
  source?: 'gemini' | 'functions';
  model?: string;
  adText: string;
  headline?: string;
  hashtags?: string[];
}

export interface BackendAiEnvelope<T> extends BackendQuotaMeta {
  success: boolean;
  source: 'gemini';
  model: string;
  data: T;
}

export type BackendErrorCode =
  | 'unauthenticated'
  | 'quota_exceeded'
  | 'invalid_argument'
  | 'gemini_not_configured'
  | 'gemini_timeout'
  | 'gemini_upstream_error'
  | 'gemini_invalid_response'
  | 'service_unavailable'
  | 'unknown';

export interface BackendAdError {
  code: BackendErrorCode;
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
export const RENDER_BACKEND_URL: string = (() => {
  const raw = (import.meta.env?.VITE_BACKEND_API_URL || '').trim().replace(/\/+$/, '');
  if (raw === 'undefined' || raw === 'null') return '';
  return raw;
})();

export function resolveBackendBaseUrl(): string {
  if (RENDER_BACKEND_URL) {
    return RENDER_BACKEND_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location?.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:10000';
    }
  }
  return '';
}

/**
 * Checks whether an Express backend base URL is configured/resolvable
 */
export function isRenderBackendConfigured(): boolean {
  return !!resolveBackendBaseUrl();
}

function mapHttpErrorJson(status: number, json: any): BackendAdError {
  if (status === 429 || json?.error === 'quota_exceeded') {
    return {
      code: 'quota_exceeded',
      message:
        json?.message ||
        "Bugun uchun belgilangan kunlik AI limiti to'ldi. Yangi kvota ertaga beriladi.",
      details: json?.details,
    };
  }

  if (status === 400 || json?.error === 'invalid_argument') {
    return {
      code: 'invalid_argument',
      message: json?.message || "Kiritilgan ma'lumotlarda xatolik bor.",
    };
  }

  if (status === 503 && json?.error === 'gemini_not_configured') {
    return {
      code: 'gemini_not_configured',
      message:
        json?.message ||
        "Serverda Gemini AI kaliti sozlanmagan. Haqiqiy AI javoblari uchun backend muhitida API kalitini kiriting.",
    };
  }

  if (status === 504 || json?.error === 'gemini_timeout') {
    return {
      code: 'gemini_timeout',
      message:
        json?.message ||
        "Gemini AI javob berish vaqti tugadi. Iltimos, birozdan so'ng qayta urinib ko'ring.",
    };
  }

  if (json?.error === 'gemini_invalid_response') {
    return {
      code: 'gemini_invalid_response',
      message:
        json?.message || "Gemini AI javobi kutilgan formatda kelmadi. Qayta urinib ko'ring.",
    };
  }

  if (status === 502 || json?.error === 'gemini_upstream_error') {
    return {
      code: 'gemini_upstream_error',
      message:
        json?.message || "Gemini AI xizmatiga ulanishda xatolik yuz berdi.",
    };
  }

  if (
    json?.error === 'credentials_missing' ||
    (typeof json?.message === 'string' && json.message.includes('Could not load the default credentials'))
  ) {
    return {
      code: 'service_unavailable',
      message:
        "Backend serverida Firebase Service Account kaliti kiritilmagan. Iltimos, FIREBASE_SERVICE_ACCOUNT_KEY ni sozlang.",
    };
  }

  if (json?.error === 'permission_denied') {
    return {
      code: 'service_unavailable',
      message:
        json?.message ||
        "Firebase Firestore ruxsat xatosi (PERMISSION_DENIED). Administratorga murojaat qiling.",
    };
  }

  return {
    code: 'unknown',
    message: json?.message || `Server xatosi (${status})`,
  };
}

/**
 * Generic helper to call any Express AI endpoint with Firebase Auth ID token,
 * cold-start retry, and 401 token refresh.
 */
export async function requestAiFromBackend<TPayload extends Record<string, any>, TResponse>(
  path: string,
  payload: TPayload,
  onStatusMessage?: (status: string) => void
): Promise<{ data?: TResponse; error?: BackendAdError }> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    return {
      error: {
        code: 'unauthenticated',
        message: "Tizimga kirmagansiz. AI funksiyalaridan foydalanish uchun Google orqali kiring.",
      },
    };
  }

  const baseUrl = resolveBackendBaseUrl();
  if (!baseUrl) {
    return {
      error: {
        code: 'service_unavailable',
        message:
          "AI backend server manzili sozlanmagan (VITE_BACKEND_API_URL). Mahalliy rejimda yoki server ulangandan keyin foydalaning.",
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

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const endpoint = `${baseUrl}${normalizedPath}`;

  const sleepTimer = setTimeout(() => {
    if (onStatusMessage) {
      onStatusMessage(
        "Server javobi kutilmoqda (bepul server uyqudan uyg'onayotgan bo'lishi mumkin)..."
      );
    }
  }, 3500);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 70000);

  let response: Response;
  try {
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (firstFetchErr: any) {
      if (firstFetchErr.name !== 'AbortError') {
        if (onStatusMessage) {
          onStatusMessage("Backend serveri bilan qayta bog'lanilmoqda...");
        }
        await new Promise((resolve) => setTimeout(resolve, 2500));
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } else {
        throw firstFetchErr;
      }
    }

    clearTimeout(sleepTimer);
    clearTimeout(timeoutId);

    let json: any = {};
    try {
      json = await response.json();
    } catch {
      json = {};
    }

    if (response.ok && json?.success) {
      return { data: json as TResponse };
    }

    if (response.status === 401) {
      try {
        const freshToken = await currentUser.getIdToken(true);
        const retryResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${freshToken}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        let retryJson: any = {};
        try {
          retryJson = await retryResponse.json();
        } catch {
          retryJson = {};
        }

        if (retryResponse.ok && retryJson?.success) {
          return { data: retryJson as TResponse };
        }
        if (retryResponse.status !== 401) {
          return { error: mapHttpErrorJson(retryResponse.status, retryJson) };
        }
        if (retryJson?.message) {
          json.message = retryJson.message;
        }
      } catch (refreshErr) {
        console.error('Failed to retry with fresh token:', refreshErr);
      }

      return {
        error: {
          code: 'unauthenticated',
          message: json?.message || "Tizimga kirish muddati tugagan. Qaytadan kiring.",
        },
      };
    }

    return { error: mapHttpErrorJson(response.status, json) };
  } catch (err: any) {
    clearTimeout(sleepTimer);
    clearTimeout(timeoutId);

    console.error(`Fetch to AI endpoint ${endpoint} failed:`, err);

    if (err.name === 'AbortError') {
      return {
        error: {
          code: 'gemini_timeout',
          message:
            "Serverdan javob kutish vaqti tugadi. Birozdan so'ng qayta urinib ko'ring.",
        },
      };
    }

    return {
      error: {
        code: 'service_unavailable',
        message:
          "AI backend serveri bilan bog'lanib bo'lmadi. Server ishlayotganini va manzil to'g'riligini tekshiring: " +
          baseUrl,
      },
    };
  }
}

/**
 * Requests ad generation from the authoritative backend.
 * Uses Express backend (Render / localhost) if available, or Firebase Cloud Functions callable.
 */
export async function requestAdGenerationFromBackend(
  formData: AdFormData & { simulatedTier?: string },
  onStatusMessage?: (status: string) => void
): Promise<{ data?: BackendAdResponse; error?: BackendAdError }> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    return {
      error: {
        code: 'unauthenticated',
        message: "Tizimga kirmagansiz. Reklama matnini yaratish uchun Google orqali kiring.",
      },
    };
  }

  const baseUrl = resolveBackendBaseUrl();
  if (baseUrl) {
    const res = await requestAiFromBackend<typeof formData, BackendAdResponse>(
      '/api/generate-ad',
      formData,
      onStatusMessage
    );
    if (res.data) {
      return {
        data: {
          success: true,
          source: res.data.source || 'gemini',
          model: res.data.model,
          adText: res.data.adText,
          headline: res.data.headline,
          hashtags: res.data.hashtags,
          adCount: res.data.adCount,
          dailyLimit: res.data.dailyLimit,
          remaining: res.data.remaining,
          plan: res.data.plan,
          date: res.data.date,
        },
      };
    }
    return { error: res.error };
  }

  if (functions) {
    return callFirebaseCallable(formData);
  }

  return {
    error: {
      code: 'service_unavailable',
      message:
        "Backend web xizmati topilmadi. VITE_BACKEND_API_URL orqali backend URL manzilini sozlang.",
    },
  };
}

async function callFirebaseCallable(
  formData: AdFormData
): Promise<{ data?: BackendAdResponse; error?: BackendAdError }> {
  try {
    const generateAdCallable = httpsCallable<AdFormData, BackendAdResponse>(
      functions,
      'generateAd'
    );

    const result = await generateAdCallable(formData);
    return { data: { ...result.data, source: 'functions' } };
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
            "Backend xizmati topilmadi. VITE_BACKEND_API_URL manzilini ko'rsating (server/README.md).",
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
