/**
 * BESTO Telegram Bot Card Component
 * Provides effortless one-click bot linking with 8-character verification code,
 * real-time onSnapshot status sync, countdown timer, and bot chat status.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Clock,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  createTelegramLinkCode,
  subscribeToLinkCode,
  subscribeToConnectedTelegramChat,
  getTelegramBotStartUrl,
  TelegramConnectedChat,
  TELEGRAM_BOT_USERNAME,
  TELEGRAM_BOT_LINK_URL,
} from '../services/telegramBotService';

export function BestoTelegramBotCard() {
  const { user } = useAuth();

  // Connected chat state from telegramChats
  const [connectedChat, setConnectedChat] = useState<TelegramConnectedChat | null>(null);
  const [checkingChat, setCheckingChat] = useState(true);

  // Link code generation & lifecycle state
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(0);
  const [isLinkedSuccess, setIsLinkedSuccess] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References for subscriptions & timers
  const unsubscribeCodeRef = useRef<(() => void) | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // 1. Check connected chat on mount / auth change
  useEffect(() => {
    if (!user) {
      setConnectedChat(null);
      setCheckingChat(false);
      return;
    }

    setCheckingChat(true);
    const unsub = subscribeToConnectedTelegramChat(
      user.uid,
      (chat) => {
        setConnectedChat(chat);
        setCheckingChat(false);
        if (chat) {
          // If chat is linked, show linked confirmation
          setIsLinkedSuccess(true);
        } else {
          // If user unlinked in bot (/unlink), cleanly reset linked state
          setIsLinkedSuccess(false);
        }
      },
      (err) => {
        console.warn('Error checking connected telegram chat:', err);
        setCheckingChat(false);
      }
    );

    return () => {
      unsub();
    };
  }, [user]);

  // 2. Countdown timer effect
  useEffect(() => {
    if (!expiresAtMs || isLinkedSuccess || isExpired) {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      setTimeLeftSec(remaining);
      if (remaining <= 0) {
        setIsExpired(true);
        if (timerIntervalRef.current) {
          window.clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      }
    };

    updateTimer();
    timerIntervalRef.current = window.setInterval(updateTimer, 1000);

    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [expiresAtMs, isLinkedSuccess, isExpired]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeCodeRef.current) {
        unsubscribeCodeRef.current();
      }
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Handler to generate code and start listening
  const handleGenerateCode = async () => {
    if (!user) return;
    setGenerating(true);
    setErrorMessage(null);
    setCopied(false);
    setIsExpired(false);
    setIsLinkedSuccess(false);

    // Clean up existing code subscription
    if (unsubscribeCodeRef.current) {
      unsubscribeCodeRef.current();
      unsubscribeCodeRef.current = null;
    }

    try {
      const { code, expiresAtEpochMs } = await createTelegramLinkCode(user.uid);
      setLinkCode(code);
      setExpiresAtMs(expiresAtEpochMs);
      setTimeLeftSec(Math.floor((expiresAtEpochMs - Date.now()) / 1000));

      // Subscribe to document updates
      unsubscribeCodeRef.current = subscribeToLinkCode(
        code,
        (status) => {
          if (status === 'linked') {
            setIsLinkedSuccess(true);
            setIsExpired(false);
          } else if (status === 'expired') {
            setIsExpired(true);
          }
        },
        (err) => {
          console.warn('Error listening to telegram link code:', err);
        }
      );
    } catch (err: any) {
      setErrorMessage(err?.message || "Telegram kodini yaratishda xatolik yuz berdi");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(linkCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedUsername = connectedChat?.username
    ? connectedChat.username.startsWith('@')
      ? connectedChat.username
      : `@${connectedChat.username}`
    : null;

  return (
    <div className="bg-white rounded-2xl border border-[#E0ECE8] p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E0ECE8] pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#D7F0E5] text-[#173B35] flex items-center justify-center font-bold shrink-0">
            <Send className="w-5 h-5 text-[#173B35]" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#112521] flex items-center gap-2">
              BESTO Telegram bot
              <span className="text-[10px] bg-[#D7F0E5] text-[#173B35] font-extrabold px-2 py-0.5 rounded-full">
                @{TELEGRAM_BOT_USERNAME}
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              Buyurtmalar va ombor ogohlantirishlarini rasmiy bot orqali tezkor qabul qiling
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {checkingChat ? (
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Tekshirilmoqda...
            </span>
          ) : connectedChat || isLinkedSuccess ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Ulangan ✅
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
              Ulanmagan
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* CASE A: ALREADY LINKED */}
      {(connectedChat || isLinkedSuccess) && !checkingChat && (
        <div className="bg-[#F6F8F7] border border-[#E0ECE8] p-4 rounded-xl space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#112521]">Telegram ulandi ✅</span>
                {formattedUsername && (
                  <span className="font-mono text-xs font-bold text-[#173B35] bg-[#D7F0E5] px-2.5 py-0.5 rounded-lg">
                    {formattedUsername}
                  </span>
                )}
              </div>
              {connectedChat?.firstName && (
                <p className="text-xs text-gray-600">
                  Foydalanuvchi: <span className="font-medium text-gray-900">{connectedChat.firstName}</span>
                </p>
              )}
              {connectedChat?.chatId && (
                <p className="text-[11px] text-gray-500 font-mono">
                  Chat ID: {connectedChat.chatId}
                </p>
              )}
              <p className="text-xs text-gray-500 pt-1">
                Uzish uchun botga <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded font-mono text-[11px]">/unlink</code> yozing
              </p>
            </div>

            <a
              href={TELEGRAM_BOT_LINK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#173B35] text-white rounded-xl text-xs font-bold hover:bg-[#112521] transition shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Botni ochish</span>
              <ExternalLink className="w-3 h-3 ml-0.5 text-gray-300" />
            </a>
          </div>
        </div>
      )}

      {/* CASE B: ACTIVE CODE DISPLAYED (NOT LINKED YET) */}
      {!connectedChat && !isLinkedSuccess && linkCode && !isExpired && (
        <div className="bg-gradient-to-br from-[#F6F8F7] to-[#EAF5F0] border border-[#D7F0E5] p-5 rounded-xl space-y-4">
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-600 font-medium">
              Quyidagi kodni nusxalang va botga yuboring yoki to'g'ridan-to'g'ri Telegramda oching:
            </p>
            <div className="py-2">
              <div className="inline-block max-w-full tracking-[0.14em] sm:tracking-[0.25em] font-mono text-2xl sm:text-4xl font-black text-[#173B35] bg-white border-2 border-[#173B35] px-4 sm:px-6 py-2.5 rounded-2xl shadow-sm select-all">
                {linkCode}
              </div>
            </div>
          </div>

          {/* Action Buttons: Nusxa olish & Telegramda ochish */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopyCode}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-[#173B35] text-[#173B35] hover:bg-[#D7F0E5]/60'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Nusxa olindi! ✅</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Nusxa olish</span>
                </>
              )}
            </button>

            <a
              href={getTelegramBotStartUrl(linkCode)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#173B35] text-white rounded-xl text-xs font-bold hover:bg-[#112521] transition shadow-sm"
            >
              <Send className="w-4 h-4 text-[#F5B85C]" />
              <span>Telegramda ochish</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5 text-gray-300" />
            </a>
          </div>

          {/* Countdown & Expiry Notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600 pt-2 border-t border-[#E0ECE8]">
            <Clock className="w-4 h-4 text-[#173B35] animate-pulse" />
            <span>Kod 10 daqiqa amal qiladi:</span>
            <span className="font-mono font-bold text-[#173B35] bg-[#D7F0E5] px-2 py-0.5 rounded-md">
              {formatCountdown(timeLeftSec)}
            </span>
          </div>
        </div>
      )}

      {/* CASE C: CODE EXPIRED */}
      {!connectedChat && !isLinkedSuccess && linkCode && isExpired && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-800 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Kod muddati tugadi</span>
          </div>
          <p className="text-xs text-gray-600">
            Xavfsizlik yuzasidan 10 daqiqalik amal qilish muddati yakunlandi. Yangi kod yarating:
          </p>
          <button
            type="button"
            onClick={handleGenerateCode}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#173B35] text-white rounded-xl text-xs font-bold hover:bg-[#112521] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Yaratilmoqda...' : 'Yangi kod olish'}</span>
          </button>
        </div>
      )}

      {/* CASE D: INITIAL STATE (NOT CONNECTED & NO ACTIVE CODE) */}
      {!connectedChat && !isLinkedSuccess && !linkCode && !checkingChat && (
        <div className="bg-[#F6F8F7] border border-[#E0ECE8] p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-xs text-[#112521] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Tezkor va xavfsiz Telegram aloqasi
            </h4>
            <p className="text-xs text-gray-600 max-w-xl">
              Tugmani bosing va berilgan bir martalik kod orqali BESTO rasmiy botini profilingizga ulang.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateCode}
            disabled={generating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#173B35] text-white rounded-xl text-xs font-bold hover:bg-[#112521] transition shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4 text-[#F5B85C]" />
            <span>{generating ? 'Kod yaratilmoqda...' : 'Telegramni ulash'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
