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
  Sparkles
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

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* Hero Section - Warm luxury presentation */}
      <section className="bg-white border border-[#E6DCD1] rounded-3xl overflow-hidden shadow-card">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Text Column */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#795640]">
                <span className="w-2 h-2 rounded-full bg-[#D0AE70]"></span>
                <span>O'zbekistondagi kichik bizneslar uchun maxsus</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#493329] leading-[1.16] text-balance">
                Savdo va hisob-kitobingizni osonlashtiring
              </h1>

              <p className="text-base sm:text-lg text-[#6B5549] leading-relaxed max-w-xl">
                Do'kon egalari, onlayn savdogarlar va xizmat ko'rsatuvchilar uchun reklama matnlari tayyorlash, sof foydani aniq hisoblash hamda mijozlarga tezkor javob berish asboblari.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab('ad-generator')}
                className="px-5 py-3 text-sm font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl transition-all btn-tactile shadow-xs flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
              >
                <FileText className="w-4 h-4 text-[#34221A]" />
                <span>Reklama matni yaratish</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>

              <button
                onClick={() => setActiveTab('profit-calculator')}
                className="px-5 py-3 text-sm font-semibold text-[#493329] hover:text-[#34221A] bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#E6DCD1] rounded-xl transition-all btn-tactile shadow-xs flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
              >
                <Calculator className="w-4 h-4 text-[#795640]" />
                <span>Foydani hisoblash</span>
              </button>
            </div>

            {/* Practical trust markers (Transparent & authentic) */}
            <div className="pt-6 border-t border-[#EFE8DE] flex flex-wrap items-center gap-6 text-xs text-[#6B5549]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D0AE70] shrink-0" />
                <span>Ro'yxatdan o'tish talab etilmaydi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D0AE70] shrink-0" />
                <span>Ma'lumotlar qurilmangizda saqlanadi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D0AE70] shrink-0" />
                <span>Telegram & Instagramga mos</span>
              </div>
            </div>
          </div>

          {/* Right Image / Visual Column */}
          <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full bg-[#FAF6F0] border-t lg:border-t-0 lg:border-l border-[#E6DCD1]">
            <img
              src="/src/assets/images/small_biz_hero_1792843780008.jpg"
              alt="BiznesYordam ish jarayoni"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Soft decorative gradient overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:hidden" />
          </div>
        </div>
      </section>

      {/* 3 Main Tools Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#493329]">
            Asosiy ish qurollari
          </h2>
          <p className="text-sm text-[#6B5549] mt-1">
            Kundalik savdo faoliyatingizda eng ko'p kerak bo'ladigan uchta qulay vosita:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Ad Generator */}
          <div className="bg-white border border-[#E6DCD1] hover:border-[#D0AE70] rounded-2xl p-6 shadow-card card-elevation flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#F6EFE3] border border-[#E8D6B7]/60 text-[#795640] flex items-center justify-center font-bold">
                <FileText className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#493329] group-hover:text-[#795640] transition-colors">
                  Reklama matnlari
                </h3>
                <p className="text-xs text-[#6B5549] mt-2 leading-relaxed">
                  Mahsulotingiz afzalliklari, narxi va maxsus taklifingizni kiriting. Telegram va Instagram uchun sotuvchi post qoralamasini oling.
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                <div className="flex items-center gap-2">
                  <span className="text-[#D0AE70]">·</span>
                  <span>Telegram va Instagram formatlari</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D0AE70]">·</span>
                  <span>Chegirma, muammo-yechim andozalari</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D0AE70]">·</span>
                  <span>Bir zumda tahrirlash va nusxalash</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#EFE8DE] flex items-center justify-between">
              <span className="text-[11px] text-[#8D786D]">
                {savedDraftsCount > 0 ? `${savedDraftsCount} ta qoralama saqlangan` : 'Tayyor andozalar'}
              </span>
              <button
                onClick={() => setActiveTab('ad-generator')}
                className="text-xs font-semibold text-[#795640] hover:text-[#493329] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                <span>Boshlash</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D0AE70]" />
              </button>
            </div>
          </div>

          {/* Card 2: Profit Calculator */}
          <div className="bg-white border border-[#E6DCD1] hover:border-[#D0AE70] rounded-2xl p-6 shadow-card card-elevation flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#F6EFE3] border border-[#E8D6B7]/60 text-[#795640] flex items-center justify-center font-bold">
                <Calculator className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#493329] group-hover:text-[#795640] transition-colors">
                  Foyda kalkulyatori
                </h3>
                <p className="text-xs text-[#6B5549] mt-2 leading-relaxed">
                  Tannarx, donabay yetkazib berish, qadoqlash va sotish narxini kiritib, sof daromad, foyda marjasi hamda ustama foizini hisoblang.
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                <div className="flex items-center gap-2">
                  <span className="text-[#D0AE70]">·</span>
                  <span>Marja va ustama farqini ko'rsatish</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D0AE70]">·</span>
                  <span>Doimiy xarajatlar va zararsizlik nuqtasi</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D0AE70]">·</span>
                  <span>O'zbek so'mi formatida hisobot</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#EFE8DE] flex items-center justify-between">
              <span className="text-[11px] text-[#8D786D]">
                {savedCalcsCount > 0 ? `${savedCalcsCount} ta hisob saqlangan` : 'Tezkor hisob-kitob'}
              </span>
              <button
                onClick={() => setActiveTab('profit-calculator')}
                className="text-xs font-semibold text-[#795640] hover:text-[#493329] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                <span>Hisoblash</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D0AE70]" />
              </button>
            </div>
          </div>

          {/* Card 3: Reply Templates */}
          <div className="bg-white border border-[#E6DCD1] hover:border-[#D0AE70] rounded-2xl p-6 shadow-card card-elevation flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#F6EFE3] border border-[#E8D6B7]/60 text-[#795640] flex items-center justify-center font-bold">
                <MessageSquare className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#493329] group-hover:text-[#795640] transition-colors">
                  Mijozlarga javoblar
                </h3>
                <p className="text-xs text-[#6B5549] mt-2 leading-relaxed">
                  "Narxi qancha?", "Yetkazib berish qanaqa?" yoki to'lov rekvizitlari bo'yicha savollarga professional va muloyim tayyor javoblar.
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-[#6B5549] pt-2 border-t border-[#EFE8DE]">
                <div className="flex items-center gap-2">
                  <span className="text-[#D0AE70]">·</span>
                  <span>Narx, mahsulot va yetkazish shablonlari</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D0AE70]">·</span>
                  <span>O'zgaruvchilarni bir zumda almashtirish</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D0AE70]">·</span>
                  <span>O'z shaxsiy shablonlaringizni qo'shish</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#EFE8DE] flex items-center justify-between">
              <span className="text-[11px] text-[#8D786D]">
                8+ tayyor shablon
              </span>
              <button
                onClick={() => setActiveTab('reply-templates')}
                className="text-xs font-semibold text-[#795640] hover:text-[#493329] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                <span>Ko'rish</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D0AE70]" />
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
              Bugun nima qilmoqchisiz: reklama chiqarish, partiya foydasini tekshirish yoki mijozlarga javob yozish?
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
              Mahsulot nomi, narxlar va xarajatlarni to'ldiring. Tizim avtomatik tarzda hisob-kitob qiladi yoki matn tuzadi.
            </p>
          </div>

          <div className="p-5 bg-[#FAF6F0] rounded-2xl border border-[#EFE8DE] space-y-3 card-elevation">
            <div className="w-8 h-8 rounded-lg bg-[#493329] text-[#D0AE70] border border-[#6B5041] font-bold flex items-center justify-center text-sm shadow-xs font-serif">
              3
            </div>
            <h3 className="text-sm font-bold text-[#493329]">
              Nusxa oling va amalda qo'llang
            </h3>
            <p className="text-xs text-[#6B5549] leading-relaxed">
              Natijani bitta tugma bilan nusxalab, Telegram kanal, Instagram yoki o'z hisobotingizga joylashtiring.
            </p>
          </div>
        </div>
      </section>

      {/* Practical Entrepreneur Advice Section - Elegant deep brown box */}
      <section className="bg-[#493329] text-[#F8F4ED] rounded-3xl p-6 sm:p-10 shadow-card border border-[#5E4235] space-y-6">
        <div>
          <span className="text-xs font-semibold text-[#D0AE70] uppercase tracking-wider block mb-1">
            Foydali tavsiyalar
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Kichik biznes uchun 3 ta oltin qoida
          </h2>
          <p className="text-xs sm:text-sm text-[#D7C9BF] mt-1 max-w-xl">
            Ko'plab yangi boshlovchilar yo'l qo'yadigan odatiy xatolardan saqlanish yo'llari:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-5 bg-[#3B2921] rounded-2xl border border-[#5A4034] space-y-2 card-elevation">
            <span className="text-[#D0AE70] font-bold text-sm block">
              01. Ko'rinmas xarajatlarni hisobga oling
            </span>
            <p className="text-xs text-[#D7C9BF] leading-relaxed">
              Faqat mahsulotning xarid narxini emas, qadoqlash qutisi, kuryer yo'l haqi, kartadan naqdlashtirish komissiyasi va reklamani ham 1 dona tannarxiga qo'shing.
            </p>
          </div>

          <div className="p-5 bg-[#3B2921] rounded-2xl border border-[#5A4034] space-y-2 card-elevation">
            <span className="text-[#D0AE70] font-bold text-sm block">
              02. Mijozga 5 daqiqa ichida javob bering
            </span>
            <p className="text-xs text-[#D7C9BF] leading-relaxed">
              Ijtimoiy tarmoqlarda mijoz savol berganda tez javob olishni kutadi. Tayyor shablonlardan foydalanish javob berish vaqtini 1 daqiqaga tushiradi.
            </p>
          </div>

          <div className="p-5 bg-[#3B2921] rounded-2xl border border-[#5A4034] space-y-2 card-elevation">
            <span className="text-[#D0AE70] font-bold text-sm block">
              03. Marja va ustamani adashtirmang
            </span>
            <p className="text-xs text-[#D7C9BF] leading-relaxed">
              Agar tovaringizga 50% ustama qo'ysangiz ham, tushumingizdagi sof marja 33% bo'ladi. Chegirma berganda marjangizdan oshib ketmasligini tekshiring.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
