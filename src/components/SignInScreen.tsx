import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  Info, 
  ExternalLink, 
  CheckCircle2, 
  Zap, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PLANS } from '../config/plans';

export const SignInScreen: React.FC = () => {
  const { isConfigured, configStatus, signInWithGoogle, loading, authError, clearAuthError } = useAuth();
  const [showSetupSteps, setShowSetupSteps] = useState(!isConfigured);

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-10 px-4 sm:px-6">
      <div className="max-w-xl w-full space-y-8">
        {/* Brand & Welcome Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#493329] border border-[#6B5041] text-[#D0AE70] shadow-card font-serif text-2xl font-bold mb-1">
            B
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#493329]">
            Biznes<span className="text-[#D0AE70]">Yordam</span>
          </h1>
          <p className="text-sm sm:text-base text-[#6B5549] max-w-md mx-auto leading-relaxed">
            Kichik biznes egalari uchun reklama matnlari, mahsulot sof foydasi hisobi va mijozlar bilan tezkor muloqot tizimi.
          </p>
        </div>

        {/* Main Sign-In Card */}
        <div className="bg-white border border-[#E6DCD1] rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
          <div className="space-y-2 border-b border-[#EFE8DE] pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#795640]">
              <Lock className="w-3.5 h-3.5 text-[#D0AE70]" />
              <span>Avtorizatsiya talabi</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#493329]">
              Google hisobingiz orqali kiring
            </h2>
            <p className="text-xs text-[#6B5549] leading-relaxed">
              Ilovadan to'liq foydalanish (shu jumladan Bepul tarif) uchun xavfsiz Firebase Authentication orqali tizimga kirish talab etiladi.
            </p>
          </div>

          {/* Auth Error Banner */}
          {authError && (
            <div className="p-4 bg-[#FDF4F4] border border-[#F3C7C7] rounded-2xl text-xs text-[#9E2A2B] space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Kirishda xatolik yuz berdi</span>
                </div>
                <button
                  onClick={clearAuthError}
                  className="text-[#9E2A2B] hover:text-[#521314] font-bold text-xs"
                >
                  ✕
                </button>
              </div>
              <p className="leading-relaxed pl-6">{authError}</p>
            </div>
          )}

          {/* Configuration Status Banner */}
          {isConfigured ? (
            <div className="p-3.5 bg-[#FAF6F0] border border-[#E8D6B7] rounded-2xl text-xs text-[#6B5549] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D0AE70] shrink-0" />
                <span>
                  Firebase loyihasi ulangan: <strong className="text-[#493329] font-mono">{configStatus.projectId}</strong>
                </span>
              </div>
              <span className="text-[10px] font-semibold text-[#34221A] bg-[#D0AE70] px-2 py-0.5 rounded-full shrink-0">
                Faol
              </span>
            </div>
          ) : (
            <div className="p-4 bg-[#FAF6F0] border border-[#E8D6B7] rounded-2xl text-xs text-[#6B5549] space-y-3">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#795640] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-[#493329] block">
                    Firebase Authentication sozlamalari kutilmoqda
                  </span>
                  <p className="leading-relaxed text-[11px] text-[#795640]">
                    Ilovada haqiqiy Firebase loyihasi kalitlari hali to'liq ulanmagan. Tizim xavfsizlik qoidalariga binoan soxta kirishni simulyatsiya qilmaydi.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSetupSteps(!showSetupSteps)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-[#E6DCD1] text-xs font-semibold text-[#493329] hover:bg-[#F2ECE1] transition-colors"
              >
                <span>Ulash bo'yicha aniq yo'riqnomani {showSetupSteps ? 'yopish' : 'ko\'rish'}</span>
                {showSetupSteps ? (
                  <ChevronUp className="w-4 h-4 text-[#795640]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#795640]" />
                )}
              </button>

              {showSetupSteps && (
                <div className="p-3 bg-white rounded-xl border border-[#EFE8DE] space-y-2 pt-3">
                  <span className="text-[11px] font-bold text-[#493329] block">
                    Talab qilinadigan sozlash bosqichlari:
                  </span>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-[#6B5549] leading-relaxed">
                    {configStatus.setupSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                  <p className="text-[10px] text-[#8D786D] italic pt-1 border-t border-[#EFE8DE]">
                    Kerakli o'zgaruvchilar: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Google Sign-in Action Button */}
          <div className="space-y-3">
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className={`w-full min-h-[52px] px-6 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 transition-all btn-tactile shadow-xs ${
                isConfigured
                  ? 'bg-[#493329] hover:bg-[#3D2A22] text-[#F8F4ED] border border-[#644738] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]'
                  : 'bg-[#493329] hover:bg-[#3D2A22] text-[#F8F4ED] border border-[#644738]'
              }`}
            >
              {/* Google Brand G SVG */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Tekshirilmoqda...' : 'Google orqali kirish'}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8D786D]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D0AE70]" />
              <span>Firebase xavfsiz protokoli orqali kafolatlangan</span>
            </div>
          </div>
        </div>

        {/* Proposed Plan Entitlements Transparent Showcase */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#795640]">
              Tariflar va belgilangan kunlik limitlar
            </h3>
            <p className="text-xs text-[#8D786D] mt-0.5">
              Tizimga kirganingizda avtomatik ravishda Bepul (Free) hisob ochiladi
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Free Plan */}
            <div className="bg-white border-2 border-[#D0AE70] rounded-2xl p-4 shadow-card space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#493329]">{PLANS.free.name}</span>
                <span className="text-[10px] font-semibold text-[#34221A] bg-[#D0AE70] px-2 py-0.5 rounded-full">
                  Dastlabki
                </span>
              </div>
              <div className="text-base font-extrabold text-[#493329] font-mono">
                {PLANS.free.priceLabel}
              </div>
              <div className="text-[11px] text-[#6B5549] space-y-1 pt-1 border-t border-[#EFE8DE]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D0AE70] shrink-0" />
                  <span>Reklama: <strong>{PLANS.free.dailyAdLimit} ta/kun</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D0AE70] shrink-0" />
                  <span>Shablonlar: <strong>{PLANS.free.customTemplateLimit} ta</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D0AE70] shrink-0" />
                  <span>Foyda kalkulyatori</span>
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-white border border-[#E6DCD1] rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#493329]">{PLANS.pro.name}</span>
                <span className="text-[10px] font-semibold text-[#795640] bg-[#FAF6F0] px-2 py-0.5 rounded-full border border-[#E6DCD1]">
                  Rejalashtirilgan
                </span>
              </div>
              <div className="text-base font-extrabold text-[#493329] font-mono">
                {PLANS.pro.priceLabel}
              </div>
              <div className="text-[11px] text-[#6B5549] space-y-1 pt-1 border-t border-[#EFE8DE]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#795640] shrink-0" />
                  <span>Reklama: <strong>{PLANS.pro.dailyAdLimit} ta/kun</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#795640] shrink-0" />
                  <span>Shablonlar: <strong>{PLANS.pro.customTemplateLimit} ta</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#795640] shrink-0" />
                  <span>Kengaytirilgan tahlil</span>
                </div>
              </div>
            </div>

            {/* Ultra Plan */}
            <div className="bg-white border border-[#E6DCD1] rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#493329]">{PLANS.ultra.name}</span>
                <span className="text-[10px] font-semibold text-[#795640] bg-[#FAF6F0] px-2 py-0.5 rounded-full border border-[#E6DCD1]">
                  Rejalashtirilgan
                </span>
              </div>
              <div className="text-base font-extrabold text-[#493329] font-mono">
                {PLANS.ultra.priceLabel}
              </div>
              <div className="text-[11px] text-[#6B5549] space-y-1 pt-1 border-t border-[#EFE8DE]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#795640] shrink-0" />
                  <span>Reklama: <strong>{PLANS.ultra.dailyAdLimit} ta/kun</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#795640] shrink-0" />
                  <span>Shablonlar: <strong>{PLANS.ultra.customTemplateLimit}+ ta</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#795640] shrink-0" />
                  <span>Jamoaviy eksport</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
