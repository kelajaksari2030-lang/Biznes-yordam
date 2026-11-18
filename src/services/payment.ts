/**
 * BiznesYordam - Click Payment Service
 * Handles interaction with the secure backend payment order endpoint.
 */

import { User } from 'firebase/auth';

export function getBackendBaseUrl(): string {
  const configured = (import.meta.env.VITE_BACKEND_API_URL || '').trim().replace(/\/+$/, '');
  if (configured && configured !== 'undefined' && configured !== 'null') {
    return configured;
  }
  return 'http://localhost:10000';
}

export async function initiateClickPayment(
  plan: 'pro' | 'ultra',
  token: string,
  user?: User | null
): Promise<{ paymentUrl: string; orderId: string }> {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/payment/click/create-order`;

  const makeRequest = async (authToken: string) => {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ plan }),
    });
  };

  let response: Response;
  try {
    response = await makeRequest(token);

    // If 401 unauthenticated and user is available, force refresh token and retry once
    if (response.status === 401 && user) {
      try {
        console.warn('Click payment order returned 401. Attempting force ID token refresh...');
        const freshToken = await user.getIdToken(true);
        response = await makeRequest(freshToken);
      } catch (refreshErr) {
        console.error('Payment token refresh failed:', refreshErr);
      }
    }
  } catch {
    throw new Error("To'lov serveriga ulanib bo'lmadi. Internet aloqasini yoki server manzilini tekshiring.");
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    throw new Error("To'lov serveridan kutilmagan javob olindi. Click to'lov integratsiyasi hali sozlanmagan bo'lishi mumkin.");
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || "To'lov buyurtmasini yaratishda xatolik yuz berdi.");
  }

  if (!data.paymentUrl || typeof data.paymentUrl !== 'string' || !data.orderId) {
    throw new Error("To'lov tizimidan noto'g'ri javob olindi.");
  }

  return { paymentUrl: data.paymentUrl, orderId: data.orderId };
}
