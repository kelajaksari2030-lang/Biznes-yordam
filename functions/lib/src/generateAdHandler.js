"use strict";
/**
 * Authoritative Server-Side Ad Generation & Quota Handler for Firebase Cloud Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_DAILY_LIMITS = exports.TIMEZONE = void 0;
exports.getTashkentDateKey = getTashkentDateKey;
exports.generateAdText = generateAdText;
exports.TIMEZONE = 'Asia/Tashkent';
exports.PLAN_DAILY_LIMITS = {
    free: 5,
    pro: 50,
    ultra: 200,
};
function getTashkentDateKey(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: exports.TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(date);
}
function generateAdText(data) {
    const { productName, targetAudience, keyBenefits, platform, tone, variant, specialOffer, contactInfo, } = data;
    const prod = (productName || '').trim() || 'Mahsulot / Xizmat';
    const audience = (targetAudience || '').trim() || 'Barcha qiziquvchilar';
    const benefitsList = (keyBenefits || '')
        .split(/[,;\n]+/)
        .map((b) => b.trim())
        .filter(Boolean);
    const benefitsFormatted = benefitsList.length > 0
        ? benefitsList.map((b) => `  ✅ ${b}`).join('\n')
        : `  ✅ Yuqori sifat va ishonchlilik\n  ✅ Hamyonbop va qulay narx\n  ✅ Tezkor xizmat va kafolat`;
    const offer = (specialOffer || '').trim()
        ? `🎁 Maxsus taklif: ${(specialOffer || '').trim()}`
        : `⚡️ Bugun buyurtma beruvchilar uchun qulay shartlar mavjud!`;
    const contact = (contactInfo || '').trim()
        ? (contactInfo || '').trim()
        : `📞 Bog'lanish: +998 (__) ___-__-__\n📩 Telegram: @menejer_profil`;
    if (platform === 'telegram') {
        if (variant === 'discount') {
            return `🔥 DIQQAT: ${prod.toUpperCase()} UCHUN KATTA AKSIYA!\n\n${tone === 'formal' ? 'Hurmatli mijozlar!' : 'Assalomu alaykum azizlar!'} ${audience} uchun ajoyib imkoniyat!\n\nAgar siz sifatli va ishonchli ${prod} izlayotgan bo'lsangiz, ayni vaqti:\n\n${offer}\n\nNima uchun aynan bizni tanlashadi?\n${benefitsFormatted}\n\n🚚 O'zbekiston bo'ylab tezkor yetkazib berish xizmati mavjud.\n📦 To'lovni mahsulotni qo'lingizga olgandan keyin amalga oshirishingiz mumkin.\n\n⏰ Shoshiling, aksiya mahsulotlari soni cheklangan!\n\nBuyurtma berish va ma'lumot olish uchun:\n${contact}`;
        }
        if (variant === 'problem_solution') {
            return `💡 ${prod} — KUNDALIK MUAMMONING SAMARALI YECHIMI!\n\n${audience} ko'pincha mos va ishonchli yechim topishda ikkilanishadi. Biz sizga vaqtingiz va mablag'ingizni tejaydigan qulay variantni taklif qilamiz:\n\n🎯 ${prod} ning asosiy ustunliklari:\n${benefitsFormatted}\n\n${offer}\n\n${tone === 'friendly' ? "Doimo eng yaxshisini siz azizlar bilan ulashamiz." : "Har bir buyurtma uchun to'liq sifat kafolati beriladi."}\n\nBuyurtma berish uchun hoziroq yozing:\n${contact}`;
        }
        if (variant === 'social_proof') {
            return `⭐️ MIJOZLARIMIZ TANLOVI: ${prod.toUpperCase()}\n\n${tone === 'formal' ? "Kompaniyamiz ko'p yillik tajribasi bilan" : "Bizning do'konimizda"} yuzlab xaridorlar mehrini qozongan ${prod} yana sotuvda!\n\nKimlar uchun tavsiya etiladi?\n👉 ${audience} uchun eng ma'qul tanlov.\n\nAfzalliklari:\n${benefitsFormatted}\n\n${offer}\n\n🚚 Viloyatlarga pochta yoki kuryer orqali xavfsiz yetkaziladi.\n\nBatafsil ma'lumot va zakaz uchun:\n${contact}`;
        }
        return `✨ ${prod.toUpperCase()} — SIFAT VA QULAYLIK BIR JOYDA!\n\n${tone === 'formal' ? 'Hurmatli xaridorlar!' : "Salom aziz do'stlar!"} Sizga ${audience} orasida katta talabga ega bo'lgan ${prod}ni taqdim etamiz.\n\nNima uchun bu aynan sizga kerak?\n${benefitsFormatted}\n\n${offer}\n\n📦 To'lov usullari: Payme, Click yoki naqd (yetkazilganda).\n📍 Kafolatlangan asl mahsulot.\n\nSavollaringiz bormi yoki buyurtma bermoqchimisiz?\n${contact}`;
    }
    else {
        const hashtags = `#uzbekistan #toshkent #savdo #${prod.toLowerCase().replace(/[^a-z0-9]/gi, '')} #onlaynsavdo #sifatli #foydali #biznesuz`;
        if (variant === 'discount') {
            return `💥 Kutilmagan chegirma va ajoyib taklif!\n\n${audience} diqqatiga! Siz uzoq vaqt kutgan ${prod} bo'yicha maxsus chegirmalar haftaligi boshlandi.\n\nNega aynan hozir xarid qilish kerak?\n${benefitsFormatted}\n\n${offer}\n\n📲 Buyurtma berish juda oson:\n1. Ushbu postga layk bosing va do'stingizga yuboring\n2. Bizga Direkt (Direct) orqali yozing yoki bio dagi raqamga qo'ng'iroq qiling!\n\n${contact}\n\n.\n.\n${hashtags}`;
        }
        if (variant === 'problem_solution') {
            return `Ikkilanish va noqulayliklarga chek qo'ying! 👇\n\nKo'pchilik ${audience} to'g'ri tanlov qilishda qiynalishadi. Lekin endi buning oson yechimi bor:\n\n${prod} sizga nima beradi?\n${benefitsFormatted}\n\n${offer}\n\n${tone === 'friendly' ? "O'zingiz va yaqinlaringiz uchun bugunoq qulaylik yarating! ✨" : "Har bir mijozimizga individual va professional yondashamiz."}\n\n💬 Narxini bilish yoki buyurtma qilish uchun izohlarda "+" qoldiring yoki Direktga yozing!\n\n${hashtags}`;
        }
        return `Orzungizdagi sifat va qulaylik! 🌟\n\n${audience} uchun maxsus saralangan ${prod} bilan tanishing.\n\nNimasi bilan boshqalardan ajralib turadi?\n${benefitsFormatted}\n\n${offer}\n\n📍 Shahar bo'ylab va barcha viloyatlarga yetkazib berish xizmati mavjud.\n💳 Qulay to'lov turlari.\n\nBatafsil ma'lumot olish uchun hoziroq Direktga yozing yoki profil sarlavhasidagi havola orqali bog'laning!\n\n${contact}\n\n.\n.\n${hashtags}`;
    }
}
//# sourceMappingURL=generateAdHandler.js.map