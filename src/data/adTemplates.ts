/**
 * Deterministic local Uzbek marketing copy templates for Telegram and Instagram
 */

import { AdFormData } from '../types';

export function generateAdText(data: AdFormData): string {
  const {
    productName,
    targetAudience,
    keyBenefits,
    platform,
    tone,
    variant,
    specialOffer,
    contactInfo,
  } = data;

  const prod = productName.trim() || "Mahsulot / Xizmat";
  const audience = targetAudience.trim() || "Barcha qiziquvchilar";
  const benefitsList = keyBenefits
    .split(/[,;\n]+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const benefitsFormatted = benefitsList.length > 0
    ? benefitsList.map((b) => `  ✅ ${b}`).join('\n')
    : `  ✅ Yuqori sifat va ishonchlilik\n  ✅ Hamyonbop va qulay narx\n  ✅ Tezkor xizmat va kafolat`;

  const offer = specialOffer.trim()
    ? `🎁 Maxsus taklif: ${specialOffer.trim()}`
    : `⚡️ Bugun buyurtma beruvchilar uchun qulay shartlar mavjud!`;

  const contact = contactInfo.trim()
    ? contactInfo.trim()
    : `📞 Bog'lanish: +998 (__) ___-__-__\n📩 Telegram: @menejer_profil`;

  if (platform === 'telegram') {
    return generateTelegramAd({
      prod,
      audience,
      benefitsFormatted,
      tone,
      variant,
      offer,
      contact,
    });
  } else {
    return generateInstagramAd({
      prod,
      audience,
      benefitsFormatted,
      tone,
      variant,
      offer,
      contact,
    });
  }
}

interface TemplateParams {
  prod: string;
  audience: string;
  benefitsFormatted: string;
  tone: string;
  variant: string;
  offer: string;
  contact: string;
}

function generateTelegramAd({
  prod,
  audience,
  benefitsFormatted,
  tone,
  variant,
  offer,
  contact,
}: TemplateParams): string {
  if (variant === 'discount') {
    return `🔥 DIQQAT: ${prod.toUpperCase()} UCHUN KATTA AKSIYA!

${tone === 'formal' ? 'Hurmatli mijozlar!' : 'Assalomu alaykum azizlar!'} ${audience} uchun ajoyib imkoniyat!

Agar siz sifatli va ishonchli ${prod} izlayotgan bo'lsangiz, ayni vaqti:

${offer}

Nima uchun aynan bizni tanlashadi?
${benefitsFormatted}

🚚 O'zbekiston bo'ylab tezkor yetkazib berish xizmati mavjud.
📦 To'lovni mahsulotni qo'lingizga olgandan keyin amalga oshirishingiz mumkin.

⏰ Shoshiling, aksiya mahsulotlari soni cheklangan!

Buyurtma berish va ma'lumot olish uchun:
${contact}`;
  }

  if (variant === 'problem_solution') {
    return `💡 ${prod} — KUNDALIK MUAMMONING SAMARALI YECHIMI!

${audience} ko'pincha mos va ishonchli yechim topishda ikkilanishadi. Biz sizga vaqtingiz va mablag'ingizni tejaydigan qulay variantni taklif qilamiz:

🎯 ${prod} ning asosiy ustunliklari:
${benefitsFormatted}

${offer}

${tone === 'friendly' ? 'Doimo eng yaxshisini siz azizlar bilan ulashamiz.' : 'Har bir buyurtma uchun to\'liq sifat kafolati beriladi.'}

Buyurtma berish uchun hoziroq yozing:
${contact}`;
  }

  if (variant === 'social_proof') {
    return `⭐️ MIJOZLARIMIZ TANLOVI: ${prod.toUpperCase()}

${tone === 'formal' ? 'Kompaniyamiz ko\'p yillik tajribasi bilan' : 'Bizning do\'konimizda'} yuzlab xaridorlar mehrini qozongan ${prod} yana sotuvda!

Kimlar uchun tavsiya etiladi?
👉 ${audience} uchun eng ma'qul tanlov.

Afzalliklari:
${benefitsFormatted}

${offer}

🚚 Viloyatlarga pochta yoki kuryer orqali xavfsiz yetkaziladi.

Batafsil ma'lumot va zakaz uchun:
${contact}`;
  }

  // Classic default
  return `✨ ${prod.toUpperCase()} — SIFAT VA QULAYLIK BIR JOYDA!

${tone === 'formal' ? 'Hurmatli xaridorlar!' : 'Salom aziz do\'stlar!'} Sizga ${audience} orasida katta talabga ega bo'lgan ${prod}ni taqdim etamiz.

Nima uchun bu aynan sizga kerak?
${benefitsFormatted}

${offer}

📦 To'lov usullari: Payme, Click yoki naqd (yetkazilganda).
📍 Kafolatlangan asl mahsulot.

Savollaringiz bormi yoki buyurtma bermoqchimisiz?
${contact}`;
}

function generateInstagramAd({
  prod,
  audience,
  benefitsFormatted,
  tone,
  variant,
  offer,
  contact,
}: TemplateParams): string {
  const hashtags = `#uzbekistan #toshkent #savdo #${prod.toLowerCase().replace(/[^a-z0-9]/gi, '')} #onlaynsavdo #sifatli #foydali #biznesuz`;

  if (variant === 'discount') {
    return `💥 Kutilmagan chegirma va ajoyib taklif!

${audience} diqqatiga! Siz uzoq vaqt kutgan ${prod} bo'yicha maxsus chegirmalar haftaligi boshlandi.

Nega aynan hozir xarid qilish kerak?
${benefitsFormatted}

${offer}

📲 Buyurtma berish juda oson:
1. Ushbu postga layk bosing va do'stingizga yuboring
2. Bizga Direkt (Direct) orqali yozing yoki bio dagi raqamga qo'ng'iroq qiling!

${contact}

.
.
${hashtags}`;
  }

  if (variant === 'problem_solution') {
    return `Ikkilanish va noqulayliklarga chek qo'ying! 👇

Ko'pchilik ${audience} to'g'ri tanlov qilishda qiynalishadi. Lekin endi buning oson yechimi bor:

${prod} sizga nima beradi?
${benefitsFormatted}

${offer}

${tone === 'friendly' ? 'O\'zingiz va yaqinlaringiz uchun bugunoq qulaylik yarating! ✨' : 'Har bir mijozimizga individual va professional yondashamiz.'}

💬 Narxini bilish yoki buyurtma qilish uchun izohlarda "+" qoldiring yoki Direktga yozing!

${hashtags}`;
  }

  // Classic Instagram post
  return `Orzungizdagi sifat va qulaylik! 🌟

${audience} uchun maxsus saralangan ${prod} bilan tanishing.

Nimasi bilan boshqalardan ajralib turadi?
${benefitsFormatted}

${offer}

📍 Shahar bo'ylab va barcha viloyatlarga yetkazib berish xizmati mavjud.
💳 Qulay to'lov turlari.

Batafsil ma'lumot olish uchun hoziroq Direktga yozing yoki profil sarlavhasidagi havola orqali bog'laning!

${contact}

.
.
${hashtags}`;
}
