/**
 * BiznesYordam - Centralized Plan Entitlements Configuration
 * Defines Free, Pro, and Ultra plan tiers and authoritative limits
 */

export interface PlanEntitlements {
  id: 'free' | 'pro' | 'ultra';
  name: string;
  badge: string;
  priceMonthlySom: number;
  priceLabel: string;
  dailyAdLimit: number;
  customTemplateLimit: number;
  description: string;
  isPopular?: boolean;
  features: string[];
}

export const PLANS: Record<'free' | 'pro' | 'ultra', PlanEntitlements> = {
  free: {
    id: 'free',
    name: 'Bepul (Free)',
    badge: 'Boshlang\'ich',
    priceMonthlySom: 0,
    priceLabel: '0 so\'m / oy',
    dailyAdLimit: 5,
    customTemplateLimit: 3,
    description: 'Yangi ish boshlagan va sinovdan o\'tkazayotgan tadbirkorlar uchun',
    features: [
      'Kunlik 5 tagacha reklama matni yaratish',
      '3 tagacha shaxsiy javob shablonini saqlash',
      'Telegram va Instagram formatlari',
      'Foyda va marja kalkulyatori (to\'liq hisob)',
      '8 ta tayyor mijoz javoblari andozasi',
      'Hisobotlarni matn sifatida nusxalash',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    badge: 'Eng ommabop',
    priceMonthlySom: 79000,
    priceLabel: '79 000 so\'m / oy',
    dailyAdLimit: 50,
    customTemplateLimit: 25,
    description: 'Faol savdo qiluvchi va kunlik mijozlar oqimiga ega do\'konlar uchun',
    isPopular: true,
    features: [
      'Kunlik 50 tagacha reklama matni yaratish',
      '25 tagacha shaxsiy javob shablonini saqlash',
      'Barcha reklama uslublari (aksiya, muammo-yechim, xaridorlar tanlovi)',
      'Cheksiz hisob-kitoblar va taqqoslash',
      'Doimiy xarajatlar va zararsizlik nuqtasi tahlili',
      'Tezkor mijozlarni qo\'llab-quvvatlash',
    ],
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra',
    badge: 'Maksimal imkoniyat',
    priceMonthlySom: 189000,
    priceLabel: '189 000 so\'m / oy',
    dailyAdLimit: 200,
    customTemplateLimit: 100,
    description: 'Katta tovar aylanmasiga ega brendlar, agentliklar va jamoalar uchun',
    features: [
      'Kunlik 200 tagacha reklama matni yaratish',
      'Cheksiz (100+) shaxsiy javob shablonlari',
      'Jamoaviy foydalanish va kengaytirilgan eksport',
      'Yangi marketing andozalariga birinchi bo\'lib kirish',
      'Shaxsiy konsultant bilan bog\'lanish imkoniyati',
    ],
  },
};

export const DEFAULT_PLAN = PLANS.free;
