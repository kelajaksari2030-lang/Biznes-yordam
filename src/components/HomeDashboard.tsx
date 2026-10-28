import React from 'react';
import { 
  FileText, 
  Calculator, 
  MessageSquare, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  Clock, 
  Layers,
  Sparkles,
  FlaskConical,
  Compass,
  Package,
  Share2,
  Megaphone,
  Tag,
  Coins,
  CheckCheck,
  Flame,
  LineChart,
  Users,
  ShoppingBag
} from 'lucide-react';
import { ToolType } from '../types';

interface HomeDashboardProps {
  setActiveTab: (tab: ToolType) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ setActiveTab }) => {
  // Read saved counts from localStorage
  const savedDraftsCount = (() => {
    try {
      const data = localStorage.getItem('biznes_saved_drafts');
      return data ? JSON.parse(data).length : 0;
    } catch {
      return 0;
    }
  })();

  const savedCalcsCount = (() => {
    try {
      const data = localStorage.getItem('biznes_saved_calculations');
      return data ? JSON.parse(data).length : 0;
    } catch {
      return 0;
    }
  })();

  const savedDiagnosticsCount = (() => {
    try {
      const data = localStorage.getItem('biznes_saved_diagnostics');
      return data ? JSON.parse(data).length : 0;
    } catch {
      return 0;
    }
  })();

  const savedLabTestsCount = (() => {
    try {
      const data = localStorage.getItem('biznes_saved_ad_lab_tests');
      return data ? JSON.parse(data).length : 0;
    } catch {
      return 0;
    }
  })();

  const savedCustomersCount = (() => {
    try {
      const data = localStorage.getItem('biznes_crm_cache');
      return data ? JSON.parse(data).length : 0;
    } catch {
      return 0;
    }
  })();

  const savedProductsCount = (() => {
    try {
      const data = localStorage.getItem('biznes_inventory_cache');
      return data ? JSON.parse(data).length : 0;
    } catch {
      return 0;
    }
  })();

  const savedOrdersCount = (() => {
    try {
      const data = localStorage.getItem('biznes_orders_cache');
      return data ? JSON.parse(data).length : 0;
    } catch {
      return 0;
    }
  })();

  const hasActiveTodayPlan = (() => {
    try {
      return Boolean(localStorage.getItem('biznes_today_navigator_plan'));
    } catch {
      return false;
    }
  })();

  const handleOpenProductDesc = () => {
    try {
      sessionStorage.setItem('ad_generator_preset', 'product_desc');
    } catch {
      // Ignore
    }
    setActiveTab('ad-generator');
  };

  const handleOpenSocialPosts = () => {
    try {
      sessionStorage.setItem('ad_generator_preset', 'social_post');
    } catch {
      // Ignore
    }
    setActiveTab('ad-generator');
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-10">
      {/* Hero Section - Warm luxury presentation */}
      <section className="bg-white border border-[#E6DCD1] rounded-3xl overflow-hidden shadow-card">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Text Column */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#795640]">
                <span className="w-2 h-2 rounded-full bg-[#D0AE70]"></span>
                <span>O'zbekistondagi tadbirkorlar va kichik bizneslar uchun</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#493329] leading-[1.16] text-balance">
                Savdo va boshqaruvni professional darajaga olib chiqing
              </h1>

              <p className="text-base sm:text-lg text-[#6B5549] leading-relaxed max-w-xl">
                Reklama yaratish, strategiyalarni A/B sinash, foydani aniq hisoblash, mijozlar bilan tezkor muloqot va kunlik biznes harakatlar rejasi — barchasi bitta qulay platformada.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab('today-navigator')}
                className="px-5 py-3 text-sm font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl transition-all btn-tactile shadow-xs flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
              >
                <Compass className="w-4 h-4 text-[#34221A]" />
                <span>Bugun nima qilay?</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>

              <button
                onClick={() => setActiveTab('ad-lab')}
                className="px-5 py-3 text-sm font-semibold text-[#493329] hover:text-[#34221A] bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#E6DCD1] rounded-xl transition-all btn-tactile shadow-xs flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
              >
                <FlaskConical className="w-4 h-4 text-[#D0AE70]" />
                <span>Reklama Lab</span>
              </button>

              <button
                onClick={() => setActiveTab('business-diagnostics')}
                className="px-5 py-3 text-sm font-semibold text-[#493329] hover:text-[#34221A] bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#E6DCD1] rounded-xl transition-all btn-tactile shadow-xs flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
              >
                <Sparkles className="w-4 h-4 text-[#D0AE70]" />
                <span>AI Diagnostika</span>
              </button>

              <button
                onClick={() => setActiveTab('profit-calculator')}
                className="px-5 py-3 text-sm font-semibold text-[#493329] hover:text-[#34221A] bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#E6DCD1] rounded-xl transition-all btn-tactile shadow-xs flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
              >
                <Calculator className="w-4 h-4 text-[#795640]" />
                <span>Foydani hisoblash</span>
              </button>
            </div>

            {/* Practical trust markers */}
            <div className="pt-6 border-t border-[#EFE8DE] flex flex-wrap items-center gap-6 text-xs text-[#6B5549]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D0AE70] shrink-0" />
                <span>O'zbekiston bozoriga mos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D0AE70] shrink-0" />
                <span>Xavfsiz Firebase bulut saqlash</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D0AE70] shrink-0" />
                <span>Telegram & Instagram integratsiyasi</span>
              </div>
            </div>
          </div>

          {/* Right Hero Image Column */}
          <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full bg-[#FAF6F0] border-t lg:border-t-0 lg:border-l border-[#E6DCD1]">
            <img
              src="/src/assets/images/small_biz_hero_1792843780008.jpg"
              alt="BESTO ish jarayoni"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:hidden" />
          </div>
        </div>
      </section>

      {/* 8 Main Visual Cards Grid Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#493329]">
              Xizmatlar va funksiyalar katalogi
            </h2>
            <p className="text-sm text-[#6B5549] mt-1">
              Savdo, marketing, moliya va boshqaruv uchun 8 ta professional vosita:
            </p>
          </div>
          <span className="text-xs font-semibold text-[#795640] bg-[#FAF6F0] px-3.5 py-1.5 rounded-xl border border-[#E6DCD1] w-fit">
            8 ta to'liq modul
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: “Bugun nima qilay?” */}
          <div className="bg-white border-2 border-[#D0AE70]/80 hover:border-[#D0AE70] rounded-2xl shadow-card card-elevation flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:-translate-y-1">
            <div>
              {/* Visual Header */}
              <div className="h-36 bg-gradient-to-br from-[#493329] via-[#5D4235] to-[#34221A] p-4 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D0AE70] bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                    Kunlik boshqaruv
                  </span>
                  <span className="bg-[#D0AE70] text-[#34221A] text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    <span>Yangi</span>
                  </span>
                </div>
                {/* Visual Graphic Mockup */}
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF6F0]/15 border border-[#D0AE70]/40 flex items-center justify-center text-[#D0AE70]">
                      <Compass className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#FAF6F0] truncate">Bugungi 1 ta fokus</span>
                  </div>
                  <div className="text-[11px] text-[#E6DCD1] bg-black/20 p-1.5 rounded border border-white/10 flex items-center justify-between">
                    <span>⏱️ 30m ekspress reja</span>
                    <span className="text-[#D0AE70] font-bold">0 so'm</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#493329] group-hover:text-[#795640] transition-colors leading-snug">
                  “Bugun nima qilay?” navigatori
                </h3>
                <p className="text-xs text-[#6B5549] leading-relaxed line-clamp-3">
                  Tadbirkorga bugun kassa tushumini keltiradigan eng muhim 1 ta vazifa, daqiqali cheklist va 0 so'mlik bepul mijoz jalb qilish usuli.
                </p>
                <div className="space-y-1 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Interaktiv bajarildi/bajarilmadi cheklisti</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Anti-chalg'ish qoidasi (Vaqt o'g'rilari)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-[#EFE8DE]/60 pt-4">
              <span className="text-[11px] text-[#8D786D]">
                {hasActiveTodayPlan ? "Faol reja bor" : "Kunlik fokus"}
              </span>
              <button
                onClick={() => setActiveTab('today-navigator')}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl transition-all btn-tactile shadow-2xs flex items-center gap-1.5"
              >
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Reklama laboratoriyasi */}
          <div className="bg-white border-2 border-[#D0AE70]/80 hover:border-[#D0AE70] rounded-2xl shadow-card card-elevation flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:-translate-y-1">
            <div>
              {/* Visual Header */}
              <div className="h-36 bg-gradient-to-br from-[#5A4032] via-[#6E4F3E] to-[#493329] p-4 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D0AE70] bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                    A/B Sinov & Laboratoriya
                  </span>
                  <span className="bg-[#D0AE70] text-[#34221A] text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                    <FlaskConical className="w-3 h-3" />
                    <span>Yangi</span>
                  </span>
                </div>
                {/* Visual Graphic Mockup */}
                <div className="space-y-1.5 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF6F0]/15 border border-[#D0AE70]/40 flex items-center justify-center text-[#D0AE70]">
                      <FlaskConical className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#FAF6F0] truncate">3 xil reklama burchagi</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-center text-[#E6DCD1]">
                    <div className="bg-white/10 rounded py-0.5">A: Taklif</div>
                    <div className="bg-white/10 rounded py-0.5">B: Muammo</div>
                    <div className="bg-white/10 rounded py-0.5">C: Isbot</div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#493329] group-hover:text-[#795640] transition-colors leading-snug">
                  Reklama laboratoriyasi
                </h3>
                <p className="text-xs text-[#6B5549] leading-relaxed line-clamp-3">
                  Bir mahsulot uchun 3 ta farqli reklama strategiyasini yarating, auditoriya va sarlavhalarni solishtiring hamda byudjetni tejab sinang.
                </p>
                <div className="space-y-1 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>CTR, murojaat va konversiya matritsasi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Soxta raqamlarsiz real gipotezalar</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-[#EFE8DE]/60 pt-4">
              <span className="text-[11px] text-[#8D786D]">
                {savedLabTestsCount > 0 ? `${savedLabTestsCount} ta sinov` : "Taqqoslovchi test"}
              </span>
              <button
                onClick={() => setActiveTab('ad-lab')}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl transition-all btn-tactile shadow-2xs flex items-center gap-1.5"
              >
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: AI Biznes Diagnostikasi */}
          <div className="bg-white border border-[#E6DCD1] hover:border-[#D0AE70] rounded-2xl shadow-card card-elevation flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:-translate-y-1">
            <div>
              {/* Visual Header */}
              <div className="h-36 bg-gradient-to-br from-[#3B2920] to-[#553C30] p-4 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D0AE70] bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                    Strategik Tahlil
                  </span>
                  <Sparkles className="w-4 h-4 text-[#D0AE70]" />
                </div>
                {/* Visual Graphic Mockup */}
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF6F0]/15 border border-[#D0AE70]/40 flex items-center justify-center text-[#D0AE70]">
                      <LineChart className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#FAF6F0] truncate">6 bosqichli audit</span>
                  </div>
                  <div className="text-[11px] text-[#E6DCD1] bg-black/20 p-1.5 rounded border border-white/10 flex items-center justify-between">
                    <span>3 xavf · 3 imkoniyat</span>
                    <span className="text-[#D0AE70]">7 kunlik reja</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#493329] group-hover:text-[#795640] transition-colors leading-snug">
                  AI Biznes Diagnostikasi
                </h3>
                <p className="text-xs text-[#6B5549] leading-relaxed line-clamp-3">
                  Biznesingiz muammosini kiritib, eng katta 3 ta xavf, o'sish nuqtalari va keyingi 7 kun uchun amaliy harakatlar rejasini oling.
                </p>
                <div className="space-y-1 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Tushum kiritish ixtiyoriy, maxfiy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>To'g'ridan-to'g'ri amaliy maslahatlar</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-[#EFE8DE]/60 pt-4">
              <span className="text-[11px] text-[#8D786D]">
                {savedDiagnosticsCount > 0 ? `${savedDiagnosticsCount} ta audit` : "Chuqur tahlil"}
              </span>
              <button
                onClick={() => setActiveTab('business-diagnostics')}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#493329] hover:text-[#34221A] bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#E6DCD1] rounded-xl transition-all btn-tactile shadow-2xs flex items-center gap-1.5"
              >
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D0AE70]" />
              </button>
            </div>
          </div>

          {/* Card 4: Reklama matni generatori */}
          <div className="bg-white border border-[#E6DCD1] hover:border-[#D0AE70] rounded-2xl shadow-card card-elevation flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:-translate-y-1">
            <div>
              {/* Visual Header */}
              <div className="h-36 bg-gradient-to-br from-[#73513C] to-[#5B3E2D] p-4 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D0AE70] bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                    Reklama & Kreativ
                  </span>
                  <Megaphone className="w-4 h-4 text-[#D0AE70]" />
                </div>
                {/* Visual Graphic Mockup */}
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF6F0]/15 border border-[#D0AE70]/40 flex items-center justify-center text-[#D0AE70]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#FAF6F0] truncate">Sotuvchi post qoralamasi</span>
                  </div>
                  <div className="text-[11px] text-[#E6DCD1] bg-black/20 p-1.5 rounded border border-white/10 flex items-center justify-between">
                    <span>Telegram & Instagram</span>
                    <span className="text-[#D0AE70]">CTA taklif</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#493329] group-hover:text-[#795640] transition-colors leading-snug">
                  Reklama matni generatori
                </h3>
                <p className="text-xs text-[#6B5549] leading-relaxed line-clamp-3">
                  Mahsulotingiz afzalligi, chegirmasi va aloqa ma'lumotlarini kiritib, mijozni xaridga chorlovchi professional reklama matnini oling.
                </p>
                <div className="space-y-1 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Chegirma va shoshilinch takliflar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Bitta bosishda nusxalash</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-[#EFE8DE]/60 pt-4">
              <span className="text-[11px] text-[#8D786D]">
                {savedDraftsCount > 0 ? `${savedDraftsCount} ta qoralama` : "Tezkor postlar"}
              </span>
              <button
                onClick={() => setActiveTab('ad-generator')}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#493329] hover:text-[#34221A] bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#E6DCD1] rounded-xl transition-all btn-tactile shadow-2xs flex items-center gap-1.5"
              >
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D0AE70]" />
              </button>
            </div>
          </div>

          {/* Card 5: Mahsulot tavsifi */}
          <div className="bg-white border border-[#E6DCD1] hover:border-[#D0AE70] rounded-2xl shadow-card card-elevation flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:-translate-y-1">
            <div>
              {/* Visual Header */}
              <div className="h-36 bg-gradient-to-br from-[#2D4536] to-[#1E3025] p-4 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                    Mahsulot & Sifat
                  </span>
                  <Package className="w-4 h-4 text-emerald-300" />
                </div>
                {/* Visual Graphic Mockup */}
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                      <Tag className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-emerald-100 truncate">Tovar kartochkasi tavsifi</span>
                  </div>
                  <div className="text-[11px] text-emerald-200/90 bg-black/20 p-1.5 rounded border border-emerald-500/20 flex items-center justify-between">
                    <span>Xususiyat · O'lcham · Kafolat</span>
                    <span className="text-emerald-300 font-bold">100% Asl</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#493329] group-hover:text-[#795640] transition-colors leading-snug">
                  Mahsulot tavsifi
                </h3>
                <p className="text-xs text-[#6B5549] leading-relaxed line-clamp-3">
                  Tovarning texnik xususiyatlari, o'lchami, sifati va xaridorga keltiradigan real foydasini ikkilanmasdan o'qiydigan qilib tasvirlang.
                </p>
                <div className="space-y-1 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Do'kon va kataloglar uchun tayyor</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Ishonch uyg'otuvchi sifat kafolati</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-[#EFE8DE]/60 pt-4">
              <span className="text-[11px] text-[#8D786D]">Katalog formati</span>
              <button
                onClick={handleOpenProductDesc}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#493329] hover:text-[#34221A] bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#E6DCD1] rounded-xl transition-all btn-tactile shadow-2xs flex items-center gap-1.5"
              >
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D0AE70]" />
              </button>
            </div>
          </div>

          {/* Card 6: Ijtimoiy tarmoq postlari */}
          <div className="bg-white border border-[#E6DCD1] hover:border-[#D0AE70] rounded-2xl shadow-card card-elevation flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:-translate-y-1">
            <div>
              {/* Visual Header */}
              <div className="h-36 bg-gradient-to-br from-[#533045] to-[#3B1F30] p-4 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300 bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                    SMM & Kontent
                  </span>
                  <Share2 className="w-4 h-4 text-pink-300" />
                </div>
                {/* Visual Graphic Mockup */}
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-300">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-pink-100 truncate">Instagram Reels & Stories</span>
                  </div>
                  <div className="text-[11px] text-pink-200/90 bg-black/20 p-1.5 rounded border border-pink-500/20 flex items-center justify-between">
                    <span>Kanal posti · Qiziqarli kontent</span>
                    <span className="text-pink-300">#trend</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#493329] group-hover:text-[#795640] transition-colors leading-snug">
                  Ijtimoiy tarmoq postlari
                </h3>
                <p className="text-xs text-[#6B5549] leading-relaxed line-clamp-3">
                  Instagram va Telegram kanallaringiz uchun obunachilar layk bosadigan, izoh qoldiradigan va do'stlariga ulashadigan postlar tayyorlang.
                </p>
                <div className="space-y-1 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Auditoriyani qizdiruvchi formatlar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Ijtimoiy isbot va tavsiyalar</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-[#EFE8DE]/60 pt-4">
              <span className="text-[11px] text-[#8D786D]">SMM formati</span>
              <button
                onClick={handleOpenSocialPosts}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#493329] hover:text-[#34221A] bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#E6DCD1] rounded-xl transition-all btn-tactile shadow-2xs flex items-center gap-1.5"
              >
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D0AE70]" />
              </button>
            </div>
          </div>

          {/* Card 7: Foyda kalkulyatori */}
          <div className="bg-white border border-[#E6DCD1] hover:border-[#D0AE70] rounded-2xl shadow-card card-elevation flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:-translate-y-1">
            <div>
              {/* Visual Header */}
              <div className="h-36 bg-gradient-to-br from-[#4A472E] to-[#33311E] p-4 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D0AE70] bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                    Moliya & Hisob
                  </span>
                  <Coins className="w-4 h-4 text-[#D0AE70]" />
                </div>
                {/* Visual Graphic Mockup */}
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF6F0]/15 border border-[#D0AE70]/40 flex items-center justify-center text-[#D0AE70]">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#FAF6F0] truncate">Sof marja & Foyda</span>
                  </div>
                  <div className="text-[11px] text-[#E6DCD1] bg-black/20 p-1.5 rounded border border-white/10 flex items-center justify-between">
                    <span>Tannarx + Xarajatlar</span>
                    <span className="text-[#D0AE70] font-bold">+35% Marja</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#493329] group-hover:text-[#795640] transition-colors leading-snug">
                  Foyda kalkulyatori
                </h3>
                <p className="text-xs text-[#6B5549] leading-relaxed line-clamp-3">
                  Tannarx, sotish narxi, yetkazib berish va doimiy xarajatlarni kiritib, bitta dona mahsulotdan va butun partiyadan sof foydani hisoblang.
                </p>
                <div className="space-y-1 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Zararsizlik (Break-even) nuqtasi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Qurilmangizda saqlanadi</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-[#EFE8DE]/60 pt-4">
              <span className="text-[11px] text-[#8D786D]">
                {savedCalcsCount > 0 ? `${savedCalcsCount} ta hisob` : "Aniq hisob-kitob"}
              </span>
              <button
                onClick={() => setActiveTab('profit-calculator')}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#493329] hover:text-[#34221A] bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#E6DCD1] rounded-xl transition-all btn-tactile shadow-2xs flex items-center gap-1.5"
              >
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D0AE70]" />
              </button>
            </div>
          </div>

          {/* Card 8: Mijozlarga javoblar */}
          <div className="bg-white border border-[#E6DCD1] hover:border-[#D0AE70] rounded-2xl shadow-card card-elevation flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:-translate-y-1">
            <div>
              {/* Visual Header */}
              <div className="h-36 bg-gradient-to-br from-[#5C3D2E] to-[#42291E] p-4 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D0AE70] bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                    Muloqot & Savdo
                  </span>
                  <CheckCheck className="w-4 h-4 text-[#D0AE70]" />
                </div>
                {/* Visual Graphic Mockup */}
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF6F0]/15 border border-[#D0AE70]/40 flex items-center justify-center text-[#D0AE70]">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#FAF6F0] truncate">Tezkor tayyor javoblar</span>
                  </div>
                  <div className="text-[11px] text-[#E6DCD1] bg-black/20 p-1.5 rounded border border-white/10 flex items-center justify-between">
                    <span>Narx? · Yetkazish? · To'lov?</span>
                    <span className="text-[#D0AE70]">1 sekundda</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#493329] group-hover:text-[#795640] transition-colors leading-snug">
                  Mijozlarga javoblar
                </h3>
                <p className="text-xs text-[#6B5549] leading-relaxed line-clamp-3">
                  "Narxi qancha?", yetkazib berish shartlari va karta rekvizitlari bo'yicha mijozlarga muloyim, tezkor va professional tayyor shablonlar.
                </p>
                <div className="space-y-1 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>O'zgaruvchilarni avtomatik to'ldirish</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>O'z shaxsiy shablonlaringizni qo'shish</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-[#EFE8DE]/60 pt-4">
              <span className="text-[11px] text-[#8D786D]">8+ tayyor shablon</span>
              <button
                onClick={() => setActiveTab('reply-templates')}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#493329] hover:text-[#34221A] bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#E6DCD1] rounded-xl transition-all btn-tactile shadow-2xs flex items-center gap-1.5"
              >
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D0AE70]" />
              </button>
            </div>
          </div>

          {/* Card 9: Mijozlar bazasi (CRM) */}
          <div className="bg-white border-2 border-[#D0AE70]/70 hover:border-[#D0AE70] rounded-2xl shadow-card card-elevation flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:-translate-y-1">
            <div>
              {/* Visual Header */}
              <div className="h-36 bg-gradient-to-br from-[#3D2F28] via-[#4F3C34] to-[#2E221C] p-4 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D0AE70] bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                    Mijozlar & CRM
                  </span>
                  <span className="bg-[#D0AE70] text-[#34221A] text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>Yangi</span>
                  </span>
                </div>
                {/* Visual Graphic Mockup */}
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF6F0]/15 border border-[#D0AE70]/40 flex items-center justify-center text-[#D0AE70]">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#FAF6F0] truncate">Mijozlar bilan aloqa</span>
                  </div>
                  <div className="text-[11px] text-[#E6DCD1] bg-black/20 p-1.5 rounded border border-white/10 flex items-center justify-between">
                    <span>Telefon · Telegram</span>
                    <span className="text-[#D0AE70] font-bold">Tezkor qo'ng'iroq</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#493329] group-hover:text-[#795640] transition-colors leading-snug">
                  Mijozlar bazasi (CRM)
                </h3>
                <p className="text-xs text-[#6B5549] leading-relaxed line-clamp-3">
                  Xaridorlarning ismlari, telefon raqamlari, Telegram foydalanuvchi nomlari va xarid holatlarini bir joyda tartibli saqlang.
                </p>
                <div className="space-y-1 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>1 bosishda qo'ng'iroq va Telegramga yozish</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Yangi, muzokarada, doimiy mijoz statuslari</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-[#EFE8DE]/60 pt-4">
              <span className="text-[11px] text-[#8D786D]">
                {savedCustomersCount > 0 ? `${savedCustomersCount} ta mijoz` : "Mijozlar ro'yxati"}
              </span>
              <button
                onClick={() => setActiveTab('crm')}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl transition-all btn-tactile shadow-2xs flex items-center gap-1.5"
              >
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 10: Mahsulotlar ombori */}
          <div className="bg-white border-2 border-[#D0AE70]/70 hover:border-[#D0AE70] rounded-2xl shadow-card card-elevation flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:-translate-y-1">
            <div>
              {/* Visual Header */}
              <div className="h-36 bg-gradient-to-br from-[#2D3F37] via-[#3B4F46] to-[#1E2B25] p-4 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                    Ombor & Tovar
                  </span>
                  <span className="bg-[#D0AE70] text-[#34221A] text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    <span>Yangi</span>
                  </span>
                </div>
                {/* Visual Graphic Mockup */}
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-emerald-100 truncate">Qoldiq & Tannarx</span>
                  </div>
                  <div className="text-[11px] text-emerald-200/90 bg-black/20 p-1.5 rounded border border-emerald-500/20 flex items-center justify-between">
                    <span>Minimal qoldiq signali</span>
                    <span className="text-amber-300 font-bold">Ogohlantirish</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#493329] group-hover:text-[#795640] transition-colors leading-snug">
                  Mahsulotlar ombori
                </h3>
                <p className="text-xs text-[#6B5549] leading-relaxed line-clamp-3">
                  Tovarlarning xarid va sotuv narxlari, ombordagi qoldiq soni, SKU va kam qolgan tovarlar bo'yicha tezkor ogohlantirish.
                </p>
                <div className="space-y-1 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Kam qolgan tovarlarni avtomatik belgilash</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Foyda kalkulyatoridan to'g'ridan-to'g'ri import</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-[#EFE8DE]/60 pt-4">
              <span className="text-[11px] text-[#8D786D]">
                {savedProductsCount > 0 ? `${savedProductsCount} ta tovar` : "Ombor nazorati"}
              </span>
              <button
                onClick={() => setActiveTab('inventory')}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl transition-all btn-tactile shadow-2xs flex items-center gap-1.5"
              >
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 11: Savdo buyurtmalari */}
          <div className="bg-white border-2 border-[#D0AE70]/70 hover:border-[#D0AE70] rounded-2xl shadow-card card-elevation flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:-translate-y-1">
            <div>
              {/* Visual Header */}
              <div className="h-36 bg-gradient-to-br from-[#30211A] via-[#483329] to-[#251A14] p-4 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D0AE70] bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                    Savdo & Hisob
                  </span>
                  <span className="bg-[#D0AE70] text-[#34221A] text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" />
                    <span>Yangi</span>
                  </span>
                </div>
                {/* Visual Graphic Mockup */}
                <div className="space-y-1 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF6F0]/15 border border-[#D0AE70]/40 flex items-center justify-center text-[#D0AE70]">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#FAF6F0] truncate">Buyurtma va Savdo</span>
                  </div>
                  <div className="text-[11px] text-[#E6DCD1] bg-black/20 p-1.5 rounded border border-white/10 flex items-center justify-between">
                    <span>Atomik ombor yechimi</span>
                    <span className="text-emerald-400 font-bold">Avto hisob</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#493329] group-hover:text-[#795640] transition-colors leading-snug">
                  Savdo buyurtmalari
                </h3>
                <p className="text-xs text-[#6B5549] leading-relaxed line-clamp-3">
                  CRM mijozlari va ombor tovarlarini bog'lab buyurtma yarating, tushum va foydani hisoblang hamda ombor qoldig'ini avtomatlashtiring.
                </p>
                <div className="space-y-1 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Qoralama (draft) va tasdiqlash holatlari</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#D0AE70] font-bold">·</span>
                    <span>Bekor qilishda omborga xavfsiz qaytarish</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-[#EFE8DE]/60 pt-4">
              <span className="text-[11px] text-[#8D786D]">
                {savedOrdersCount > 0 ? `${savedOrdersCount} ta buyurtma` : "Savdo nazorati"}
              </span>
              <button
                onClick={() => setActiveTab('orders')}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl transition-all btn-tactile shadow-2xs flex items-center gap-1.5"
              >
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="bg-white border border-[#E6DCD1] rounded-3xl p-6 sm:p-10 shadow-card space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#493329]">
            Xizmat qanday ishlaydi?
          </h2>
          <p className="text-sm text-[#6B5549] mt-1">
            Hech qanday murakkab sozlamalarsiz, 3 oddiy qadamda natijaga erishing:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-5 bg-[#FAF6F0] rounded-2xl border border-[#EFE8DE] space-y-3 card-elevation">
            <div className="w-8 h-8 rounded-lg bg-[#493329] text-[#D0AE70] border border-[#6B5041] font-bold flex items-center justify-center text-sm shadow-xs font-serif">
              1
            </div>
            <h3 className="text-sm font-bold text-[#493329]">
              Kerakli asbobni tanlang
            </h3>
            <p className="text-xs text-[#6B5549] leading-relaxed">
              Bugun nima qilmoqchisiz: reklama chiqarish, partiya foydasini tekshirish, A/B test qilish yoki kunlik vazifalar rejasini tuzish?
            </p>
          </div>

          <div className="p-5 bg-[#FAF6F0] rounded-2xl border border-[#EFE8DE] space-y-3 card-elevation">
            <div className="w-8 h-8 rounded-lg bg-[#493329] text-[#D0AE70] border border-[#6B5041] font-bold flex items-center justify-center text-sm shadow-xs font-serif">
              2
            </div>
            <h3 className="text-sm font-bold text-[#493329]">
              Ma'lumotlarni kiriting
            </h3>
            <p className="text-xs text-[#6B5549] leading-relaxed">
              Mahsulot nomi, xususiyatlari yoki hisob-kitob raqamlarini kiriting. Murakkab qoidalarni bilish shart emas.
            </p>
          </div>

          <div className="p-5 bg-[#FAF6F0] rounded-2xl border border-[#EFE8DE] space-y-3 card-elevation">
            <div className="w-8 h-8 rounded-lg bg-[#493329] text-[#D0AE70] border border-[#6B5041] font-bold flex items-center justify-center text-sm shadow-xs font-serif">
              3
            </div>
            <h3 className="text-sm font-bold text-[#493329]">
              Natijani darhol ishlating
            </h3>
            <p className="text-xs text-[#6B5549] leading-relaxed">
              Tayyor matnni Telegram va Instagramga nusxalang, foydani saqlang yoki kundalik vazifalarni bajarib boring.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
