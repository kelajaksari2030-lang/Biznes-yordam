/**
 * BiznesYordam - Firebase Authentication Middleware
 * Strictly verifies ID tokens using Firebase Admin SDK
 */

import { Request, Response, NextFunction } from 'express';
import { adminAuth } from './firebaseAdmin.js';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
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
    console.error('ID Token verification failed:', error?.code || error?.message);
    return res.status(401).json({
      success: false,
      error: 'unauthenticated',
      message: "Autentifikatsiya tokeni yaroqsiz yoki muddati o'tgan. Iltimos, qaytadan kiring.",
    });
  }
}
