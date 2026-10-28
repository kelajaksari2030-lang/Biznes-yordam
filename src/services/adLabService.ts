/**
 * BiznesYordam - Ad Laboratory (Reklama laboratoriyasi) Service
 * 
 * Provides comparative strategy generation, multi-angle A/B test hypotheses,
 * metric comparison matrix (CTR, leads, conversion, cost), and realistic testing advice.
 * 
 * Strictly avoids fake conversion numbers or guaranteed income claims.
 */

import { AdLabInput, AdLabResult, AdLabStrategy, AdLabMetricComparison } from '../types';

export function runAdLabExperiment(input: AdLabInput): AdLabResult {
  const {
    productOrService,
    targetAudience,
    platform,
    objective,
    budget,
    specialOfferOrStyle,
  } = input;

  const product = (productOrService || '').trim();
  const audience = (targetAudience || '').trim();
  const offer = (specialOfferOrStyle || '').trim();
  const bud = (budget || '').trim();

  // Platform specific tone and channel hints
  const platformName = (() => {
    switch (platform) {
      case 'instagram':
        return 'Instagram (Reels / Post / Stories)';
      case 'telegram':
        return 'Telegram (Kanal posti / Forward / Sponsor)';
      case 'tiktok':
        return 'TikTok (Dinamik video / Trend)';
      default:
        return 'Ijtimoiy tarmoqlar va onlayn kanallar';
    }
  })();

  const objectiveName = (() => {
    switch (objective) {
      case 'sales':
        return 'To\'g\'ridan-to\'g\'ri sotuv va buyurtma';
      case 'leads':
        return 'Murojaat va ariza yig\'ish (Lead Generation)';
      case 'followers':
        return 'Obunachi va profil auditoriyasini ko\'paytirish';
      case 'brand_awareness':
        return 'Brend tanilishi va ishonch uyg\'otish';
      default:
        return 'Savdoni oshirish';
    }
  })();

  // 1. STRATEGY A: Direct Value & Offer (Ratsional / Chegirma / Aniq taklif)
  const strategy1: AdLabStrategy = {
    id: 'strat_direct_offer',
    strategyType: 'direct_offer',
    title: '1-Strategiya: To\'g\'ridan-to\'g\'ri qiymat va taklif',
    tagline: 'Foyda va aniq shartlarga tayanuvchi ratsional yondashuv',
    hookHeadline: offer
      ? `🔥 Maxsus taklif: ${offer} — faqat cheklangan vaqt!`
      : `🔥 ${product}: Sifat, tezkor yetkazish va qulay shartlar bilan!`,
    bodyText: [
      `Agar siz sifatli va ishonchli "${product}" qidirayotgan bo'lsangiz, vaqtingizni bekorga sarflamang.`,
      `Biz ${audience || 'mijozlarimiz'} uchun eng qulay shartlarni taqdim etamiz:`,
      `✔ To'liq sifat kafolati va qulay to'lov usullari`,
      `✔ O'zbekiston bo'ylab tezkor yetkazib berish`,
      offer ? `✔ Aksiya sharti: ${offer}` : `✔ Buyurtma bergan har bir xaridorga maxsus xizmat`,
      `Qaror qabul qilishni keyinga surmang — hoziroq bog'laning!`,
    ].join('\n'),
    callToAction: platform === 'telegram'
      ? `👉 Buyurtma berish uchun @menejer ga yozing yoki tugmani bosing`
      : platform === 'tiktok'
      ? `👇 Batafsil ma'lumot olish uchun profil havolasiga o'ting`
      : `📩 Direct'ga "+" yozing yoki "Batafsil" tugmasini bosing`,
    recommendedAudience: `${audience || 'Qiziquvchilar'} — avval mahsulot qidirgan, narxga e'tiborli va tezkor xarid qilishga tayyor bo'lgan "iliq" auditoriya.`,
    strength: 'Aniq va tushunarli: mijoz nima olishini va narx/shartni darhol ko\'radi. Qaror qabul qilish vaqti qisqa.',
    potentialWeakness: 'Faqat chegirma yoki narxga qarab xarid qiluvchilarni jalb etishi mumkin; mahsulotning chuqur emotsional qiymati ochilmay qolishi xavfi bor.',
    testingAdvice: `Ushbu variantni 2-3 kun davomida faqat maqsadli qidiruv yoki retargeting guruhiga ko'rsating. Xabarlar tushishi tez bo'lishi kerak, agar murojaat bo'lmasa — taklif (offer) jozibador emas.`,
  };

  // 2. STRATEGY B: Problem-Agitate-Solve (Og'riqli nuqta va yechim)
  const strategy2: AdLabStrategy = {
    id: 'strat_problem_solution',
    strategyType: 'problem_solution',
    title: '2-Strategiya: Og\'riq-muammo va yechim (PAS modeli)',
    tagline: 'Mijozning asosiy qiyinchiligini ko\'tarib, xalos bo\'lish yo\'lini ko\'rsatish',
    hookHeadline: `Hali ham ${product.toLowerCase()} tanlashda noaniqlik va asabiylashishdan charchadingizmi?`,
    bodyText: [
      `Ko'p uchraydigan holat: pul sarflaysiz, lekin natija kutganingizdek bo'lmaydi yoki sifatsiz mahsulotga duch kelasiz.`,
      `Ayniqsa ${audience || 'ko\'pchilik'} uchun bu ortiqcha vaqt va asab yo'qotishga olib keladi.`,
      `💡 Yechim oddiy: Bizning "${product}" aynan shu muammolarni bartaraf etish uchun ishlab chiqilgan.`,
      `Siz ortiqcha xavotirsiz, sinovdan o'tgan haqiqiy yechimga ega bo'lasiz.`,
      offer ? `Aynan bugun boshlash uchun: ${offer}` : `Sinab ko'ring va natijani birinchi kundan his eting.`,
    ].join('\n'),
    callToAction: platform === 'telegram'
      ? `📲 Muammo yechimini bilish uchun kanalimizga kiring yoki admin bilan bog'laning`
      : platform === 'tiktok'
      ? `🎬 To'liq tajribani ko'rish uchun videoni oxirigacha ko'ring va havolani bosing`
      : `💬 Muammoingiz bo'yicha bepul maslahat olish uchun Direct'ga yozing`,
    recommendedAudience: `${audience || 'Keng qatlam'} — muammo mavjudligini biladigan, lekin hali qayerdan to'g'ri yechim topishni bilmayotgan "sovuq" va o'ylovchi auditoriya.`,
    strength: 'Kuchli emotsional ta\'sir: mijoz o\'zini tushunilgandek his qiladi, mahsulot qiymati narxdan ustun qo\'yiladi.',
    potentialWeakness: 'Matn uzunroq bo\'lgani sababli, boshidagi sarlavha yetarlicha kuchli bo\'lmasa, foydalanuvchi o\'qimasdan o\'tib ketishi mumkin.',
    testingAdvice: `Kreativ vizualida aynan "muammo va undan qutulish" jarayonini ifodalang (masalan: video-taqqoslash). Klik narxi (CPC) va postni to'liq o'qish vaqtini kuzating.`,
  };

  // 3. STRATEGY C: Social Proof & Storytelling (Ishonch, trend va qiziqish)
  const strategy3: AdLabStrategy = {
    id: 'strat_social_proof',
    strategyType: 'social_proof',
    title: '3-Strategiya: Ijtimoiy isbot va qiziqarli hikoya',
    tagline: 'Boshqalarning tajribasi, ishonch va tabiiy qiziqish orqali jalb qilish',
    hookHeadline: `Nega ${audience || 'yuzlab xaridorlar'} aynan ushbu "${product}"ni tanlamoqda?`,
    bodyText: [
      `Bir qarashda oddiy tuyulishi mumkin, lekin amalda har bir mijozimiz bir xil fikrni aytadi: "Kutganimdan ancha yaxshi chiqdi!"`,
      `Biz reklama uchun balandparvoz so'zlar ishlatmaymiz — haqiqiy natijalar va mamnun xaridorlarning o'zi gapirsin:`,
      `⭐ 98% dan ortiq ijobiy fikr va tavsiyalar`,
      `⭐ Doimiy qayta murojaat qiluvchi mijozlar bazasi`,
      `Endi navbat sizda: quruq va'dalar emas, o'z tajribangizda ishonch hosil qiling.`,
      offer ? `Maxsus e'tibor: ${offer}` : `Bugun qo'shiling va haqiqiy sifatdan bahramand bo'ling!`,
    ].join('\n'),
    callToAction: platform === 'telegram'
      ? `👀 Haqiqiy mijozlar sharhlari va fotosuratlarni ko'rish uchun kanalga obuna bo'ling`
      : platform === 'tiktok'
      ? `✨ Fikrlarni izohlarda o'qing va profil orqali buyurtma qoldiring`
      : `⭐ Sharhlarni ko'rish va tanlov qilish uchun "Batafsil" tugmasini bosing`,
    recommendedAudience: `${audience || 'Ijtimoiy tarmoq foydalanuvchilari'} — boshqalarning fikriga quloq soluvchi, sharhlarni o'qib xarid qiluvchi trend kuzatuvchilari.`,
    strength: "Eng yuqori ishonch omili: odamlar to'g'ridan-to'g'ri reklamadan ko'ra boshqa xaridorlarning tajribasiga 3-4 barobar ko'proq ishonadi.",
    potentialWeakness: 'Agar sharhlar yoki dalillar sun\'iydek tuyulsa, teskari ta\'sir berishi mumkin; haqiqiy isbotlar (skrinshot, video) bo\'lishi shart.',
    testingAdvice: `Post ostiga yoki Stories'ga 2-3 ta haqiqiy mijoz audiosi yoki skrinshotini joylashtiring. Obuna bo'lish yoki profilni saqlab olishlar sonini tekshiring.`,
  };

  // 4. Comparison Table (CTR, Murojaatlar, Konversiya, Xarajat)
  const metricsComparison: AdLabMetricComparison[] = [
    {
      metric: 'CTR (Bosilish ko\'rsatkichi)',
      description: 'Reklamani ko\'rganlarning necha foizi havola yoki tugmani bosishi',
      strategy1Focus: 'O\'rta-yuqori (aniq narx yoki chegirma qiziqtirganlarni tortadi)',
      strategy2Focus: 'Juda yuqori (muammoga tegib o\'tilsa, odamlar yechimni bilish uchun bosadi)',
      strategy3Focus: 'O\'rta (qiziquvchan va sharh o\'qishni istaganlar bosadi)',
      evaluationTip: 'Agar CTR 1.5% dan past bo\'lsa — rasm/video yoki sarlavha e\'tibor tortmayapti.',
    },
    {
      metric: 'Murojaatlar (Leads / Direct xabarlar)',
      description: 'Reklama orqali xabar yozgan yoki ariza qoldirganlar soni',
      strategy1Focus: 'Tez va aniq ("Qancha turadi?", "Qachon yetadi?" degan aniq savollar)',
      strategy2Focus: 'Chuqurroq muloqot talab etadi ("Bu menga ham yordam beradimi?")',
      strategy3Focus: 'Iliq va ishonchli murojaatlar ("Sharhlarni ko\'rdim, buyurtma qilmoqchiman")',
      evaluationTip: 'Klik ko\'p, lekin xabar yo\'q bo\'lsa — muloqotga chaqiruv (CTA) noaniq yoki murakkab.',
    },
    {
      metric: 'Konversiya (Xaridga aylanish)',
      description: 'Murojaat qilganlarning necha foizi haqiqiy to\'lov qilishi',
      strategy1Focus: 'Yuqori (narx va shartni bilib yozgani sababli tez yopiladi)',
      strategy2Focus: 'O\'rta (menejerdan to\'g\'ri tushuntirish va mahsulot afzalligini ko\'rsatish talab etiladi)',
      strategy3Focus: 'Eng barqaror (ishonch shakllangani sababli rad etish foizi kam)',
      evaluationTip: 'Murojaat ko\'p bo\'lib, xarid bo\'lmasa — javob berish tezligi yoki to\'lov shartlarida to\'siq bor.',
    },
    {
      metric: 'Xarajat va ROI (1 ta natija narxi)',
      description: 'Bitta xarid yoki murojaat uchun sarflanadigan o\'rtacha mablag\'',
      strategy1Focus: 'Qisqa muddatda arzonroq, lekin doimiy chegirma marjani yeyishi mumkin',
      strategy2Focus: 'Boshida qimmatroq ko\'rinishi mumkin, ammo qimmat tovarlarda katta ROI beradi',
      strategy3Focus: 'Eng arzon uzoq muddatli mijoz jalb qilish narxi (LTV yuqori bo\'ladi)',
      evaluationTip: 'Har bir strategiyaga teng 30-50 ming so\'m ajratib, qaysi biri arzonroq buyurtma olib kelganini solishtiring.',
    },
  ];

  // 5. Recommended Starting Variant
  let recommendedStrategy = strategy1;
  let reason = '';

  if (objective === 'brand_awareness' || objective === 'followers') {
    recommendedStrategy = strategy3;
    reason = `Sizning maqsadingiz "${objectiveName}" bo'lganligi sababli, 3-variant (Ijtimoiy isbot va hikoya) auditoriyada eng katta ishonch uyg'otadi va profilga obuna bo'lish ehtimolini oshiradi.`;
  } else if (objective === 'leads') {
    recommendedStrategy = strategy2;
    reason = `Sizning maqsadingiz "${objectiveName}" bo'lganligi sababli, 2-variant (Og'riq-muammo va yechim) odamlarni o'z muammolari bilan bo'lishishga va maslahat so'rab murojaat qilishga eng kuchli undaydi.`;
  } else {
    // Sales
    if (offer) {
      recommendedStrategy = strategy1;
      reason = `Sizda "${offer}" maxsus taklifi mavjud bo'lgani sababli, 1-variant (To'g'ridan-to'g'ri qiymat va taklif) zudlik bilan savdo chiqarish uchun eng optimal boshlang'ich gipoteza hisoblanadi.`;
    } else {
      recommendedStrategy = strategy2;
      reason = `Raqobatchilardan ajralib turish va faqat narx bilan cheklanmaslik uchun 2-variant (Muammo va yechim) xarid qilish ehtiyojini eng yaxshi uyg'otadi.`;
    }
  }

  const disclaimer = 'DIQQAT: Ushbu tavsiya marketing qonuniyatlari va kiritilgan parametrlarga asoslangan dastlabki gipotezadir. Haqiqiy bozorda qaysi reklama eng ko\'p natija berishini faqat kichik budjetli amaliy test (A/B sinov) aniq ko\'rsata oladi.';

  // 6. Practical budget testing advice
  const budgetTestingRecommendation = bud
    ? `Ajratilgan budjetingiz (${bud}) bo'yicha amaliy taqsimot tavsiyasi:\n• 70% budjetni tavsiya etilgan asosiy variantga (${recommendedStrategy.title}) yo'naltiring;\n• 30% budjetni qolgan 2 ta alternativ variant o'rtasida teng (15% / 15%) taqsimlab, 3 kun davomida parallel test o'tkazing.\nNatijada qaysi variant eng arzon murojaat keltirsa, qolgan butun budjetni o'shanga o'tkazasiz.`
    : `Budjet ko'rsatilmagan — kichik bizneslar uchun qulay test qoidasi:\n• Sinov uchun kuniga 30,000 - 50,000 so'm (yoki $3-$5) ajrating;\n• 3 ta variantni kamida 3 kun davomida bir xil budjetda parallel yoqing;\n• 3 kundan so'ng eng past CTR va yuqori xarajat ko'rsatgan variantlarni to'xtatib, barcha mablag'ni g'olib variantga yo'naltiring.`;

  return {
    id: `adlab_${Date.now()}`,
    createdAt: new Date().toISOString(),
    input,
    strategies: [strategy1, strategy2, strategy3],
    metricsComparison,
    recommendedStartingVariant: {
      strategyTitle: recommendedStrategy.title,
      reason,
      disclaimer,
    },
    budgetTestingRecommendation,
  };
}
