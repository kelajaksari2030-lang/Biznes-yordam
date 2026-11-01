/**
 * BiznesYordam - Telegram Integration Service
 * Securely handles Telegram Bot connection, notification preferences,
 * low stock alerts, and high-value sales notifications.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeFirestorePayload } from './firebase';
import { TelegramConfig } from '../types/modules';

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '',
  chatId: '',
  enabled: false,
  notifyLowStock: true,
  notifyHighSale: true,
  highSaleThresholdUZS: 500000, // 500,000 UZS default threshold
  notifyDailyReport: false,
  dailyReportTime: '20:00',
  updatedAt: new Date().toISOString(),
};

/**
 * Gets Telegram Configuration for user from /users/{userId}/telegramConfig/main
 */
export async function getTelegramConfig(userId: string): Promise<TelegramConfig> {
  if (!userId) return DEFAULT_TELEGRAM_CONFIG;
  const docRef = doc(db, 'users', userId, 'telegramConfig', 'main');
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_TELEGRAM_CONFIG, ...snap.data() } as TelegramConfig;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/telegramConfig/main`);
  }
  return DEFAULT_TELEGRAM_CONFIG;
}

/**
 * Saves Telegram Configuration
 */
export async function saveTelegramConfig(
  userId: string,
  config: Partial<TelegramConfig>
): Promise<TelegramConfig> {
  if (!userId) throw new Error("Foydalanuvchi tizimga kirmagan");
  const docRef = doc(db, 'users', userId, 'telegramConfig', 'main');
  const existing = await getTelegramConfig(userId);

  const updated: TelegramConfig = {
    ...existing,
    ...config,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, sanitizeFirestorePayload(updated));
    return updated;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/telegramConfig/main`);
    throw err;
  }
}

/**
 * Sends a Telegram Message using direct fetch or backend proxy
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; message?: string }> {
  if (!botToken || !chatId || !text) {
    return { success: false, message: "Bot Token va Chat ID to'liq emas" };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true };
    } else {
      return { success: false, message: data.description || "Telegram API xatoligi" };
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Sends Low Stock Alert to Telegram if enabled by owner
 */
export async function checkAndSendLowStockAlert(
  userId: string,
  productName: string,
  currentStock: number,
  minThreshold: number,
  unit: string = 'dona'
): Promise<void> {
  const config = await getTelegramConfig(userId);
  if (!config.enabled || !config.notifyLowStock || !config.botToken || !config.chatId) {
    return;
  }

  const text = `⚠️ <b>BESTO: Ombor Ogohlantirish!</b>\n\n` +
    `📦 Mahsulot: <b>${productName}</b>\n` +
    `🔻 Qoldiq: <b>${currentStock} ${unit}</b> (Chegara: ${minThreshold} ${unit})\n` +
    `💡 Iltimos, xomashyo yoki tovar zaxirasini to'ldiring!`;

  await sendTelegramMessage(config.botToken, config.chatId, text);
}

/**
 * Sends High-Value Sale Alert to Telegram if enabled by owner
 */
export async function checkAndSendHighSaleAlert(
  userId: string,
  orderNumber: string,
  customerName: string,
  totalAmountUZS: number
): Promise<void> {
  const config = await getTelegramConfig(userId);
  if (
    !config.enabled ||
    !config.notifyHighSale ||
    !config.botToken ||
    !config.chatId ||
    totalAmountUZS < config.highSaleThresholdUZS
  ) {
    return;
  }

  const text = `🎉 <b>BESTO: Yirik Sotuv Muvaffaqiyatli!</b>\n\n` +
    `🧾 Buyurtma: <b>${orderNumber}</b>\n` +
    `👤 Mijoz: <b>${customerName}</b>\n` +
    `💰 Summa: <b>${totalAmountUZS.toLocaleString()} UZS</b>\n` +
    `🚀 Tabriklaymiz, a'lo ko'rsatkich!`;

  await sendTelegramMessage(config.botToken, config.chatId, text);
}
