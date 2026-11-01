import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  Info,
  TrendingUp,
  Target,
  BarChart3,
  HelpCircle,
  ChevronRight,
  BookmarkCheck,
  Send,
  Instagram,
  Video,
  Globe,
  Sliders,
  DollarSign
} from 'lucide-react';
import { AdLabInput, AdLabResult, AdLabPlatform, AdLabObjective, AdLabStrategy } from '../types';
import { runAdLabExperiment } from '../services/adLabService';

const PRESET_EXPERIMENTS: { label: string; data: AdLabInput }[] = [
  {
    label: "Erkaklar klassik soati (Instagram / Sotuv)",
    data: {
      productOrService: "Erkaklar klassik suv o'tkazmaydigan po'lat soati",
      targetAudience: "22-45 yoshli erkaklar, tadbirkorlar va ofis xodimlari",
      platform: "instagram",
      objective: "sales",
      budget: "Kuniga $5 (taxminan 65,000 so'm)",
      specialOfferOrStyle: "Bugun xarid qilganlarga 20% chegirma + sovg'a charm qutisi",
    },
  },
  {
    label: "IELTS / Ingliz tili kursi (Telegram / Murojaat)",
    data: {
      productOrService: "3 oylik intensiv IELTS 7.0+ tayyorlov kursi",
      targetAudience: "Abituriyentlar, talabalar va xorijga ketmoqchi bo'lganlar",
      platform: "telegram",
      objective: "leads",
      budget: "Oylik 1,500,000 so'm",
      specialOfferOrStyle: "Birinchi bepul sinov darsi va darajani aniqlash diagnostikasi",
    },
  },
  {
    label: "Fast-food / Burger yetkazish (TikTok / Sotuv)",
    data: {
      productOrService: "Qarsildoq tovuqli burger va maxsus qiyqiriq souslar",
      targetAudience: "16-30 yoshli yoshlar, maktab va talabalar",
      platform: "tiktok",
      objective: "sales",
      budget: "Kuniga 40,000 so'm",
      specialOfferOrStyle: "2 ta burger olsangiz, fri va kola bepul qo'shib beriladi",
    },
  },
  {
    label: "Go'zallik saloni / Makiyaj (Instagram / Obunachi & Brend)",
    data: {
      productOrService: "To'y va marosimlar uchun premium makiyaj va soch turmagi",
      targetAudience: "Kelinlar, bitiruvchilar va 18-35 yoshli ayollar",
      platform: "instagram",
      objective: "followers",
      budget: "Haftasiga 300,000 so'm",
      specialOfferOrStyle: "To'y paketiga kelin dugonasi uchun 50% chegirmali makiyaj",
    },
  },
];

export const AdLab: React.FC = () => {
  const [formData, setFormData] = useState<AdLabInput>({
    productOrService: "Erkaklar klassik suv o'tkazmaydigan po'lat soati",
    targetAudience: "22-45 yoshli erkaklar, tadbirkorlar va talabalar",
    platform: "instagram",
    objective: "sales",
    budget: "",
    specialOfferOrStyle: "20% chegirma va bepul yetkazib berish",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdLabResult | null>(null);
  const [copiedStrategyId, setCopiedStrategyId] = useState<string | null>(null);
  const [copiedFullReport, setCopiedFullReport] = useState(false);
  const [activeStrategyTab, setActiveStrategyTab] = useState<number>(0);
  const [savedHistory, setSavedHistory] = useState<AdLabResult[]>([]);

  // Load saved tests from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('biznes_saved_ad_lab_tests');
      if (stored) {
        setSavedHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleApplyPreset = (preset: AdLabInput) => {
    setFormData(preset);
  };

  const handleRunExperiment = () => {
    if (!formData.productOrService.trim()) return;

    setLoading(true);
    // Smooth transition simulation for AI hypothesis generation
    setTimeout(() => {
      const res = runAdLabExperiment(formData);
      setResult(res);
      setLoading(false);

      // Save to localStorage
      try {
        const updated = [res, ...savedHistory.slice(0, 9)];
        setSavedHistory(updated);
        localStorage.setItem('biznes_saved_ad_lab_tests', JSON.stringify(updated));
      } catch {
        // Ignore
      }

      // Scroll smoothly to results
      setTimeout(() => {
        const el = document.getElementById('ad-lab-results');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }, 450);
  };

  const handleCopyStrategy = (strategy: AdLabStrategy) => {
    const text = [
      `📌 ${strategy.title}`,
      `🎯 Sarlavha: ${strategy.hookHeadline}`,
      `\n📝 Matn:\n${strategy.bodyText}`,
      `\n⚡ Chaqiriq (CTA): ${strategy.callToAction}`,
      `\n👥 Tavsiya etilgan auditoriya: ${strategy.recommendedAudience}`,
      `\n💪 Kuchli tomoni: ${strategy.strength}`,
      `⚠️ Ehtimoliy zaifligi: ${strategy.potentialWeakness}`,
      `\n🔬 Sinash bo'yicha tavsiya: ${strategy.testingAdvice}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedStrategyId(strategy.id);
    setTimeout(() => setCopiedStrategyId(null), 2500);
  };

  const handleCopyFullReport = () => {
    if (!result) return;

    const sections = [
      `🧪 BESTO REKLAMA LABORATORIYASI TAQQOSLASH HISOBOTI`,
      `Mahsulot: ${result.input.productOrService}`,
      `Auditoriya: ${result.input.targetAudience}`,
      `Kanal: ${result.input.platform.toUpperCase()} | Maqsad: ${result.input.objective}`,
      result.input.budget ? `Budjet: ${result.input.budget}` : `Budjet: Belgilanmagan`,
      result.input.specialOfferOrStyle ? `Taklif/Uslub: ${result.input.specialOfferOrStyle}` : '',
      `\n========================================`,
      `🏆 TAVSIYA ETILGAN BOSHLANG'ICH GIPOTEZA:`,
      `${result.recommendedStartingVariant.strategyTitle}`,
      `Sababi: ${result.recommendedStartingVariant.reason}`,
      `\n${result.recommendedStartingVariant.disclaimer}`,
      `\n========================================`,
      `3 TA TAQQOSLANUVCHI REKLAMA STRATEGIYASI:`,
      ...result.strategies.map((s, idx) => (
        `\n[VARIANT #${idx + 1}: ${s.title}]\nSarlavha: ${s.hookHeadline}\nMatn:\n${s.bodyText}\nCTA: ${s.callToAction}\nAuditoriya: ${s.recommendedAudience}\nKuchli tomoni: ${s.strength}\nZaifligi: ${s.potentialWeakness}\nSinash tavsiyasi: ${s.testingAdvice}\n`
      )),
      `\n========================================`,
      `📊 METRIKALARNI SOLISHTIRISH VA BAHOLASH:`,
      ...result.metricsComparison.map(m => (
        `• ${m.metric} (${m.description}):\n  - 1-Variant: ${m.strategy1Focus}\n  - 2-Variant: ${m.strategy2Focus}\n  - 3-Variant: ${m.strategy3Focus}\n  Maslahat: ${m.evaluationTip}`
      )),
      `\n========================================`,
      `💰 BUDJET VA A/B SINOV TAVSIYASI:`,
      result.budgetTestingRecommendation,
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(sections);
    setCopiedFullReport(true);
    setTimeout(() => setCopiedFullReport(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div 
        className="scroll-reveal bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card relative overflow-hidden"
        style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#F5B85C]/10 via-[#F6F8F7] to-transparent rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F6F8F7] border border-[#E0ECE8] text-[#173B35] text-xs font-semibold">
              <FlaskConical className="w-3.5 h-3.5 text-[#F5B85C]" />
              <span>A/B Strategiya va gipotezalarni sinash laboratoriyasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#112521]">
              Reklama laboratoriyasi
            </h1>
            <p className="text-sm text-[#52796F] leading-relaxed">
              Bitta reklama chiqarib tavakkal qilmang! 3 ta bir-biridan farq qiluvchi strategiyani solishtiring, kuchli va zaif tomonlarini o'rganing hamda natijalarni taqqoslash jadvali bilan eng kam budjetda aniq sinov o'tkazing.
            </p>
          </div>

          <div className="flex md:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-[#E0ECE8]">
            <div className="text-left md:text-right">
              <span className="text-xs text-[#52796F] block">Saqlangan sinovlar:</span>
              <span className="text-base font-bold text-[#112521]">
                {savedHistory.length} ta tajriba
              </span>
            </div>
            {savedHistory.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Haqiqatan ham saqlangan barcha laboratoriya sinovlarini tozalamoqchimisiz?")) {
                    setSavedHistory([]);
                    localStorage.removeItem('biznes_saved_ad_lab_tests');
                  }
                }}
                className="text-[11px] text-[#A64B3D] hover:underline"
              >
                Tarixni tozalash
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Quick Selectors */}
      <div 
        className="scroll-reveal space-y-2.5"
        style={{ '--reveal-delay': '60ms' } as React.CSSProperties}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#52796F]">
          <Sparkles className="w-3.5 h-3.5 text-[#F5B85C]" />
          <span>Tezkor sinash uchun namunalar:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESET_EXPERIMENTS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(preset.data)}
              className="text-left p-3 rounded-xl bg-white border border-[#E0ECE8] hover:border-[#F5B85C] hover:bg-[#F6F8F7] transition-all text-xs font-medium text-[#112521] btn-tactile shadow-xs flex items-center justify-between group"
            >
              <span className="line-clamp-1">{preset.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#F5B85C] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Input Parameters Form */}
      <div 
        className="scroll-reveal bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card space-y-6"
        style={{ '--reveal-delay': '100ms' } as React.CSSProperties}
      >
        <h2 className="text-lg font-bold text-[#112521] flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#173B35]" />
          <span>Reklama parametrlari va maqsadi</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product / Service */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-[#112521] flex items-center gap-1">
              <span>Mahsulot yoki xizmat nomi</span>
              <span className="text-[#A64B3D]">*</span>
            </label>
            <input
              type="text"
              value={formData.productOrService}
              onChange={(e) => setFormData({ ...formData, productOrService: e.target.value })}
              placeholder="Masalan: Erkaklar charm kurtkasi, Matematika o'quv kursi, Xonadon tozalash xizmati"
              className="w-full px-4 py-2.5 text-sm bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5B85C] text-[#112521] transition-all"
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#112521] flex items-center gap-1">
              <span>Maqsadli mijozlar (Auditoriya)</span>
              <span className="text-[#A64B3D]">*</span>
            </label>
            <input
              type="text"
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              placeholder="Masalan: Yosh onalar, talabalar, haydovchilar, qurilish ustalari"
              className="w-full px-4 py-2.5 text-sm bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5B85C] text-[#112521] transition-all"
            />
          </div>

          {/* Platform */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#112521]">
              Reklama joylashtiriladigan kanal
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'instagram', label: 'Instagram', icon: Instagram },
                { key: 'telegram', label: 'Telegram', icon: Send },
                { key: 'tiktok', label: 'TikTok', icon: Video },
                { key: 'other', label: 'Boshqa', icon: Globe },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, platform: key as AdLabPlatform })}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all btn-tactile ${
                    formData.platform === key
                      ? 'bg-[#112521] text-[#F5B85C] border-[#112521] shadow-xs'
                      : 'bg-[#F6F8F7] text-[#52796F] border-[#E0ECE8] hover:bg-[#E0ECE8]'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-[11px] truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Objective */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#112521]">
              Reklamaning asosiy maqsadi
            </label>
            <select
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value as AdLabObjective })}
              className="w-full px-4 py-2.5 text-sm bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5B85C] text-[#112521] transition-all"
            >
              <option value="sales">To'g'ridan-to'g'ri sotuv (Xarid va to'lov)</option>
              <option value="leads">Murojaat va ariza yig'ish (Direct/Telegram xabarlar)</option>
              <option value="followers">Obunachi va profilni rivojlantirish</option>
              <option value="brand_awareness">Brend tanilishi va ishonch uyg'otish</option>
            </select>
          </div>

          {/* Budget (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#112521] flex items-center justify-between">
              <span>Rejalashtirilgan budjet</span>
              <span className="text-[11px] text-[#52796F] font-normal">(ixtiyoriy)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.budget || ''}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="Masalan: Kuniga $5, yoki haftasiga 500,000 so'm"
                className="w-full px-4 py-2.5 pl-9 text-sm bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5B85C] text-[#112521] transition-all"
              />
              <DollarSign className="w-4 h-4 text-[#52796F] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Special Offer or Style (Optional) */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-[#112521] flex items-center justify-between">
              <span>Maxsus taklif yoki reklama uslubi</span>
              <span className="text-[11px] text-[#52796F] font-normal">(ixtiyoriy)</span>
            </label>
            <input
              type="text"
              value={formData.specialOfferOrStyle || ''}
              onChange={(e) => setFormData({ ...formData, specialOfferOrStyle: e.target.value })}
              placeholder="Masalan: 20% chegirma, bepul konsultatsiya, 1+1 aksiyasi yoki hazil uslubida"
              className="w-full px-4 py-2.5 text-sm bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5B85C] text-[#112521] transition-all"
            />
          </div>
        </div>

        {/* Generate / Run Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#52796F] flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#F5B85C] shrink-0" />
            <span>3 xil yondashuvdagi gipotezalar va taqqoslash jadvali yaratiladi.</span>
          </p>

          <button
            onClick={handleRunExperiment}
            disabled={loading || !formData.productOrService.trim() || !formData.targetAudience.trim()}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-[#112521] bg-[#F5B85C] hover:bg-[#E5A749] disabled:opacity-50 disabled:cursor-not-allowed border border-[#F5B85C]/50 rounded-xl transition-all btn-tactile shadow-xs flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C]"
          >
            {loading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-[#112521]" />
                <span>Strategiyalar tahlil qilinmoqda...</span>
              </>
            ) : (
              <>
                <FlaskConical className="w-4 h-4 text-[#112521]" />
                <span>3 ta strategiyani yaratish va solishtirish</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div id="ad-lab-results" className="space-y-8 animate-fadeIn">
          {/* Top Summary & Recommended Starting Variant */}
          <div 
            className="scroll-reveal bg-[#112521] text-[#F8F4ED] rounded-3xl p-6 sm:p-8 shadow-card border border-[#5E4235] space-y-4"
            style={{ '--reveal-delay': '40ms' } as React.CSSProperties}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#173B35] border border-[#6B5041] text-[#F5B85C] text-xs font-semibold">
                <Target className="w-3.5 h-3.5" />
                <span>Tavsiya etilgan boshlang'ich gipoteza</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyFullReport}
                  className="px-3 py-1.5 rounded-xl bg-[#173B35] hover:bg-[#523A2E] text-xs font-medium text-[#F6F8F7] border border-[#6B5041] transition-all flex items-center gap-1.5 btn-tactile"
                >
                  {copiedFullReport ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#F5B85C]" />
                      <span>To'liq hisobot nusxalandi!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#F5B85C]" />
                      <span>To'liq hisobotdan nusxa olish</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {result.recommendedStartingVariant.strategyTitle}
              </h3>
              <p className="text-sm text-[#E0ECE8] mt-2 leading-relaxed">
                {result.recommendedStartingVariant.reason}
              </p>
            </div>

            {/* Disclaimer Banner */}
            <div className="p-3.5 rounded-2xl bg-[#173B35]/90 border border-[#6B5041] text-xs text-[#D7C9BF] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#F5B85C] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {result.recommendedStartingVariant.disclaimer}
              </p>
            </div>
          </div>

          {/* 3 Strategies Presentation Tabs */}
          <div 
            className="scroll-reveal space-y-4"
            style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#112521]">
                  3 ta taqqoslanuvchi reklama strategiyasi
                </h3>
                <p className="text-xs text-[#52796F]">
                  Har bir variant boshqacha psixologik impulsga tayanadi:
                </p>
              </div>

              {/* Tab Selector Buttons */}
              <div className="flex items-center gap-1.5 bg-[#F6F8F7] p-1 rounded-xl border border-[#E0ECE8] self-start sm:self-auto overflow-x-auto max-w-full">
                {result.strategies.map((strat, idx) => (
                  <button
                    key={strat.id}
                    onClick={() => setActiveStrategyTab(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap btn-tactile ${
                      activeStrategyTab === idx
                        ? 'bg-[#112521] text-[#F5B85C] font-semibold shadow-xs'
                        : 'text-[#52796F] hover:text-[#112521]'
                    }`}
                  >
                    Variant #{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Strategy Detail Card */}
            {(() => {
              const currentStrat = result.strategies[activeStrategyTab];
              return (
                <div className="bg-white border-2 border-[#F5B85C]/60 rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E0ECE8] pb-4">
                    <div>
                      <span className="text-[11px] font-bold text-[#173B35] uppercase tracking-wider block mb-0.5">
                        {currentStrat.tagline}
                      </span>
                      <h4 className="text-xl font-extrabold text-[#112521]">
                        {currentStrat.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleCopyStrategy(currentStrat)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-[#112521] hover:text-[#112521] bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] rounded-xl transition-all btn-tactile flex items-center gap-1.5 shadow-xs"
                    >
                      {copiedStrategyId === currentStrat.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#F5B85C]" />
                          <span>Nusxalandi!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#173B35]" />
                          <span>Ushbu matnni nusxalash</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Copy preview box */}
                  <div className="space-y-4">
                    {/* Headline */}
                    <div className="p-3.5 rounded-2xl bg-[#F6F8F7] border border-[#E0ECE8]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#173B35] block mb-1">
                        Sarlavha (Hook / Diqqat tortuvchi qism)
                      </span>
                      <p className="text-sm font-bold text-[#112521]">
                        {currentStrat.hookHeadline}
                      </p>
                    </div>

                    {/* Body */}
                    <div className="p-4 rounded-2xl bg-white border border-[#E0ECE8] space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#173B35] block">
                        Asosiy reklama matni
                      </span>
                      <div className="text-xs sm:text-sm text-[#112521] whitespace-pre-line leading-relaxed font-sans">
                        {currentStrat.bodyText}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="p-3.5 rounded-2xl bg-[#F6F8F7] border border-[#E0ECE8]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#173B35] block mb-1">
                        Harakatga chaqiruv (Call to Action - CTA)
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-[#112521]">
                        {currentStrat.callToAction}
                      </p>
                    </div>
                  </div>

                  {/* Strategic Breakdown: Audience, Strength, Weakness, Testing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-[#F6F8F7] border border-[#E0ECE8] space-y-1.5">
                      <span className="text-xs font-bold text-[#112521] flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-[#F5B85C]" />
                        <span>Tavsiya etilgan auditoriya</span>
                      </span>
                      <p className="text-xs text-[#52796F] leading-relaxed">
                        {currentStrat.recommendedAudience}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F6F8F7] border border-[#E0ECE8] space-y-1.5">
                      <span className="text-xs font-bold text-[#3B6649] flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-[#3B6649]" />
                        <span>Asosiy ustunligi (Kuchli tomoni)</span>
                      </span>
                      <p className="text-xs text-[#52796F] leading-relaxed">
                        {currentStrat.strength}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F6F8F7] border border-[#E0ECE8] space-y-1.5">
                      <span className="text-xs font-bold text-[#A64B3D] flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-[#A64B3D]" />
                        <span>Ehtimoliy zaifligi</span>
                      </span>
                      <p className="text-xs text-[#52796F] leading-relaxed">
                        {currentStrat.potentialWeakness}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F6F8F7] border border-[#E0ECE8] space-y-1.5">
                      <span className="text-xs font-bold text-[#173B35] flex items-center gap-1.5">
                        <FlaskConical className="w-4 h-4 text-[#F5B85C]" />
                        <span>Sinash bo'yicha amaliy tavsiya</span>
                      </span>
                      <p className="text-xs text-[#52796F] leading-relaxed">
                        {currentStrat.testingAdvice}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Metrics Comparison Matrix */}
          <div 
            className="scroll-reveal bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card space-y-6"
            style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#173B35]" />
              <h3 className="text-lg font-bold text-[#112521]">
                Natijalarni solishtirish jadvali va kuzatiladigan ko'rsatkichlar
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E0ECE8] bg-[#F6F8F7]">
                    <th className="p-3.5 font-bold text-[#112521] min-w-[140px]">Ko'rsatkich</th>
                    <th className="p-3.5 font-bold text-[#112521] min-w-[150px]">1-Taklif varianti</th>
                    <th className="p-3.5 font-bold text-[#112521] min-w-[150px]">2-Muammo-yechim</th>
                    <th className="p-3.5 font-bold text-[#112521] min-w-[150px]">3-Ijtimoiy isbot</th>
                    <th className="p-3.5 font-bold text-[#173B35] min-w-[180px]">Baholash tavsiyasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0ECE8]">
                  {result.metricsComparison.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F6F8F7]/50 transition-colors">
                      <td className="p-3.5 align-top">
                        <span className="font-bold text-[#112521] block">{row.metric}</span>
                        <span className="text-[10px] text-[#52796F] block mt-0.5">{row.description}</span>
                      </td>
                      <td className="p-3.5 align-top text-[#52796F]">{row.strategy1Focus}</td>
                      <td className="p-3.5 align-top text-[#52796F]">{row.strategy2Focus}</td>
                      <td className="p-3.5 align-top text-[#52796F]">{row.strategy3Focus}</td>
                      <td className="p-3.5 align-top bg-[#F6F8F7]/40 text-[#112521] font-medium border-l border-[#E0ECE8]">
                        {row.evaluationTip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Practical Budget & Testing Framework */}
          <div 
            className="scroll-reveal bg-[#F6F8F7] border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 space-y-4"
            style={{ '--reveal-delay': '160ms' } as React.CSSProperties}
          >
            <h4 className="text-base font-bold text-[#112521] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#F5B85C]" />
              <span>Budjetni taqsimlash va test o'tkazish qoidasi</span>
            </h4>
            <div className="text-xs sm:text-sm text-[#52796F] whitespace-pre-line leading-relaxed">
              {result.budgetTestingRecommendation}
            </div>

            <div className="pt-4 border-t border-[#E0ECE8] flex flex-wrap items-center justify-between gap-3 text-xs text-[#52796F]">
              <span className="flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-[#F5B85C]" />
                <span>Natija mahalliy xotirada saqlandi</span>
              </span>
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-semibold text-[#173B35] hover:text-[#112521] flex items-center gap-1"
              >
                <span>Yangi test yaratish</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
