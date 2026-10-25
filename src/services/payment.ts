/**
 * BiznesYordam - Click Payment Service
 * Handles interaction with the secure backend payment order endpoint.
 */

import { User } from 'firebase/auth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:10000';

export async function initiateClickPayment(
  plan: 'pro' | 'ultra',
  token: string,
  user?: User | null
): Promise<{ paymentUrl: string; orderId: string }> {
  const endpoint = `${BACKEND_URL}/api/payment/click/create-order`;

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

  let response = await makeRequest(token);

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

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'To\'lov buyurtmasini yaratishda xatolik yuz berdi.');
  }

  if (!data.paymentUrl || typeof data.paymentUrl !== 'string' || !data.orderId) {
    throw new Error('To\'lov tizimidan noto\'g\'ri javob olindi.');
  }

  return { paymentUrl: data.paymentUrl, orderId: data.orderId };
}

