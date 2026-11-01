/**
 * BiznesYordam - Dedicated Settings Page Component
 * Grouped sections, mobile-friendly rows, real system actions,
 * and BESTO brand styling (#173B35, #D7F0E5, #F6F8F7).
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppSettings } from '../types/modules';
import { getAppSettings, saveAppSettings, exportUserDataBundle } from '../services/settingsService';
import { sendTelegramMessage } from '../services/telegramService';
import { BestoTelegramBotCard } from './BestoTelegramBotCard';
import {
  User,
  CreditCard,
  Palette,
  Send,
  ShieldCheck,
  Building,
  Download,
  HelpCircle,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Printer,
  Moon,
  Sun,
  EyeOff,
  ChevronRight,
  FileText,
  Lock,
} from 'lucide-react';

interface SettingsPageProps {
  onOpenPricing: () => void;
  onOpenBusinessProfile: () => void;
}

export function SettingsPage({ onOpenPricing, onOpenBusinessProfile }: SettingsPageProps) {
  const { user, currentPlan, signOutUser } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<
    'profile' | 'subscription' | 'appearance' | 'telegram' | 'security' | 'business' | 'data' | 'help'
  >('profile');

  // Telegram test state
  const [testStatus, setTestStatus] = useState<string | null>(null);
  // Delete account confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getAppSettings(user.uid)
      .then((s) => setSettings(s))
      .finally(() => setLoading(false));
  }, [user]);

  const handleSaveSettings = async (updates: Partial<AppSettings>) => {
    if (!user || !settings) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const updated = await saveAppSettings(user.uid, updates);
      setSettings(updated);
      setMessage("Sozlamalar muvaffaqiyatli saqlandi!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!settings?.telegramConfig.botToken || !settings?.telegramConfig.chatId) {
      setTestStatus("Iltimos, Bot Token va Chat ID ni kiriting.");
      return;
    }
    setTestStatus("Sinov xabari yuborilmoqda...");
    const res = await sendTelegramMessage(
      settings.telegramConfig.botToken,
      settings.telegramConfig.chatId,
      `✅ <b>BESTO: Telegram bot aloqasi muvaffaqiyatli o'rnatildi!</b>\n\nSana: ${new Date().toLocaleString()}`
    );
    if (res.success) {
      setTestStatus("✅ Muvaffaqiyatli! Telegramingizni tekshiring.");
    } else {
      setTestStatus(`❌ Xatolik: ${res.message}`);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      const bundle = await exportUserDataBundle(user.uid);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bundle, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `BESTO_Export_${user.uid.slice(0, 6)}_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert(`Ma'lumotlarni eksport qilishda xatolik: ${err.message}`);
    }
  };

  const navItems = [
    { id: 'profile', label: 'Profil va Biznes Hisob', icon: User },
    { id: 'subscription', label: 'Obuna va Tariflar', icon: CreditCard },
    { id: 'appearance', label: 'Tashqi Ko\'rinish & Maxsuslik', icon: Palette },
    { id: 'telegram', label: 'Telegram & Bildirishnomalar', icon: Send },
    { id: 'security', label: 'Xavfsizlik va Sessiyalar', icon: ShieldCheck },
    { id: 'business', label: 'Biznes va Kassa Sozlamalari', icon: Building },
    { id: 'data', label: 'Ma\'lumotlar va Maxfiylik', icon: Download },
    { id: 'help', label: 'Yordam va Versiya', icon: HelpCircle },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E0ECE8] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#112521]">Tizim Sozlamalari (Settings)</h1>
          <p className="text-sm text-gray-600 mt-1">
            Biznes profili, obuna, Telegram integratsiyasi va kassa parametrlarini boshqarish
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 bg-[#D7F0E5] text-[#173B35] font-bold text-xs rounded-xl">
            BESTO v2.4.0
          </span>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Main Settings Layout: Left Nav + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Navigation Menu */}
        <div className="bg-white p-3 rounded-2xl border border-[#E0ECE8] shadow-sm space-y-1 h-fit">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#173B35] text-white shadow-sm'
                    : 'text-gray-700 hover:bg-[#F6F8F7]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#F5B85C]' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-300'}`} />
              </button>
            );
          })}
        </div>

        {/* Right Section Content */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-[#E0ECE8] shadow-sm space-y-6">
          {/* SECTION 1: Profile */}
          {activeSection === 'profile' && (
            <div className="space-y-5">
              <div className="border-b border-[#E0ECE8] pb-3">
                <h3 className="font-bold text-lg text-[#112521]">Profil va Profil Ma'lumotlari</h3>
                <p className="text-xs text-gray-500">Shaxsiy va kompaniya ma'lumotlarini tahrirlang</p>
              </div>

              <div className="flex items-center space-x-4 bg-[#F6F8F7] p-4 rounded-xl">
                <div className="w-14 h-14 rounded-2xl bg-[#173B35] text-[#F5B85C] font-extrabold text-xl flex items-center justify-center shadow-inner">
                  {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="font-bold text-[#112521] text-base">{user?.displayName || 'Tadbirkor'}</h4>
                  <p className="text-xs text-gray-600">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#D7F0E5] text-[#173B35]">
                    Tasdiqlangan Foydalanuvchi
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onOpenBusinessProfile}
                  className="px-4 py-2.5 bg-[#173B35] text-white text-xs font-bold rounded-xl hover:bg-[#112521] transition"
                >
                  Yagona Biznes Profilini Tahrirlash Modalini Ochish
                </button>
              </div>
            </div>
          )}

          {/* SECTION 2: Subscription */}
          {activeSection === 'subscription' && (
            <div className="space-y-5">
              <div className="border-b border-[#E0ECE8] pb-3">
                <h3 className="font-bold text-lg text-[#112521]">Obuna va Tariflar (Subscription)</h3>
                <p className="text-xs text-gray-500">Mavjud tarifingiz va Click to'lovlari tarixi</p>
              </div>

              <div className="bg-[#173B35] text-white p-5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#F5B85C] font-bold uppercase tracking-wider">Aktiv Tarif</span>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-extrabold uppercase">
                    {currentPlan.badge} TARIFI
                  </span>
                </div>
                <div className="text-2xl font-black">
                  {currentPlan.id === 'ultra'
                    ? '189,000 UZS / oy'
                    : currentPlan.id === 'pro'
                    ? '79,000 UZS / oy'
                    : '0 UZS (Bepul)'}
                </div>
                <p className="text-xs text-gray-200">
                  Kunlik reklama yaratish chegarasi: {currentPlan.dailyAdLimit} ta post
                </p>
                <button
                  onClick={onOpenPricing}
                  className="mt-2 px-4 py-2 bg-[#F5B85C] text-[#112521] font-extrabold text-xs rounded-xl hover:bg-amber-400 transition"
                >
                  Tarifni Yangilash (Upgrade Plan)
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: Appearance & Reduced Motion */}
          {activeSection === 'appearance' && settings && (
            <div className="space-y-5">
              <div className="border-b border-[#E0ECE8] pb-3">
                <h3 className="font-bold text-lg text-[#112521]">Tashqi Ko'rinish va Animatsiyalar</h3>
                <p className="text-xs text-gray-500">Rasm, rang va harakat sozlamalari</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#F6F8F7] rounded-xl">
                  <div>
                    <h5 className="font-bold text-xs text-[#112521]">Harakatni Kamaytirish (Reduced Motion)</h5>
                    <p className="text-[11px] text-gray-500">Mobil qurilmada batareya va tezlikni tejash uchun scroll animatsiyalarini o'chirish</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={(e) =>
                      handleSaveSettings({ reducedMotion: e.target.checked })
                    }
                    className="w-5 h-5 text-[#173B35] rounded focus:ring-[#173B35]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Telegram */}
          {activeSection === 'telegram' && settings && (
            <div className="space-y-6">
              {/* BESTO Telegram bot (Yangi karta) */}
              <BestoTelegramBotCard />

              {/* Mavjud Telegram Bot Integratsiyasi kartasi */}
              <div className="space-y-5 pt-2">
                <div className="border-b border-[#E0ECE8] pb-3">
                  <h3 className="font-bold text-lg text-[#112521]">Telegram Bot Integratsiyasi</h3>
                  <p className="text-xs text-gray-500">Shaxsiy bot tokeni orqali ombor kam qolganda va yirik sotuvda xabarnomalar olish</p>
                </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Telegram Bot Token</label>
                  <input
                    type="password"
                    value={settings.telegramConfig.botToken}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              telegramConfig: { ...prev.telegramConfig, botToken: e.target.value },
                            }
                          : null
                      )
                    }
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="w-full px-3 py-2 border rounded-xl font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Telegram Chat ID</label>
                  <input
                    type="text"
                    value={settings.telegramConfig.chatId}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              telegramConfig: { ...prev.telegramConfig, chatId: e.target.value },
                            }
                          : null
                      )
                    }
                    placeholder="987654321"
                    className="w-full px-3 py-2 border rounded-xl font-mono text-xs"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={settings.telegramConfig.enabled}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                telegramConfig: { ...prev.telegramConfig, enabled: e.target.checked },
                              }
                            : null
                        )
                      }
                      className="w-4 h-4 text-[#173B35]"
                    />
                    <span>Telegram bildirishnomalarini yoqish</span>
                  </label>
                </div>

                {testStatus && (
                  <div className="p-3 bg-gray-100 rounded-xl text-xs font-mono text-gray-800">
                    {testStatus}
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    className="px-4 py-2 border border-[#173B35] text-[#173B35] text-xs font-bold rounded-xl hover:bg-[#D7F0E5]/50"
                  >
                    Aloqani Sinash (Test Message)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ telegramConfig: settings.telegramConfig })}
                    className="px-4 py-2 bg-[#173B35] text-white text-xs font-bold rounded-xl"
                  >
                    Saqlash
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* SECTION 5: Security */}
          {activeSection === 'security' && (
            <div className="space-y-5">
              <div className="border-b border-[#E0ECE8] pb-3">
                <h3 className="font-bold text-lg text-[#112521]">Xavfsizlik va Sessiyalar</h3>
                <p className="text-xs text-gray-500">Avtorizatsiya va hisob xavfsizligi</p>
              </div>

              <div className="bg-[#F6F8F7] p-4 rounded-xl space-y-2 text-xs text-gray-700">
                <p><strong>Kirish usuli:</strong> Google Firebase Authentication</p>
                <p><strong>Identifikator UID:</strong> {user?.uid}</p>
                <p><strong>Sessiya Holati:</strong> Faol va himoyalangan</p>
              </div>
            </div>
          )}

          {/* SECTION 6: Business Settings */}
          {activeSection === 'business' && settings && (
            <div className="space-y-5">
              <div className="border-b border-[#E0ECE8] pb-3">
                <h3 className="font-bold text-lg text-[#112521]">Biznes va Kassa Sozlamalari</h3>
                <p className="text-xs text-gray-500">Valyuta, vaqt zonasi va kassa parametrlari</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Asosiy Valyuta</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleSaveSettings({ currency: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                  >
                    <option value="UZS">UZS (O'zbekiston So'mi)</option>
                    <option value="USD">USD (AQSh Dollari)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">QQS / Soliq Foizi (%)</label>
                  <input
                    type="number"
                    value={settings.taxPercent}
                    onChange={(e) => handleSaveSettings({ taxPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: Data & Export */}
          {activeSection === 'data' && (
            <div className="space-y-5">
              <div className="border-b border-[#E0ECE8] pb-3">
                <h3 className="font-bold text-lg text-[#112521]">Ma'lumotlar va Maxfiylik</h3>
                <p className="text-xs text-gray-500">Barcha ma'lumotlaringizni yuklab oling</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-gray-600">
                  Biznesingizga tegishli barcha tovarlar, buyurtmalar, mijozlar va moliya tarixini JSON formatida to'liq yuklab olishingiz mumkin.
                </p>
                <button
                  onClick={handleExportData}
                  className="px-4 py-2.5 bg-[#173B35] text-white text-xs font-bold rounded-xl hover:bg-[#112521] transition flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Barcha Ma'lumotlarni Yuklab Olish (JSON Export)</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 8: Help & Logout */}
          {activeSection === 'help' && (
            <div className="space-y-5">
              <div className="border-b border-[#E0ECE8] pb-3">
                <h3 className="font-bold text-lg text-[#112521]">Yordam va Tizimdan Chiqish</h3>
                <p className="text-xs text-gray-500">Versiya va texnik qo'llab-quvvatlash</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-gray-600">BESTO SaaS Platformasi – Versiya v2.4.0 (Production Build)</p>
                <button
                  onClick={signOutUser}
                  className="px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Tizimdan Chiqish (Sign Out)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
