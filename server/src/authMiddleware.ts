/**
 * BiznesYordam - Firebase Authentication Middleware
 * Strictly verifies ID tokens using Firebase Admin SDK
 */

import { Request, Response, NextFunction } from 'express';
import { adminAuth, PROJECT_ID } from './firebaseAdmin.js';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

function parseJwtClaims(token: string): { aud?: string; iss?: string; exp?: number; uid?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    return {
      aud: payload.aud,
      iss: payload.iss,
      exp: payload.exp,
      uid: payload.uid || payload.sub,
    };
  } catch {
    return null;
  }
}

export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'unauthenticated',
      message: "Tizimga kirmagansiz. 'Authorization: Bearer <id_token>' sarlavhasi talab etiladi.",
    });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'unauthenticated',
      message: "Autentifikatsiya tokeni topilmadi.",
    });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    const errCode = error?.code || 'unknown';
    const errMsg = error?.message || String(error);
    const claims = parseJwtClaims(token);
    const receivedAud = claims?.aud || 'unknown';
    const receivedIss = claims?.iss || 'unknown';
    const expTime = claims?.exp ? new Date(claims.exp * 1000).toISOString() : 'unknown';

    console.error(
      `[AuthMiddleware] ID Token verification failed [${errCode}]: "${errMsg}". ` +
      `Claims -> aud: "${receivedAud}", iss: "${receivedIss}", exp: "${expTime}", uid: "${claims?.uid || 'none'}". ` +
      `Expected Admin Project ID: "${PROJECT_ID}".`
    );

    let userMessage = "Autentifikatsiya tokeni yaroqsiz yoki muddati o'tgan. Iltimos, qaytadan kiring.";
    if (receivedAud !== 'unknown' && receivedAud !== PROJECT_ID) {
      userMessage = `Token loyiha IDsi ("${receivedAud}") backend sozlanmasi ("${PROJECT_ID}") bilan mos emas. Render Environment variables qismida FIREBASE_PROJECT_ID ni "${receivedAud}" deb sozlang.`;
    } else if (errCode === 'auth/id-token-expired' || errMsg.includes('expired')) {
      userMessage = "Autentifikatsiya tokeni muddati o'tgan. Iltimos, sahifani yangilang yoki qaytadan kiring.";
    }


    const payload: Record<string, any> = {
      success: false,
      error: 'unauthenticated',
      message: userMessage,
      code: errCode,
    };

    if (process.env.NODE_ENV !== 'production') {
      payload.debug = {
        receivedAudience: receivedAud,
        expectedProjectId: PROJECT_ID,
        tokenExpiredAt: expTime,
      };
    }

    return res.status(401).json(payload);
  }
}

