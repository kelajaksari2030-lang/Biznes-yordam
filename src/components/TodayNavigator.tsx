import React, { useState, useEffect } from 'react';
import {
  Compass,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  AlertTriangle,
  Flame,
  ArrowRight,
  Copy,
  RotateCcw,
  Calendar,
  Layers,
  HelpCircle,
  ShieldCheck,
  Check,
  Zap,
  Target,
  Gift
} from 'lucide-react';
import { TodayNavigatorInput, TodayNavigatorPlan, TodayTaskStep, AvailableTimeOption } from '../types';
import { generateTodayPlan } from '../services/todayNavigatorService';

const PRESETS = [
  {
    label: "⚡ Savdo to'xtab qoldi (Tezkor mijoz)",
    businessType: "Kiyim va aksessuarlar do'koni",
    mainProblem: "Bugun deyarli hech kim kirmadi, kassa bo'sh, mijozlar kam",
    todayGoal: "Kamida 2 ta real xaridorni jalb qilish va 1 ta buyurtma yopish",
    availableTime: '1h' as AvailableTimeOption,
    budget: "0 so'm (bepul usul)",
    clientStatus: "Avval qiziqqan 10 ga yaqin mijoz Telegram kontaktlarida bor",
  },
  {
    label: "⏳ Vaqtim juda kam (30 daqiqa)",
    businessType: "Onlayn xizmat / Konsultatsiya",
    mainProblem: "Boshqa ishlar ko'p, bugun faqat 30 daqiqa vaqt ajrata olaman",
    todayGoal: "Vaqtni behuda sarflamasdan eng tez samara beradigan 1 ta ishni qilish",
    availableTime: '30m' as AvailableTimeOption,
    budget: "",
    clientStatus: "Oxirgi haftada 3 ta mijoz narx so'ragan",
  },
  {
    label: "👥 Eski mijozlarni uyg'otish",
    businessType: "Go'zallik saloni / Xizmat ko'rsatish",
    mainProblem: "Yangi mijozlar qimmatga tushyapti, eski mijozlar qaytib yozmayapti",
    todayGoal: "Avval kelgan 5 ta doimiy mijozni qayta yozdirish",
    availableTime: '2h' as AvailableTimeOption,
    budget: "0",
    clientStatus: "Avvalgi oyda kelgan 20 ta mijoz ro'yxati mavjud",
  },
  {
    label: "📦 Qolib ketgan tovarlarni sotish",
    businessType: "Chakana savdo / Do'kon",
    mainProblem: "Mavsumiy tovarlar qolib ketdi, aylanma pul muzlab turibdi",
    todayGoal: "Ombordagi qolgan 3-5 ta tovarni flesh-taklif bilan sotish",
    availableTime: '2h' as AvailableTimeOption,
    budget: "50 000 so'm",
    clientStatus: "Stories va guruhlarda 300 ga yaqin obunachi bor",
  },
];

const TIME_OPTIONS: { id: AvailableTimeOption; label: string; desc: string }[] = [
  { id: '30m', label: '30 daqiqa', desc: 'Tezkor ekspress reja' },
  { id: '1h', label: '1 soat', desc: 'Fokusli amaliy qadamlar' },
  { id: '2h', label: '2 soat', desc: 'Chuqur mijozlar bilan ishlash' },
  { id: '4h+', label: '4+ soat', desc: 'To\'liq kunlik sotuv bloki' },
];

export const TodayNavigator: React.FC = () => {
  const [formData, setFormData] = useState<TodayNavigatorInput>({
    businessType: "Kiyim va poyabzal do'koni",
    mainProblem: "Bugun savdo sust, mijozlar deyarli yo'q",
    todayGoal: "Kamida 2 ta xaridorni jalb qilib buyurtma olish",
    availableTime: '1h',
    budget: '',
    clientStatus: '',
  });

  const [loading, setLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<TodayNavigatorPlan | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedStepId, setCopiedStepId] = useState<string | null>(null);

  // Load existing plan from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('biznes_today_navigator_plan');
      if (stored) {
        const parsed = JSON.parse(stored) as TodayNavigatorPlan;
        setActivePlan(parsed);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save changes to active plan (e.g. checkbox state)
  const updatePlanInStorage = (updatedPlan: TodayNavigatorPlan) => {
    setActivePlan(updatedPlan);
    try {
      localStorage.setItem('biznes_today_navigator_plan', JSON.stringify(updatedPlan));
    } catch {
      // Ignore storage errors
    }
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setFormData({
      businessType: preset.businessType,
      mainProblem: preset.mainProblem,
      todayGoal: preset.todayGoal,
      availableTime: preset.availableTime,
      budget: preset.budget,
      clientStatus: preset.clientStatus,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessType.trim() || !formData.mainProblem.trim() || !formData.todayGoal.trim()) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const plan = generateTodayPlan(formData);
      updatePlanInStorage(plan);
      setLoading(false);
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }, 400);
  };

  // Toggle step completion status
  const handleToggleStep = (stepId: string) => {
    if (!activePlan) return;
    const updatedSteps = activePlan.actionSteps.map((step) => {
      if (step.id === stepId) {
        return { ...step, completed: !step.completed };
      }
      return step;
    });

    const updatedPlan: TodayNavigatorPlan = {
      ...activePlan,
      actionSteps: updatedSteps,
    };
    updatePlanInStorage(updatedPlan);
  };

  // Reset plan for a new day
  const handleResetForNewDay = () => {
    if (window.confirm("Yangi kun uchun rejalashtirishni xohlaysizmi? Oldingi reja yangilanadi.")) {
      try {
        localStorage.removeItem('biznes_today_navigator_plan');
      } catch {
        // Ignore
      }
      setActivePlan(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Copy full plan to clipboard for Telegram/Notes
  const handleCopyFullPlan = () => {
    if (!activePlan) return;

    const completedCount = activePlan.actionSteps.filter((s) => s.completed).length;
    const totalCount = activePlan.actionSteps.length;

    const text = `🎯 BIZNES NAVIGATOR — BUGUNGI REJA (${activePlan.dateFormatted})
Biznes: ${activePlan.input.businessType}
Bosh maqsad: ${activePlan.input.todayGoal}
Mavjud vaqt: ${activePlan.input.availableTime}

⭐ 1. BUGUNGI ENG MUHIM VAZIFA (FOKUS):
${activePlan.singleMostImportantTask.title}
Sababi: ${activePlan.singleMostImportantTask.rationale}
Kutiladigan natija: ${activePlan.singleMostImportantTask.expectedResult}

📋 2. KUNDALIK AMALIY QADAMLAR (${completedCount}/${totalCount} bajarildi):
${activePlan.actionSteps
  .map(
    (s) =>
      `${s.completed ? '✅' : '⬜'} ${s.order}-qadam (${s.estimatedMinutes} daqiqa): ${s.title}\n   ${s.description}`
  )
  .join('\n\n')}

💡 3. BEPUL MIJOZ TOPISH USULI (0 SO'M):
${activePlan.zeroCostCustomerAcquisitionTactic.title}
Kanal: ${activePlan.zeroCostCustomerAcquisitionTactic.channel}
Qadamlar:
${activePlan.zeroCostCustomerAcquisitionTactic.stepByStep.map((st) => `• ${st}`).join('\n')}

⛔ 4. BUGUN QILMASLIK KERAK BO'LGAN ISH (ANTI-CHALG'ISH):
${activePlan.antiDistractionRule.whatToAvoid}
Nega vaqt o'g'irlaydi: ${activePlan.antiDistractionRule.whyItWastesTime}
Foydali alternativa: ${activePlan.antiDistractionRule.practicalAlternative}

⏱️ 5. SHOSHILINCH 30 DAQIQALIK EKSPRESS REJA:
${activePlan.expressThirtyMinPlan.steps.map((st) => `[${st.minuteMark}] ${st.action}`).join('\n')}

📊 6. KUN OXIRIDA NATIJANI O'LCHASH:
${activePlan.endOfDaySuccessMetrics.targetMetric}
Tekshiruv savoli: ${activePlan.endOfDaySuccessMetrics.verificationQuestion}

— BESTO Navigator`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleCopySingleStep = (step: TodayTaskStep) => {
    const text = `${step.title} (${step.estimatedMinutes} daqiqa):\n${step.description}`;
    navigator.clipboard.writeText(text);
    setCopiedStepId(step.id);
    setTimeout(() => setCopiedStepId(null), 1800);
  };

  const completedStepsCount = activePlan ? activePlan.actionSteps.filter((s) => s.completed).length : 0;
  const totalStepsCount = activePlan ? activePlan.actionSteps.length : 0;
  const progressPercent = totalStepsCount > 0 ? Math.round((completedStepsCount / totalStepsCount) * 100) : 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header section with warm luxury styling */}
      <div 
        className="scroll-reveal bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card"
        style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#112521] border border-[#173B35] text-[#F5B85C] flex items-center justify-center font-bold shadow-xs">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#112521] tracking-tight">
                  "Bugun nima qilay?" biznes navigatori
                </h1>
                <span className="bg-[#F6F8F7] text-[#173B35] border border-[#F5B85C]/60 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#F5B85C]" />
                  <span>3-modul</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#52796F] mt-1">
                Ortiqcha chalg'ishlarsiz, aynan bugun eng ko'p natija beradigan vazifalar va bepul mijoz jalb qilish harakatlar rejasi.
              </p>
            </div>
          </div>

          {activePlan && (
            <button
              onClick={handleResetForNewDay}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#173B35] bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] rounded-xl transition-all btn-tactile shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#F5B85C]" />
              <span>Yangi kun uchun rejalashtirish</span>
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="mt-6 pt-6 border-t border-[#E0ECE8]">
          <span className="text-xs font-semibold text-[#173B35] block mb-2.5">
            Tezkor tayyor holatlar (bosing):
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="text-xs font-medium px-3 py-1.5 rounded-xl bg-[#F6F8F7] hover:bg-[#F5EDE1] text-[#112521] border border-[#E0ECE8] hover:border-[#F5B85C] transition-colors btn-tactile text-left"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Form */}
      <form 
        onSubmit={handleSubmit} 
        className="scroll-reveal bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card space-y-6"
        style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
      >
        <h2 className="text-base sm:text-lg font-bold text-[#112521] flex items-center gap-2">
          <Target className="w-5 h-5 text-[#F5B85C]" />
          <span>Bugungi holatingizni kiriting</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Business Type */}
          <div>
            <label className="block text-xs font-bold text-[#112521] mb-1.5">
              Biznesingiz turi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.businessType}
              onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
              placeholder="Masalan: Kiyim do'koni, Kafe, Onlayn do'kon, Xizmatlar..."
              className="w-full px-3.5 py-2.5 text-sm bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5B85C] text-[#112521]"
            />
          </div>

          {/* Today's Goal */}
          <div>
            <label className="block text-xs font-bold text-[#112521] mb-1.5">
              Bugungi asosiy maqsad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.todayGoal}
              onChange={(e) => setFormData({ ...formData, todayGoal: e.target.value })}
              placeholder="Masalan: Kamida 2 ta sotuv qilish, eski mijozlarni uyg'otish..."
              className="w-full px-3.5 py-2.5 text-sm bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5B85C] text-[#112521]"
            />
          </div>
        </div>

        {/* Main Problem */}
        <div>
          <label className="block text-xs font-bold text-[#112521] mb-1.5">
            Hozirgi asosiy to'siq yoki muammo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.mainProblem}
            onChange={(e) => setFormData({ ...formData, mainProblem: e.target.value })}
            placeholder="Masalan: Kassa bo'sh, mijoz yozmayapti, narx so'rab yo'qolib qolgan, tovar qolib ketgan..."
            className="w-full px-3.5 py-2.5 text-sm bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5B85C] text-[#112521]"
          />
        </div>

        {/* Available Time Selector */}
        <div>
          <label className="block text-xs font-bold text-[#112521] mb-2">
            Bugun ushbu vazifalarga ajrata oladigan vaqtingiz <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFormData({ ...formData, availableTime: opt.id })}
                className={`p-3 rounded-2xl border text-left transition-all btn-tactile ${
                  formData.availableTime === opt.id
                    ? 'bg-[#F6F8F7] border-[#F5B85C] ring-2 ring-[#F5B85C]/40'
                    : 'bg-white border-[#E0ECE8] hover:border-[#F5B85C]/60'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${formData.availableTime === opt.id ? 'text-[#F5B85C]' : 'text-[#52796F]'}`} />
                  <span className="text-xs font-bold text-[#112521]">{opt.label}</span>
                </div>
                <span className="text-[10px] text-[#52796F] block mt-1 leading-tight">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Fields: Budget and Clients Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-[#E0ECE8]">
          <div>
            <label className="block text-xs font-bold text-[#112521] mb-1">
              Mavjud reklama budjeti <span className="text-xs font-normal text-[#52796F]">(Ixtiyoriy)</span>
            </label>
            <input
              type="text"
              value={formData.budget || ''}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="Masalan: 0 so'm (bepul usul) yoki 50,000 so'm"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5B85C] text-[#112521]"
            />
            <span className="text-[11px] text-[#52796F] mt-1 block">
              Agar budjet ko'rsatmasangiz, faqat mutlaqo bepul (0 so'm) usullar tavsiya qilinadi.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#112521] mb-1">
              Mijozlar yoki so'rovlar holati <span className="text-xs font-normal text-[#52796F]">(Ixtiyoriy)</span>
            </label>
            <input
              type="text"
              value={formData.clientStatus || ''}
              onChange={(e) => setFormData({ ...formData, clientStatus: e.target.value })}
              placeholder="Masalan: 5 ta odam narx so'ragan, yoki umuman so'rov yo'q"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5B85C] text-[#112521]"
            />
            <span className="text-[11px] text-[#52796F] mt-1 block">
              Hozirgi muloqotdagi mijozlar soni yoki ularning javobi.
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-[#112521] bg-[#F5B85C] hover:bg-[#C39F60] border border-[#F5B85C]/50 rounded-xl transition-all btn-tactile shadow-xs flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C] disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#112521] border-t-transparent rounded-full animate-spin" />
                <span>Bugungi harakatlar rejasi hisoblanmoqda...</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4 text-[#112521]" />
                <span>Bugungi aniq harakatlar rejasini tuzish</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* PLAN OUTPUT DISPLAY */}
      {activePlan && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Action Banner */}
          <div 
            className="scroll-reveal bg-[#112521] text-white rounded-3xl p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{ '--reveal-delay': '40ms' } as React.CSSProperties}
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F5B85C]">
                <Calendar className="w-3.5 h-3.5" />
                <span>{activePlan.dateFormatted}</span>
                <span>•</span>
                <span>Vaqt: {activePlan.input.availableTime}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1 text-[#F6F8F7]">
                Bugungi amaliy ishlar rejasi
              </h2>
              <p className="text-xs text-[#E0ECE8] mt-1">
                Biznes: {activePlan.input.businessType} | Maqsad: {activePlan.input.todayGoal}
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleCopyFullPlan}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-[#F6F8F7] hover:bg-[#E0ECE8] text-[#112521] rounded-xl transition-all btn-tactile shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Nusxalandi!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#173B35]" />
                    <span>Rejani to'liq nusxalash</span>
                  </>
                )}
              </button>

              <button
                onClick={handleResetForNewDay}
                className="p-2.5 text-[#F5B85C] hover:text-white bg-[#173B35]/70 hover:bg-[#173B35] border border-[#F5B85C]/40 rounded-xl transition-all btn-tactile"
                title="Qayta boshlash"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Assumption / Transparency Note */}
          {activePlan.inferredAssumptionsNote && (
            <div 
              className="scroll-reveal bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl p-4 text-xs text-[#52796F] flex items-start gap-2.5"
              style={{ '--reveal-delay': '60ms' } as React.CSSProperties}
            >
              <ShieldCheck className="w-4 h-4 text-[#F5B85C] shrink-0 mt-0.5" />
              <p className="leading-relaxed">{activePlan.inferredAssumptionsNote}</p>
            </div>
          )}

          {/* 1. SINGLE MOST IMPORTANT TASK (FOKUS) */}
          <div 
            className="scroll-reveal bg-white border-2 border-[#F5B85C] rounded-3xl p-6 sm:p-8 shadow-card relative overflow-hidden"
            style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#173B35] mb-2">
              <Flame className="w-4 h-4 text-amber-600" />
              <span>1. Bugun bajariladigan eng muhim bitta vazifa (Asosiy Fokus)</span>
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-[#112521] leading-snug">
              {activePlan.singleMostImportantTask.title}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#E0ECE8] text-xs">
              <div className="bg-[#F6F8F7] p-3.5 rounded-xl border border-[#E0ECE8]">
                <span className="font-bold text-[#112521] block mb-1">💡 Nega aynan shu vazifa birinchi o'rinda?</span>
                <p className="text-[#52796F] leading-relaxed">{activePlan.singleMostImportantTask.rationale}</p>
              </div>

              <div className="bg-[#F6F8F7] p-3.5 rounded-xl border border-[#E0ECE8]">
                <span className="font-bold text-[#112521] block mb-1">🎯 Kutiladigan aniq natija:</span>
                <p className="text-[#52796F] leading-relaxed">{activePlan.singleMostImportantTask.expectedResult}</p>
              </div>
            </div>
          </div>

          {/* 2. INTERACTIVE CHECKLIST (3-5 SPECIFIC STEPS WITH MINUTES) */}
          <div 
            className="scroll-reveal bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card space-y-6"
            style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#F5B85C]" />
                  <h3 className="text-base sm:text-lg font-bold text-[#112521]">
                    2. Bugungi amaliy qadamlar ro'yxati (Bajarilganini belgilang)
                  </h3>
                </div>
                <p className="text-xs text-[#52796F] mt-0.5">
                  Har bir qadam uchun hisoblangan taxminiy vaqt ajratilgan. Bajarilgan qadamni bosib belgilang.
                </p>
              </div>

              {/* Progress counter */}
              <div className="bg-[#F6F8F7] border border-[#E0ECE8] px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#112521] shrink-0 flex items-center gap-2">
                <span>Bajarildi: {completedStepsCount} / {totalStepsCount}</span>
                <span className="text-[#F5B85C] font-bold">({progressPercent}%)</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#E0ECE8] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Checklist items */}
            <div className="space-y-3.5">
              {activePlan.actionSteps.map((step) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    step.completed
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : 'bg-[#F6F8F7]/70 border-[#E0ECE8] hover:border-[#F5B85C]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleStep(step.id)}
                      className="flex items-start gap-3 text-left group flex-1 focus-visible:outline-none"
                    >
                      <div className="mt-0.5 shrink-0">
                        {step.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-[#52796F] group-hover:text-[#112521] transition-colors" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-bold ${
                              step.completed ? 'line-through text-[#52796F]' : 'text-[#112521]'
                            }`}
                          >
                            {step.order}-qadam: {step.title}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-[#E0ECE8] text-[#173B35]">
                            <Clock className="w-3 h-3 text-[#F5B85C]" />
                            <span>{step.estimatedMinutes} daqiqa</span>
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-1.5 leading-relaxed ${
                            step.completed ? 'text-[#52796F]' : 'text-[#52796F]'
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleCopySingleStep(step)}
                      className="p-1.5 text-[#52796F] hover:text-[#112521] bg-white border border-[#E0ECE8] rounded-lg text-xs transition-colors shrink-0"
                      title="Qadam matnini nusxalash"
                    >
                      {copiedStepId === step.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {completedStepsCount === totalStepsCount && totalStepsCount > 0 && (
              <div className="bg-emerald-100/70 border border-emerald-300 rounded-2xl p-4 text-center space-y-1">
                <span className="text-base font-extrabold text-emerald-900 block">
                  🎉 Tabriklaymiz! Bugungi barcha qadamlar bajarildi!
                </span>
                <p className="text-xs text-emerald-800">
                  Kunning asosiy sotuv vazifalarini yakunladingiz. Kassa tushumi va mijozlar natijasini tekshirib oling.
                </p>
              </div>
            )}
          </div>

          {/* 3. ZERO-COST CUSTOMER ACQUISITION TACTIC */}
          <div 
            className="scroll-reveal bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card space-y-4"
            style={{ '--reveal-delay': '160ms' } as React.CSSProperties}
          >
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#112521]">
                  3. Bepul yoki kam xarajatli mijoz topish usuli
                </h3>
                <span className="text-xs text-[#52796F]">
                  Kanal: {activePlan.zeroCostCustomerAcquisitionTactic.channel}
                </span>
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <h4 className="text-sm font-bold text-emerald-950">
                {activePlan.zeroCostCustomerAcquisitionTactic.title}
              </h4>
              <ul className="space-y-2 text-xs text-emerald-900 leading-relaxed">
                {activePlan.zeroCostCustomerAcquisitionTactic.stepByStep.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-emerald-700 shrink-0">✓</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-emerald-200/60 text-[11px] font-medium text-emerald-800">
                {activePlan.zeroCostCustomerAcquisitionTactic.costNote}
              </div>
            </div>
          </div>

          {/* 4. ANTI-DISTRACTION RULE (WHAT NOT TO DO TODAY) */}
          <div 
            className="scroll-reveal bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card space-y-4"
            style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#112521]">
                  4. Bugun qilmaslik kerak bo'lgan ish (Vaqt o'g'rilari)
                </h3>
                <span className="text-xs text-[#52796F]">
                  O'zingizni band qilib ko'rsatadigan, lekin pul keltirmaydigan mayda ishlarni to'xtating.
                </span>
              </div>
            </div>

            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <div>
                <span className="text-xs font-bold text-amber-900 block">⛔ Nima qilmaslik kerak:</span>
                <p className="text-xs font-semibold text-[#112521] mt-0.5">
                  {activePlan.antiDistractionRule.whatToAvoid}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-amber-900 block">⚠️ Nega bu vaqtni behuda sarflaydi:</span>
                <p className="text-xs text-[#52796F] mt-0.5 leading-relaxed">
                  {activePlan.antiDistractionRule.whyItWastesTime}
                </p>
              </div>

              <div className="pt-2 border-t border-amber-200/60">
                <span className="text-xs font-bold text-emerald-800 block">✅ Buning o'rniga nima qilish kerak:</span>
                <p className="text-xs text-[#112521] font-medium mt-0.5 leading-relaxed">
                  {activePlan.antiDistractionRule.practicalAlternative}
                </p>
              </div>
            </div>
          </div>

          {/* 5. EMERGENCY 30-MINUTE EXPRESS PLAN */}
          <div className="bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#112521]">
                  5. Vaqt juda kam bo'lganda: 30 daqiqalik ekspress reja
                </h3>
                <span className="text-xs text-[#52796F]">
                  Kutilmagan holat yuz berganda ushbu qisqa blokdan foydalaning.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activePlan.expressThirtyMinPlan.steps.map((block, idx) => (
                <div key={idx} className="bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl p-4 space-y-1.5">
                  <span className="text-[11px] font-bold text-[#F5B85C] uppercase tracking-wide block">
                    ⏱️ {block.minuteMark}
                  </span>
                  <p className="text-xs text-[#112521] leading-relaxed font-medium">
                    {block.action}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 6. END OF DAY SUCCESS METRICS */}
          <div className="bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#F5B85C]" />
              <h3 className="text-base sm:text-lg font-bold text-[#112521]">
                6. Kun oxirida natijani qanday o'lchash kerak
              </h3>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8]">
                <span className="font-bold text-[#112521] block mb-1">🎯 Aniq mezon:</span>
                <p className="text-[#52796F]">{activePlan.endOfDaySuccessMetrics.targetMetric}</p>
              </div>

              <div className="p-3.5 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8]">
                <span className="font-bold text-[#112521] block mb-1">❓ Kun yakunida o'zingizga beradigan savol:</span>
                <p className="text-[#52796F]">{activePlan.endOfDaySuccessMetrics.verificationQuestion}</p>
              </div>

              <div className="p-3.5 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8]">
                <span className="font-bold text-[#112521] block mb-1">🛡️ Reja to'liq bajarilmagandagi tahlil:</span>
                <p className="text-[#52796F]">{activePlan.endOfDaySuccessMetrics.fallbackAssessment}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
