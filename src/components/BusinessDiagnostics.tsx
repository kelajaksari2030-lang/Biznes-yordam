import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Copy,
  RotateCcw,
  BookmarkCheck,
  ChevronRight,
  Info,
  Target,
  BarChart2,
  HelpCircle,
  Building2,
  Loader2,
} from 'lucide-react';
import { BusinessDiagnosticsInput, BusinessDiagnosticsResult } from '../types';
import { runBusinessDiagnostics } from '../services/businessDiagnosticsService';
import { useAuth } from '../context/AuthContext';
import { getBusinessProfile } from '../services/businessService';

const POPULAR_BUSINESS_TYPES = [
  "Kiyim va poyabzal do'koni",
  "O'quv markazi / Kurslar",
  "Kafe / Fast-food / Restoran",
  "Go'zallik saloni / Sartaroshxona",
  "Onlayn Telegram / Instagram do'kon",
  "Maishiy xizmatlar va ta'mirlash",
  "Ishlab chiqarish / Hunarmandchilik",
  "Qurilish mollari va xo'jalik do'koni",
];

const COMMON_PROBLEMS = [
  "Reklama bor, lekin sotuvga aylanish kam (past konversiya)",
  "Mijozlar bir marta olib, qaytib kelmayapti",
  "Ko'pchilik 'narxi qimmat' deb ketib qolmoqda",
  "Aylanma bor, lekin sof foyda kam qolyapti (marja past)",
  "Murojaatlarga javob berish sekin yoki xodimlar eplay olmayapti",
];

const COMMON_GOALS = [
  "Oylik sof foydani 2 barobarga oshirish",
  "Doimiy mijozlar bazasini 50% ga kengaytirish",
  "Yangi shahar yoki hududda filial ochish",
  "Reklama xarajatlarini kamaytirib, konversiyani oshirish",
];

export interface BusinessDiagnosticsProps {
  onOpenBusinessProfile?: () => void;
}

export const BusinessDiagnostics: React.FC<BusinessDiagnosticsProps> = ({ onOpenBusinessProfile }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<BusinessDiagnosticsInput>({
    businessType: "Kiyim va poyabzal do'koni",
    productOrService: '',
    targetAudience: '',
    monthlyRevenue: '',
    mainProblem: '',
    currentGoal: '',
  });

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [result, setResult] = useState<BusinessDiagnosticsResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedHistory, setSavedHistory] = useState<BusinessDiagnosticsResult[]>([]);

  const handleLoadFromProfile = async () => {
    if (!user) {
      setProfileNotice("Profilingizdan ma'lumot yuklash uchun avval tizimga kiring.");
      return;
    }
    setProfileLoading(true);
    setProfileNotice(null);
    try {
      const profile = await getBusinessProfile(user.uid);
      if (profile && (profile.companyName || profile.category || profile.targetAudience)) {
        setFormData((prev) => ({
          ...prev,
          businessType: profile.category || prev.businessType,
          productOrService: profile.companyName ? `${profile.companyName}${profile.description ? ` (${profile.description})` : ''}` : prev.productOrService,
          targetAudience: profile.targetAudience || prev.targetAudience,
        }));
        setProfileNotice(`“${profile.companyName}” profilingizdan ma'lumotlar yuklandi. Istalgan maydonni tahrirlashingiz mumkin.`);
      } else {
        setProfileNotice("Sizda hali saqlangan biznes profili yo'q. Yangi profil kiritish uchun “Profil yaratish” tugmasini bosing.");
      }
    } catch {
      setProfileNotice("Profil ma'lumotlarini yuklashda xatolik yuz berdi.");
    } finally {
      setProfileLoading(false);
    }
  };

  // Load saved diagnostics from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('biznes_saved_diagnostics');
      if (stored) {
        setSavedHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productOrService.trim() || !formData.mainProblem.trim()) {
      return;
    }

    setLoading(true);
    // Simulate brief AI synthesis feel
    setTimeout(() => {
      const diagResult = runBusinessDiagnostics(formData);
      setResult(diagResult);
      setLoading(false);
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }, 450);
  };

  const handleSaveResult = () => {
    if (!result) return;
    try {
      const updated = [result, ...savedHistory.filter((item) => item.id !== result.id)].slice(0, 10);
      setSavedHistory(updated);
      localStorage.setItem('biznes_saved_diagnostics', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const handleCopyReport = () => {
    if (!result) return;

    const textReport = `📊 BIZNES DIAGNOSTIKASI HISOBOTI: ${result.input.productOrService}
Kategoriya: ${result.input.businessType}
Hosil qilingan sana: ${new Date(result.createdAt).toLocaleDateString('uz-UZ')}

1. BIZNES HOLATI TAHLILI:
${result.summary}

2. ENG MUHIM 3 TA XAVF / MUAMMO:
${result.topRisks.map((r, i) => `${i + 1}. ${r}`).join('\n')}

3. O'SISH UCHUN 3 TA IMKONIYAT:
${result.growthOpportunities.map((g, i) => `💡 ${g}`).join('\n')}

4. BIRINCHI NAVBATDAGI ASOSIY VAZIFA:
🎯 ${result.primaryPriorityTask.title}
Sababi: ${result.primaryPriorityTask.rationale}
Kutiladigan natija: ${result.primaryPriorityTask.expectedOutcome}

5. KEYINGI 7 KUNLIK AMALIY HARAKATLAR REJASI:
${result.sevenDayActionPlan.map((p) => `📌 ${p.day}: ${p.task}\n   Batafsil: ${p.details}`).join('\n\n')}

6. STRATEGIK XULOSA VA KUZATILADIGAN METRIKALAR:
${result.reasoningAndOutcome.strategicReason}
${result.reasoningAndOutcome.expectedImpact}
Nazorat ko'rsatkichlari:
${result.reasoningAndOutcome.metricsToTrack.map((m) => ` - ${m}`).join('\n')}

Tahlilchi: BESTO AI Diagnostika`;

    navigator.clipboard.writeText(textReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div 
        className="scroll-reveal bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
      >
        <div className="space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D7F0E5] text-[#173B35] rounded-lg text-xs font-semibold border border-[#E0ECE8]/60">
            <Sparkles className="w-3.5 h-3.5 text-[#F5B85C]" />
            <span>AI Biznes Diagnostikasi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#112521]">
            Biznesingizni tahlil qiling va o'sish nuqtalarini toping
          </h1>
          <p className="text-sm text-[#52796F] leading-relaxed">
            Biznesingiz holati, to'siqlar va maqsadlaringizni kiriting. Tizim eng muhim 3 ta xavf, 3 ta imkoniyat hamda keyingi 7 kun uchun bosqichma-bosqich amaliy harakatlar rejasini shakllantirib beradi.
          </p>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-[#E0ECE8] pt-4 sm:pt-0 sm:pl-6 text-xs text-[#52796F] shrink-0 gap-2">
          <div className="flex items-center gap-1.5 text-[#173B35] font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#F5B85C]" />
            <span>Xavfsiz va maxfiy</span>
          </div>
          <span>Moliyaviy ma'lumotlar ixtiyoriy</span>
        </div>
      </div>

      {/* Main Grid: Form + Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Input Form (5 cols on lg) */}
        <div 
          className="scroll-reveal lg:col-span-5 bg-white border border-[#E0ECE8] rounded-2xl p-6 shadow-card space-y-6"
          style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between border-b border-[#E0ECE8] pb-4">
            <h2 className="text-base font-bold text-[#112521] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#F5B85C]" />
              <span>Biznes ma'lumotlari</span>
            </h2>
            <button
              type="button"
              onClick={handleLoadFromProfile}
              disabled={profileLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#112521] bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] rounded-xl transition-all btn-tactile disabled:opacity-50"
              title="Saqlangan biznes profilingizdan ma'lumotlarni to'ldirish"
            >
              {profileLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-[#F5B85C] animate-spin" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-[#173B35]" />
              )}
              <span>Profilimdan yuklash</span>
            </button>
          </div>

          {profileNotice && (
            <div className="p-3 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#173B35] flex items-start justify-between gap-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#F5B85C] shrink-0 mt-0.5" />
                <span className="leading-snug">{profileNotice}</span>
              </div>
              {onOpenBusinessProfile && profileNotice.includes("profil") && (
                <button
                  type="button"
                  onClick={onOpenBusinessProfile}
                  className="text-[11px] font-bold text-[#112521] bg-[#F5B85C] hover:bg-[#E5A749] px-2.5 py-1 rounded-lg shrink-0 btn-tactile whitespace-nowrap"
                >
                  Profil yaratish
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Business Type */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#112521]">
                Biznes turi <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5C7B7] bg-[#F6F8F7] text-[#112521] text-xs focus:outline-none focus:ring-2 focus:ring-[#F5B85C] transition-colors"
                required
              >
                {POPULAR_BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Product / Service */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#112521]">
                Mahsulot yoki xizmat nomi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.productOrService}
                onChange={(e) => setFormData({ ...formData, productOrService: e.target.value })}
                placeholder="Masalan: Erkaklar klassik kiyimlari yoki IELTS tayyorlov kursi"
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5C7B7] bg-[#F6F8F7] text-[#112521] text-xs focus:outline-none focus:ring-2 focus:ring-[#F5B85C] transition-colors"
                required
              />
            </div>

            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#112521]">
                Mijozlar kimligi (Auditoriya) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                placeholder="Masalan: 20-40 yoshli ishbilarmon erkaklar yoki talabalar"
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5C7B7] bg-[#F6F8F7] text-[#112521] text-xs focus:outline-none focus:ring-2 focus:ring-[#F5B85C] transition-colors"
                required
              />
            </div>

            {/* Monthly Revenue (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[#112521]">
                  Oylik tushum / aylanma
                </label>
                <span className="text-[10px] text-[#52796F] bg-[#D7F0E5] px-2 py-0.5 rounded-md font-medium">
                  Ixtiyoriy
                </span>
              </div>
              <input
                type="text"
                value={formData.monthlyRevenue}
                onChange={(e) => setFormData({ ...formData, monthlyRevenue: e.target.value })}
                placeholder="Masalan: 15-30 mln so'm (maxfiy bo'lsa bo'sh qoldiring)"
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5C7B7] bg-[#F6F8F7] text-[#112521] text-xs focus:outline-none focus:ring-2 focus:ring-[#F5B85C] transition-colors"
              />
              <p className="text-[10px] text-[#52796F] italic">
                * Kiritilmasa, AI taxminni fakt deb ko'rsatmasdan, umumiy bozor mezonlariga tayanadi.
              </p>
            </div>

            {/* Main Problem */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#112521]">
                Asosiy to'siq yoki muammo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.mainProblem}
                onChange={(e) => setFormData({ ...formData, mainProblem: e.target.value })}
                placeholder="Sizni hozirda eng ko'p qiynayotgan muammoni yozing yoki pastdagi andozalardan tanlang..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5C7B7] bg-[#F6F8F7] text-[#112521] text-xs focus:outline-none focus:ring-2 focus:ring-[#F5B85C] transition-colors resize-none"
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COMMON_PROBLEMS.slice(0, 3).map((prob, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormData({ ...formData, mainProblem: prob })}
                    className="text-[10px] text-left px-2 py-1 bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] rounded-lg text-[#52796F] transition-colors"
                  >
                    + {prob.slice(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Current Goal */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#112521]">
                Hozirgi bosh maqsad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.currentGoal}
                onChange={(e) => setFormData({ ...formData, currentGoal: e.target.value })}
                placeholder="Masalan: Sotuvni 2 baravar oshirish yoki mijozlar bazasini kengaytirish"
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5C7B7] bg-[#F6F8F7] text-[#112521] text-xs focus:outline-none focus:ring-2 focus:ring-[#F5B85C] transition-colors"
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COMMON_GOALS.slice(0, 2).map((g, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormData({ ...formData, currentGoal: g })}
                    className="text-[10px] text-left px-2 py-1 bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] rounded-lg text-[#52796F] transition-colors"
                  >
                    + {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 px-4 py-3 bg-[#F5B85C] hover:bg-[#E5A749] text-[#112521] font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 btn-tactile focus:outline-none focus:ring-2 focus:ring-[#F5B85C]"
            >
              <Sparkles className="w-4 h-4 text-[#112521]" />
              <span>{loading ? "Tahlil qilinmoqda..." : "Diagnostikani boshlash"}</span>
            </button>
          </form>

          {/* Saved History Quick Selector */}
          {savedHistory.length > 0 && (
            <div className="pt-4 border-t border-[#E0ECE8] space-y-2">
              <span className="text-[11px] font-semibold text-[#173B35] block">
                Oldingi saqlangan tahlillar ({savedHistory.length}):
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {savedHistory.map((hist) => (
                  <button
                    key={hist.id}
                    onClick={() => {
                      setFormData(hist.input);
                      setResult(hist);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="truncate font-medium text-[#112521] max-w-[190px]">
                      {hist.input.productOrService}
                    </span>
                    <span className="text-[10px] text-[#52796F] shrink-0">
                      {new Date(hist.createdAt).toLocaleDateString('uz-UZ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Output Area (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          {!result && !loading && (
            <div className="bg-white border border-[#E0ECE8] border-dashed rounded-3xl p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#D7F0E5] text-[#173B35] mx-auto flex items-center justify-center">
                <BarChart2 className="w-8 h-8 text-[#F5B85C]" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-[#112521]">
                  Tahlil natijalari bu yerda chiqadi
                </h3>
                <p className="text-xs text-[#52796F] leading-relaxed">
                  Chap tarafdagi formani to'ldirib, "Diagnostikani boshlash" tugmasini bosing. Sizga 6 ta amaliy yo'nalish bo'yicha to'liq hisobot taqdim etiladi.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-white border border-[#E0ECE8] rounded-3xl p-12 text-center space-y-4 animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-[#112521] text-[#F5B85C] mx-auto flex items-center justify-center font-bold text-lg font-serif">
                B
              </div>
              <h3 className="text-sm font-bold text-[#112521]">
                AI biznes diagnostikasi hisoblanmoqda...
              </h3>
              <p className="text-xs text-[#52796F] max-w-sm mx-auto">
                Muammolar, o'sish nuqtalari va 7 kunlik amaliy reja shakllantirilmoqda.
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-6">
              {/* Top Controls Toolbar */}
              <div 
                className="scroll-reveal flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E0ECE8]"
                style={{ '--reveal-delay': '40ms' } as React.CSSProperties}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#112521]">
                    Diagnostika hisoboti
                  </span>
                  <span className="text-[10px] text-[#173B35] bg-[#D7F0E5] px-2 py-0.5 rounded-full font-medium">
                    {new Date(result.createdAt).toLocaleDateString('uz-UZ')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E0ECE8] bg-[#F6F8F7] hover:bg-[#E0ECE8] text-xs font-medium text-[#112521] transition-colors btn-tactile"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#173B35]" />
                    <span>{copied ? "Nusxalandi!" : "Nusxa olish"}</span>
                  </button>

                  <button
                    onClick={handleSaveResult}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E0ECE8] bg-[#F6F8F7] hover:bg-[#E0ECE8] text-xs font-medium text-[#112521] transition-colors btn-tactile"
                    title="Natijani saqlash"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5 text-[#F5B85C]" />
                    <span>Saqlash</span>
                  </button>

                  <button
                    onClick={() => {
                      setResult(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-1.5 rounded-xl border border-[#E0ECE8] hover:bg-[#F6F8F7] text-[#52796F] transition-colors"
                    title="Qayta to'ldirish"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 1. Summary Card */}
              <div 
                className="scroll-reveal bg-white border border-[#E0ECE8] rounded-2xl p-5 shadow-card space-y-3"
                style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#112521]">
                  <span className="w-2 h-2 rounded-full bg-[#F5B85C]"></span>
                  <span>1. Biznes holatining qisqa tahlili</span>
                </div>
                <p className="text-xs text-[#112521] leading-relaxed">
                  {result.summary}
                </p>
                {result.confidenceNote && (
                  <div className="flex items-start gap-2 p-2.5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-[11px] text-[#173B35]">
                    <Info className="w-4 h-4 text-[#F5B85C] shrink-0 mt-0.5" />
                    <span>{result.confidenceNote}</span>
                  </div>
                )}
              </div>

              {/* 5. Primary Priority Task (Positioned with high prominence) */}
              <div 
                className="scroll-reveal bg-linear-to-br from-[#112521] to-[#112521] text-white rounded-2xl p-5 sm:p-6 shadow-card space-y-3 border border-[#6B5041]"
                style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5B85C]/20 border border-[#F5B85C]/40 text-[#F5B85C] text-[10px] font-bold uppercase tracking-wider">
                    <Target className="w-3 h-3" />
                    <span>Birinchi navbatdagi vazifa (Quick Win)</span>
                  </div>
                  <span className="text-[11px] text-[#F5B85C] font-semibold">1-o'rindagi ustuvorlik</span>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-white">
                  {result.primaryPriorityTask.title}
                </h4>

                <div className="space-y-1.5 text-xs text-[#E0ECE8] pt-1">
                  <p>
                    <strong className="text-[#F5B85C]">Sababi:</strong> {result.primaryPriorityTask.rationale}
                  </p>
                  <p>
                    <strong className="text-[#F5B85C]">Kutiladigan natija:</strong> {result.primaryPriorityTask.expectedOutcome}
                  </p>
                </div>
              </div>

              {/* 2 & 3. Risks & Growth Opportunities Grid */}
              <div 
                className="scroll-reveal grid grid-cols-1 md:grid-cols-2 gap-4"
                style={{ '--reveal-delay': '160ms' } as React.CSSProperties}
              >
                {/* 2. Top 3 Risks */}
                <div className="bg-white border border-[#E0ECE8] rounded-2xl p-5 shadow-card space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#A84234]">
                    <AlertTriangle className="w-4 h-4 text-[#A84234] shrink-0" />
                    <span>2. Eng muhim 3 ta xavf</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#52796F]">
                    {result.topRisks.map((risk, index) => (
                      <li key={index} className="flex items-start gap-2 bg-[#FDF9F8] p-2 rounded-xl border border-[#F3E2DF]">
                        <span className="w-4 h-4 rounded-full bg-[#A84234] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="leading-snug">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Growth Opportunities */}
                <div className="bg-white border border-[#E0ECE8] rounded-2xl p-5 shadow-card space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#173B35]">
                    <TrendingUp className="w-4 h-4 text-[#F5B85C] shrink-0" />
                    <span>3. O'sish uchun 3 ta imkoniyat</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#52796F]">
                    {result.growthOpportunities.map((opp, index) => (
                      <li key={index} className="flex items-start gap-2 bg-[#FDFBF7] p-2 rounded-xl border border-[#E0ECE8]">
                        <span className="w-4 h-4 rounded-full bg-[#F5B85C] text-[#112521] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="leading-snug">{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 4. 7-Day Action Plan */}
              <div 
                className="scroll-reveal bg-white border border-[#E0ECE8] rounded-2xl p-5 shadow-card space-y-3"
                style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
              >
                <div className="flex items-center justify-between border-b border-[#E0ECE8] pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#112521]">
                    <Calendar className="w-4 h-4 text-[#F5B85C]" />
                    <span>4. Keyingi 7 kun uchun amaliy harakatlar rejasi</span>
                  </div>
                  <span className="text-[10px] text-[#52796F]">Ketma-ket tartib</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {result.sevenDayActionPlan.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl space-y-1 hover:border-[#F5B85C] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#173B35] uppercase tracking-wider">
                          {step.day}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#F5B85C]" />
                      </div>
                      <h5 className="text-xs font-semibold text-[#112521] leading-tight">
                        {step.task}
                      </h5>
                      <p className="text-[11px] text-[#52796F] leading-snug">
                        {step.details}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Strategic Reasoning & Expected Outcome */}
              <div 
                className="scroll-reveal bg-white border border-[#E0ECE8] rounded-2xl p-5 shadow-card space-y-3"
                style={{ '--reveal-delay': '240ms' } as React.CSSProperties}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#112521]">
                  <HelpCircle className="w-4 h-4 text-[#F5B85C]" />
                  <span>6. Tavsiyalarning sababi va kutiladigan natijasi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#52796F]">
                  <div className="space-y-1 p-3 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8]">
                    <span className="font-semibold text-[#112521] block">Nima uchun bu choralar tanlandi?</span>
                    <p className="text-[11px] leading-relaxed">{result.reasoningAndOutcome.strategicReason}</p>
                  </div>

                  <div className="space-y-1 p-3 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8]">
                    <span className="font-semibold text-[#112521] block">Qanday samara kutiladi?</span>
                    <p className="text-[11px] leading-relaxed">{result.reasoningAndOutcome.expectedImpact}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E0ECE8] space-y-1.5">
                  <span className="text-[11px] font-semibold text-[#173B35] block">
                    Kuzatilishi kerak bo'lgan asosiy ko'rsatkichlar (KPI):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.reasoningAndOutcome.metricsToTrack.map((metric, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-[#D7F0E5] text-[#173B35] text-[10px] font-medium rounded-lg border border-[#E0ECE8]/60"
                      >
                        ✓ {metric}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
