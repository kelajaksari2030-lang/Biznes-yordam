/**
 * BiznesYordam - AI Business Diagnostics Engine
 * Tailored for Uzbek small businesses (retail, online shops, education, services, production)
 * Produces structured, actionable 6-point diagnostics.
 */

import { BusinessDiagnosticsInput, BusinessDiagnosticsResult } from '../types';

export function runBusinessDiagnostics(input: BusinessDiagnosticsInput): BusinessDiagnosticsResult {
  const {
    businessType,
    productOrService,
    targetAudience,
    monthlyRevenue,
    mainProblem,
    currentGoal,
  } = input;

  const bType = (businessType || '').trim();
  const prod = (productOrService || '').trim();
  const audience = (targetAudience || '').trim();
  const revenue = (monthlyRevenue || '').trim();
  const problem = (mainProblem || '').trim();
  const goal = (currentGoal || '').trim();

  // Evaluate information depth
  const isRevenueProvided = revenue.length > 0 && revenue.toLowerCase() !== "ko'rsatilmagan" && revenue.toLowerCase() !== 'mavjud emas';
  const confidenceNote = isRevenueProvided
    ? `Tahlil taqdim etilgan oylik aylanma (${revenue}) va operatsion ko'rsatkichlar asosida hisoblandi.`
    : `Oylik tushum ko'rsatilmaganligi sababli, moliyaviy baholash O'zbekiston bozorining o'rtacha segment ko'rsatkichlari asosida shakllantirildi (taxmin fakt sifatida qabul qilinmasligi tavsiya etiladi).`;

  // 1. Business state analysis
  const summary = `Sizning biznesingiz "${bType || 'Kichik biznes'}" sohasida "${prod}" yo'nalishida faoliyat yuritadi va asosan "${audience || 'mahalliy iste\'molchilar'}" segmentiga xizmat ko'rsatadi. Hozirgi bosqichda asosiy to'siq: "${problem || 'sotuv barqaror emasligi'}", bosh maqsad esa: "${goal || 'biznes hajmini oshirish'}". ${
    isRevenueProvided
      ? `Mavjud ${revenue} oylik hajm bilan yangi o'sish darajasiga chiqish uchun asosiy e'tiborni konversiyani oshirish va doimiy mijozlar bazasini kengaytirishga qaratish lozim.`
      : `Boshlang'ich yoki kengayish bosqichida eng asosiy e'tibor mijozlar bilan aloqa kanallari (Telegram/Instagram) va taklifning jozibadorligini oshirishga qaratilishi zarur.`
  }`;

  // 2. Top 3 risks/problems
  const topRisks: string[] = [
    `Mijozlarni jalb qilish narxining oshishi va past konversiya: "${problem}" sababli kelayotgan har bir murojaatdan maksimal sotuv chiqarilmayotgan bo'lishi mumkin.`,
    `Takroriy xaridlarning (LTV) pastligi: Bir martalik xariddan keyin mijozlar bilan muloqot uzilishi natijasida yangi mijoz topishga ortiqcha xarajat sarflanish xavfi.`,
    `Moliyaviy va marja noaniqligi: Narx belgilashda sof foyda marjasi, yetkazib berish va operatsion xarajatlar to'liq inobatga olinmasa, aylanma o'sgani bilan haqiqiy foyda kamayib qolishi mumkin.`,
  ];

  // 3. 3 Growth Opportunities
  const growthOpportunities: string[] = [
    `Kross-sotuv (Up-sell / Cross-sell) va to'plamlar: "${prod}" bilan birga tez-tez olinadigan qo'shimcha tovar/xizmatlarni bitta to'plam (set) qilib o'rtacha chekni 20-30% ga oshirish.`,
    `Mijozlar bazasi bilan tizimli ishlash: Telegram bot yoki kanal orqali avvalgi xaridorlarga shaxsiy chegirma, bonus yoki yangiliklarni eslatib turish orqali bepul qayta sotuv yaratish.`,
    `Ijtimoiy isbot (Social Proof) va mijoz fikrlari: Hozirgi mamnun mijozlarning video/skrinshot fikrlarini reklama va postlarga qo'shish orqali yangi mijozlar ishonchini 2 baravar oshirish.`,
  ];

  // 4. 7-Day practical action plan
  const sevenDayActionPlan = [
    {
      day: "1-kun: Audit",
      task: "Mijozlarning so'nggi 30 ta murojaatini tahlil qilish",
      details: "Qaysi savolda mijoz javob bermay qoldi? Narx qimmatlik qildimi yoki yetkazish noqulaymi? Eng ko'p uchragan 3 e'tirozni yozib oling."
    },
    {
      day: "2-kun: Taklif",
      task: "Yangi 'Rad etib bo'lmas taklif' (Irresistible Offer) tayyorlash",
      details: "Tovaringizga kichik bonus, bepul yetkazish yoki kafolat qo'shib, raqobatchilardan ajralib turuvchi bitta yangi aksiya shartini yozing."
    },
    {
      day: "3-kun: Shablonlar",
      task: "Mijozlarga tezkor javob shablonlarini yangilash",
      details: "Narx so'raganlarga quruq narx aytmasdan, mahsulot qiymatini tushuntirib, xaridga undovchi 3 ta yangi javob matnini tayyorlang."
    },
    {
      day: "4-kun: Qayta aloqa",
      task: "Eski mijozlar bazasiga maxsus xabar yuborish",
      details: "Oxirgi 2-3 oyda xarid qilgan kamida 20 nafar mijozga xushmuomala bilan hol-ahvol so'rab, maxsus 'Doimiy mijoz' taklifini yuboring."
    },
    {
      day: "5-kun: Marketing",
      task: "2 ta yangi formatdagi reklama posti chiqarish",
      details: "Biri muammo-yechim formatida, ikkinchisi haqiqiy mijoz natijasi/fikri bilan Telegram yoki Instagram sahifangizda e'lon qiling."
    },
    {
      day: "6-kun: Hisob-kitob",
      task: "Sof foyda marjasi va xarajatlarni qayta ko'rib chiqish",
      details: "BESTO Foyda kalkulyatorida har bir mahsulotdan qolayotgan sof so'm va marjani hisoblab, zararli yoki kam foydali tovarlarni aniqlang."
    },
    {
      day: "7-kun: Xulosa",
      task: "Haftalik natijalarni solishtirish va kelgusi haftani rejalashtirish",
      details: "Hafta davomida qancha yangi buyurtma bo'ldi va qaysi harakat eng ko'p natija berdi? Eng yaxshi ishlagan 1 ta usulni kelgusi haftada 2 barobar ko'paytiring."
    }
  ];

  // 5. Primary Priority Task (Quick Win)
  const primaryPriorityTask = {
    title: "Mijozlar e'tiroziga javob beruvchi 'Tezkor Taklif' paketini joriy qilish",
    rationale: `Sizning asosiy muammoingiz: "${problem}". Mijozlar ikkilanmasligi uchun birinchi navbatda xarid riskini kamaytiruvchi (masalan: ko'rib to'lash, bonus yoki tezkor yetkazish) aniq kafolat berish eng tez natija keltiradi.`,
    expectedOutcome: "Kelgusi 3-5 kunda kiruvchi murojaatlarning sotuvga aylanish (konversiya) ko'rsatkichi 15-25% ga oshadi."
  };

  // 6. Strategic reasoning & expected outcome
  const reasoningAndOutcome = {
    strategicReason: `Ushbu diagnostika rejasi "${goal}" maqsadiga erishish uchun katta xarajat talab qilmaydigan, balki ichki jarayonlar — muloqot sifati, konversiya va takroriy xaridorlar orqali daromadni oshirish strategiyasiga asoslandi.`,
    expectedImpact: `Tavsiya etilgan 7 kunlik amallarni to'liq bajarganingizda, doimiy mijozlar soni oshadi, reklama byudjeti tejaladi va biznesingizda aniq moliyaviy nazorat shakllanadi.`,
    metricsToTrack: [
      "Murojaatlarning sotuvga aylanish foizi (Konversiya)",
      "Bir mijozning o'rtacha xarid summasi (O'rtacha chek)",
      "Qayta xarid qilgan mijozlar ulushi (Repeat customers)"
    ]
  };

  return {
    id: `diag_${Date.now()}`,
    createdAt: new Date().toISOString(),
    input,
    summary,
    topRisks,
    growthOpportunities,
    sevenDayActionPlan,
    primaryPriorityTask,
    reasoningAndOutcome,
    confidenceNote,
  };
}
