/**
 * BiznesYordam - BESTO Telegram Bot Service
 * Handles one-time 8-char link code generation, Firestore lifecycle,
 * and user chat subscription for @Bestouzbbot.
 */

import {
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  collection,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export const TELEGRAM_BOT_USERNAME = 'Bestouzbbot';
export const TELEGRAM_BOT_LINK_URL = 'https://t.me/Bestouzbbot';
export const TELEGRAM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LINK_CODE_VALIDITY_MS = 10 * 60 * 1000; // 10 minutes

export interface TelegramLinkCodeDoc {
  userId: string;
  status: 'pending' | 'linked' | 'expired';
  createdAt: any;
  expiresAt: any;
}

export interface TelegramConnectedChat {
  chatId: string;
  userId: string;
  username?: string;
  firstName?: string;
  linkedAt?: any;
}

/**
 * Generates cryptographically secure 8-character uppercase alphanumeric code
 * using the allowed alphabet: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no confusing 0/O or 1/I).
 */
export function generateTelegramLinkCode(): string {
  const chars = TELEGRAM_CODE_ALPHABET;
  const array = new Uint8Array(8);

  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback for standard environments
    for (let i = 0; i < 8; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

/**
 * Creates and writes a new link code in Firestore: telegramLinkCodes/{code}
 */
export async function createTelegramLinkCode(userId: string): Promise<{
  code: string;
  expiresAtEpochMs: number;
}> {
  if (!userId) {
    throw new Error("Foydalanuvchi identifikatori (UID) mavjud emas");
  }

  const code = generateTelegramLinkCode();
  const expiresAtEpochMs = Date.now() + LINK_CODE_VALIDITY_MS;
  const docRef = doc(db, 'telegramLinkCodes', code);

  const payload = {
    userId,
    status: 'pending',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(expiresAtEpochMs)),
  };

  try {
    await setDoc(docRef, payload);
    return { code, expiresAtEpochMs };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `telegramLinkCodes/${code}`);
    throw error;
  }
}

/**
 * Subscribes to real-time status of telegramLinkCodes/{code}
 */
export function subscribeToLinkCode(
  code: string,
  onStatusChange: (status: 'pending' | 'linked' | 'expired', data?: TelegramLinkCodeDoc) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const docRef = doc(db, 'telegramLinkCodes', code);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as TelegramLinkCodeDoc;
        onStatusChange(data.status, data);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `telegramLinkCodes/${code}`);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribes to telegramChats collection for the user to check if bot is connected
 */
export function subscribeToConnectedTelegramChat(
  userId: string,
  onUpdate: (chat: TelegramConnectedChat | null) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }

  const q = query(collection(db, 'telegramChats'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(null);
      } else {
        const firstDoc = snapshot.docs[0];
        const data = firstDoc.data();
        onUpdate({
          chatId: firstDoc.id,
          userId: data.userId || userId,
          username: data.username || data.userName || '',
          firstName: data.firstName || data.first_name || '',
          linkedAt: data.linkedAt || data.createdAt,
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'telegramChats');
      if (onError) onError(error);
    }
  );
}

/**
 * Builds direct deep link for user to open the bot with start parameter
 */
export function getTelegramBotStartUrl(code: string): string {
  return `${TELEGRAM_BOT_LINK_URL}?start=${encodeURIComponent(code)}`;
}
