/**
 * BiznesYordam - "Bugun nima qilay?" (Today Navigator) Service
 * 
 * Provides actionable, realistic daily execution guidance for Uzbek entrepreneurs.
 * No generic motivational fluff; concrete prioritized tasks with estimated minutes,
 * zero-cost customer acquisition tactics, anti-distraction rules, and end-of-day success metrics.
 */

import { TodayNavigatorInput, TodayNavigatorPlan, TodayTaskStep } from '../types';
import { BackendAdError, BackendAiEnvelope, requestAiFromBackend } from './adBackendService';

export async function requestTodayPlanFromBackend(
  input: TodayNavigatorInput & { simulatedTier?: string },
  onStatusMessage?: (status: string) => void
): Promise<{ data?: BackendAiEnvelope<TodayNavigatorPlan>; error?: BackendAdError }> {
  return requestAiFromBackend<typeof input, BackendAiEnvelope<TodayNavigatorPlan>>(
    '/api/ai/today-navigator',
    input,
    onStatusMessage
  );
}

export function generateTodayPlan(input: TodayNavigatorInput): TodayNavigatorPlan {
  const business = (input.businessType || '').trim();
  const problem = (input.mainProblem || '').trim();
  const goal = (input.todayGoal || '').trim();
  const timeOption = input.availableTime || '1h';
  const budgetStr = (input.budget || '').trim();
  const clientStatus = (input.clientStatus || '').trim();

  const businessLower = business.toLowerCase();
  const problemLower = problem.toLowerCase();
  const goalLower = goal.toLowerCase();

  // Detect whether user provided a meaningful paid budget (> 0)
  const cleanedBudget = budgetStr.replace(/[\s_]+/g, '').toLowerCase();
  const isZeroOrFree = 
    !cleanedBudget ||
    cleanedBudget === '0' ||
    cleanedBudget === "0so'm" ||
    cleanedBudget === '0som' ||
    cleanedBudget.includes("yo'q") ||
    cleanedBudget.includes('bepul') ||
    cleanedBudget === 'mavjudemas';

  const hasPaidBudget = !isZeroOrFree;

  // Available minutes calculation
  const totalAvailableMinutes = (() => {
    switch (timeOption) {
      case '30m':
        return 30;
      case '1h':
        return 60;
      case '2h':
        return 120;
      case '4h+':
        return 240;
      default:
        return 60;
    }
  })();

  // 1. Determine Core Problem Theme
  const isNoSalesToday = problemLower.includes('savdo yo') || problemLower.includes('sotuv yo') || problemLower.includes('hech kim') || problemLower.includes('kassa');
  const isOldClientsSilent = problemLower.includes('eski') || problemLower.includes('qaytmayapti') || problemLower.includes('unutish');
  const isDeadStock = problemLower.includes('tovar') || problemLower.includes('omborda') || problemLower.includes('qolib ket') || problemLower.includes('chiqmayapti');
  const isSlowStaff = problemLower.includes('xodim') || problemLower.includes('ishchi') || problemLower.includes('bajar') || problemLower.includes('nazorat');
  const isColdInquiries = problemLower.includes('so\'rov') || problemLower.includes('yozdi') || problemLower.includes('javob bermadi') || problemLower.includes('qimmat');

  // 2. Determine Single Most Important Task (Fokus)
  let singleTaskTitle = "";
  let singleTaskRationale = "";
  let singleTaskExpectedResult = "";

  if (isDeadStock) {
    singleTaskTitle = "Ombordagi qolib ketgan tovar uchun bugungi maxsus 'Flesh-taklif' (1 kunga chegirma yoki sovg'a) e'lon qilish";
    singleTaskRationale = "O'lik tovar pulingizni muzlatib qo'ygan. Uni darhol aylanmaga kiritish naqd pul oqimini (cash flow) tiklashning eng tezkor usulidir.";
    singleTaskExpectedResult = "Bugun kamida 1-3 ta to'xtab qolgan tovar sotiladi yoki yangi mijozlar uchun jozibador sabab yaratiladi.";
  } else if (isNoSalesToday || isOldClientsSilent) {
    singleTaskTitle = "Oxirgi 30 kunda xarid qilgan yoki so'rov bergan 10 ta eng iliq mijozga shaxsiy audio/xabar bilan murojaat qilish";
    singleTaskRationale = "Yangi sovuq mijozni jalb qilish eski mijozga taklif berishdan 5 barobar ko'proq vaqt va xarajat talab qiladi. Eng tez natija — sizni allaqachon taniydigan mijozlardan keladi.";
    singleTaskExpectedResult = "10 ta mijozdan kamida 2-3 tasi bilan dialog tiklanadi va 1 ta real buyurtma yoki to'lov olinadi.";
  } else if (isColdInquiries) {
    singleTaskTitle = "Narx so'rab, keyin jim bo'lib qolgan oxirgi mijozlar ro'yxatiga 'Qo'shimcha qiymatli taklif' (bonus yoki yordam) berish";
    singleTaskRationale = "Mijozlar 'qimmat' degani — bu puli yo'qligi emas, balki to'lagan puliga yarasha foydani hali to'liq his qilmaganidir.";
    singleTaskExpectedResult = "Muloqotdan to'xtab qolgan 3 ta mijozdan 1 tasi qaror qabul qiladi yoki sababini ochiq aytadi.";
  } else if (isSlowStaff) {
    singleTaskTitle = "Kun boshida har bir xodimga faqat 1 ta asosiy raqamli vazifa va kun oxirida qat'iy hisob topshirish vaqtini belgilash";
    singleTaskRationale = "Ko'p vazifali xiralashgan kun xodimlarni chalg'itadi. Aniq bitta vazifa va hisobot soati mas'uliyatni oshiradi.";
    singleTaskExpectedResult = "Xodimlar ikkilanishsiz asosiy vazifaga kirishadi va kechki 18:00 ga qadar aniq natija beradi.";
  } else {
    singleTaskTitle = `Bugungi bosh maqsad (${goal || 'Savdoni oshirish'}) uchun to'g'ridan-to'g'ri daromad keltiruvchi 1 ta asosiy harakatni bajarish`;
    singleTaskRationale = "Kichik biznesda eng katta xato — ikkinchi darajali mayda ishlar (rasm chizish, qayta tozalash) bilan chalg'ib, sotuv keltiradigan harakatni kechiktirishdir.";
    singleTaskExpectedResult = "Bugun siz rejalashtirgan maqsad tomon o'lchanadigan aniq qadam qo'yiladi.";
  }

  // 3. Generate 3 to 5 Action Steps with realistic minutes allocation
  const actionSteps: TodayTaskStep[] = [];

  if (totalAvailableMinutes <= 30) {
    // 30m Plan: 3 compact punchy steps
    actionSteps.push({
      id: 'step_1',
      order: 1,
      title: "Iliq kontaktlar ro'yxatini ajratish",
      description: "Oxirgi haftada qiziqqan yoki avval sizdan olgan 5 ta mijoz raqamini/Telegram profilini oching. Boshqa ishlarga chalg'imang.",
      estimatedMinutes: 5,
      completed: false,
    });
    actionSteps.push({
      id: 'step_2',
      order: 2,
      title: "Shaxsiy va qisqa audio/matnli taklif yuborish",
      description: "Har biriga ismi bilan murojaat qilib, bugungi aniq taklif yoki yordamni ayting (Masalan: 'Salom Aziz aka, bugun yangi partiyamizdan siz so'ragan o'lcham keldi, olib qo'yaymi?').",
      estimatedMinutes: 15,
      completed: false,
    });
    actionSteps.push({
      id: 'step_3',
      order: 3,
      title: "Javoblarni yopish va natijani hisobga olish",
      description: "Kelgan javoblarga darhol 2 daqiqa ichida javob berib, buyurtmani rasmiylashtiring.",
      estimatedMinutes: 10,
      completed: false,
    });
  } else if (totalAvailableMinutes <= 60) {
    // 1h Plan: 4 practical steps
    actionSteps.push({
      id: 'step_1',
      order: 1,
      title: "Bugungi diqqat fokusini aniqlashtirish va chalg'ituvchilarni o'chirish",
      description: "Telefon bildirishnomalarini 45 daqiqaga o'chiring. Qog'ozga bugungi yagona muhim maqsadni yozib qo'ying.",
      estimatedMinutes: 10,
      completed: false,
    });
    actionSteps.push({
      id: 'step_2',
      order: 2,
      title: "Oxirgi 10 ta mijozga shaxsiy murojaat tayyorlash",
      description: `Mijozlar holati (${clientStatus || 'muloqotdagi mijozlar'}): avvalgi buyurtmachilar yoki qiziqqanlarga maxsus bonus/taklif bilan yozing.`,
      estimatedMinutes: 20,
      completed: false,
    });
    actionSteps.push({
      id: 'step_3',
      order: 3,
      title: "Telegram/Instagram Status yoki Stories-ga faqat 1 ta kuchli taklif joylash",
      description: "Ko'p rasm emas, aniq muammo yechimi, narxi va to'g'ridan-to'g'ri murojaat qilish uchun 'Menga yozing' havolasini qo'ying.",
      estimatedMinutes: 15,
      completed: false,
    });
    actionSteps.push({
      id: 'step_4',
      order: 4,
      title: "Muloqotdagi e'tirozlarni yopish va to'lov rekvizitlarini jo'natish",
      description: "So'rov berganlar bilan savdo dialogini yakunlang, yetkazib berish yoki to'lov usulini sodda qilib taklif eting.",
      estimatedMinutes: 15,
      completed: false,
    });
  } else if (totalAvailableMinutes <= 120) {
    // 2h Plan: 5 detailed steps
    actionSteps.push({
      id: 'step_1',
      order: 1,
      title: "Tezkor audit: bugungi eng zaif zanjirni aniqlash",
      description: `Muammo: "${problem || 'Sotuv oqimi'}". Sababni aniqlang: mahsulot yetarli emasmi, taklif sustmi yoki mijozlar bilmayaptimi?`,
      estimatedMinutes: 15,
      completed: false,
    });
    actionSteps.push({
      id: 'step_2',
      order: 2,
      title: "Sotuvchi taklif (Offer) matnini shakllantirish",
      description: "BESTO Reklama vositasi orqali jozibador sarlavha, chegirma/bonus va cheklangan muddatli chaqiriq (CTA) tayyorlang.",
      estimatedMinutes: 25,
      completed: false,
    });
    actionSteps.push({
      id: 'step_3',
      order: 3,
      title: "Eski mijozlar bazasini qizdirish (Reaktivatsiya)",
      description: "Oxirgi 2-3 oyda xarid qilgan 15 ta mijozga shaxsiy taklif va minnatdorchilik xabari jo'nating.",
      estimatedMinutes: 35,
      completed: false,
    });
    actionSteps.push({
      id: 'step_4',
      order: 4,
      title: "Hamkorlar yoki mahalliy guruhlarda bepul joylashuv qilish",
      description: "Siz bilan raqobatchi bo'lmagan, lekin bir xil mijozga xizmat qiladigan hamkor kanalida o'zaro tavsiya almashing.",
      estimatedMinutes: 25,
      completed: false,
    });
    actionSteps.push({
      id: 'step_5',
      order: 5,
      title: "Murojaatlarni qabul qilish va buyurtmaga aylantirish",
      description: "Har bir kelgan xabarga 3 daqiqadan kechikmay javob qaytaring, skript bo'yicha mijoz ehtiyojini aniqlang.",
      estimatedMinutes: 20,
      completed: false,
    });
  } else {
    // 4h+ Full Execution Day: 5 comprehensive steps
    actionSteps.push({
      id: 'step_1',
      order: 1,
      title: "Kunlik operatsion va moliyaviy maqsadni belgilash",
      description: `Kunlik kassa maqsadi: ${goal || 'Barqaror sotuv'}. Kamida qancha tovar yoki xizmat sotilishi kerakligini hisoblang.`,
      estimatedMinutes: 30,
      completed: false,
    });
    actionSteps.push({
      id: 'step_2',
      order: 2,
      title: "Mijozlar bazasi va sovuq kontaktlar bilan ishlash bloki",
      description: "20-25 ta mijoz bilan bevosita muloqotga kirishing. Narx so'rab to'xtab qolganlarga muammoni yechuvchi yangi yondashuv bering.",
      estimatedMinutes: 60,
      completed: false,
    });
    actionSteps.push({
      id: 'step_3',
      order: 3,
      title: "Marketing va tarqatish kampaniyasini ishga tushirish",
      description: hasPaidBudget 
        ? `Mavjud budjet (${budgetStr}) doirasida eng konversiyali bitta postga maqsadli mikro-reklama yoqing.`
        : "Bepul kanallar: Stories, Telegram kanallar, shaxsiy tavsiyanomalar va hamkorlik orqali yangi oqim yarating.",
      estimatedMinutes: 50,
      completed: false,
    });
    actionSteps.push({
      id: 'step_4',
      order: 4,
      title: "Xarid jarayonidagi to'siqlarni bartaraf etish",
      description: "Mijoz nima uchun ikkilanmoqda? Yetkazib berish qulayligi, kafolat yoki to'lovni osonlashtiruvchi shartlarni mijozga tushuntiring.",
      estimatedMinutes: 45,
      completed: false,
    });
    actionSteps.push({
      id: 'step_5',
      order: 5,
      title: "Kechki tahlil va ertangi kun zaxirasini tayyorlash",
      description: "Kassa tushumi, olingan buyurtmalar soni va javob berilmagan xabarlarni sarhisob qiling.",
      estimatedMinutes: 35,
      completed: false,
    });
  }

  // 4. Zero-Cost / Low-Cost Customer Acquisition Tactic
  let zeroCostTactic: TodayNavigatorPlan['zeroCostCustomerAcquisitionTactic'];

  if (hasPaidBudget) {
    zeroCostTactic = {
      title: "Mavjud budjetni tejamkor ishlatish + Bepul organik qo'shimcha",
      channel: "Ijtimoiy tarmoqlar & Telegram",
      stepByStep: [
        `Ajratilgan budjetingiz (${budgetStr}) mavjud bo'lsa-da, uni bir vaqtda sovuq auditoriyaga sarflamang. Avval eng iliq auditoriyaga yo'naltiring.`,
        "1-qadam (Bepul): Oxirgi xaridorlarga Telegram orqali ovozli xabar yuborib, 'Do'stingizni olib kelsangiz ikkingizga ham bonus' taklifini bering.",
        "2-qadam (Bepul): Shaxsiy Stories va Telegram holatida real mahsulotni ishlatish jarayonini jonli ko'rsating.",
        `3-qadam (${budgetStr}): Faqat oldindan qiziqish bildirgan, lekin sotib olmagan post/auditoriyaga qayta ko'rsatish (Retargeting) uchun minimal budjet qo'ying.`
      ],
      costNote: `Kiritilgan budjet: ${budgetStr}. Tavsiya: 70% diqqatni bepul organik usulga, qolganini sinov reklamaga qarating.`
    };
  } else {
    // Strictly zero-cost organic tactic
    zeroCostTactic = {
      title: "0 so'm xarajatli 'Uyg'otish va Tavsiya' (Warm Reactivation) usuli",
      channel: "Telegram & WhatsApp shaxsiy muloqot / Stories",
      stepByStep: [
        "Pulli reklama yoqish shart emas! Eng ishonchli va tezkor sotuv — allaqachon sizni biladigan odamlardan keladi.",
        "1-qadam: Telefon daftarchangiz yoki Telegramdagi oxirgi 15 ta xaridoringizni belgilab oling.",
        "2-qadam: Hammaga bir xil shablon emas, har biriga samimiy ovozli xabar (15-20 soniya) jo'nating: 'Assalomu alaykum [Ismi], oldingi xaridingiz ma'qul bo'ldimi? Sizga bugun alohida kichik yangiligimiz/bonusimiz bor edi...'",
        "3-qadam: Har bir mijozdan 'Agar sizga kerak bo'lmasa, do'stingizga ulashishingiz mumkin' deb do'stona tavsiya so'rang.",
        "4-qadam: Shaxsiy profilingizda soxta reklamalarsiz, 'Bugun buyurtma bergan birinchi 3 kishiga bepul yetkazib berish' cheklovini e'lon qiling."
      ],
      costNote: "Xarajat: 0 so'm (Mutlaqo bepul). Talab etiladigan narsa — faqat 20 daqiqalik shaxsiy e'tibor va samimiyat."
    };
  }

  // 5. Anti-Distraction Rule (What NOT to do today)
  let antiDistraction: TodayNavigatorPlan['antiDistractionRule'];

  if (isNoSalesToday || isDeadStock) {
    antiDistraction = {
      whatToAvoid: "Logotipni o'zgartirish, do'kon peshtaxtasini 5-marta qayta terish yoki raqobatchilar profilini behuda kuzatish",
      whyItWastesTime: "Bu harakatlar 'men ishlayapman' degan soxta his uyg'otadi, lekin kassa tushumiga 1 so'm ham qo'shmaydi. Savdo yo'q paytda yagona qutqaruvchi — mijoz bilan yuzma-yuz muloqot.",
      practicalAlternative: "Telefonni qo'lga olib, qiziqqan mijozlar bilan to'g'ridan-to'g'ri bog'laning yoki bugungi aniq sotuv taklifini tarqating."
    };
  } else if (isColdInquiries) {
    antiDistraction = {
      whatToAvoid: "Narx so'rab jim qolgan mijozlarga ketma-ket 10 ta belgilarsiz rasm tashlab jonga tegish",
      whyItWastesTime: "Spam va quruq rasm yuborish mijozda sizni bloklash istagini uyg'otadi va obro'ingizni tushiradi.",
      practicalAlternative: "Mijozning ehtiyojini so'rang: 'Sizga aynan qaysi jihati muhim edi: narxmi, o'lchammi yoki yetkazib berishmi?' deb savol bering."
    };
  } else {
    antiDistraction = {
      whatToAvoid: "Kun bo'yi ijtimoiy tarmoqlardagi layklar va ko'rishlar statistikasini qayta-qayta tekshirish",
      whyItWastesTime: "Metrikalarni har 5 daqiqada yangilash vaqt va energiyangizni o'g'irlaydi, natijani esa o'zgartirmaydi.",
      practicalAlternative: "Statistikani faqat kun yakunida (18:00 dan keyin) 1 marta tekshirishni qat'iy qoida qiling."
    };
  }

  // 6. End of Day Success Metrics (KPI)
  const endOfDayMetrics: TodayNavigatorPlan['endOfDaySuccessMetrics'] = {
    targetMetric: `Bugungi asosiy mezon: Kamida 5-10 ta aniq mijoz bilan sifatli muloqot o'tkazish va maqsad bo'yicha (${goal || 'Savdo va buyurtma'}) kamida 1-3 ta ijobiy natijaga erishish.`,
    verificationQuestion: "Kechqurun soat 19:00 da o'zingizga savol bering: 'Bugun to'g'ridan-to'g'ri pul keltiradigan qaysi ishni qildim va kassa/mijoz sonida nima o'zgardi?'",
    fallbackAssessment: "Agar maqsad to'liq bajarilmagan bo'lsa ham: agar kamida 10 ta odam sizning taklifingizni ko'rgan va javob qaytargan bo'lsa, bu ertangi kun uchun zaxira hisoblanadi."
  };

  // 7. Emergency 30-Minute Express Plan
  const expressPlan: TodayNavigatorPlan['expressThirtyMinPlan'] = {
    title: "Vaqt o'ta kam bo'lganda: 30 daqiqalik shoshilinch reja",
    steps: [
      {
        minuteMark: "00 — 08 daqiqa",
        action: "Oxirgi 3 kunda aloqaga chiqqan 5 ta eng iliq kontaktni oching va har biriga shaxsiy taklif yo'llang."
      },
      {
        minuteMark: "08 — 20 daqiqa",
        action: "Telegram yoki Instagram Statusga bugun 23:59 gacha amal qiluvchi 'Faqat 2 ta joy qoldi' yoki 'Faqat bugun sovg'a' bilan post qo'ying."
      },
      {
        minuteMark: "20 — 30 daqiqa",
        action: "Javob berganlar bilan to'g'ridan-to'g'ri muloqot qilib, to'lov yoki buyurtma manzilini aniqlang."
      }
    ]
  };

  // Note for sparse inputs
  let assumptionsNote: string | undefined = undefined;
  if (!budgetStr || !clientStatus) {
    assumptionsNote = "Eslatma: Budjet yoki mijozlar holati to'liq kiritilmagani sababli, tavsiyalar mutlaqo bepul (0 so'm xarajatli) organik sotuv usullariga moslab shakllantirildi. Agar qo'shimcha budjetingiz bo'lsa, uni ko'rsatib qayta rejalashtirishingiz mumkin.";
  }

  const todayStr = new Intl.DateTimeFormat('uz-UZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    dateFormatted: todayStr,
    input,
    singleMostImportantTask: {
      title: singleTaskTitle,
      rationale: singleTaskRationale,
      expectedResult: singleTaskExpectedResult,
    },
    actionSteps,
    zeroCostCustomerAcquisitionTactic: zeroCostTactic,
    antiDistractionRule: antiDistraction,
    endOfDaySuccessMetrics: endOfDayMetrics,
    expressThirtyMinPlan: expressPlan,
    inferredAssumptionsNote: assumptionsNote,
  };
}
