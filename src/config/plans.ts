/**
 * BiznesYordam - Centralized Plan Entitlements Configuration
 * Defines Free, Pro, and Ultra plan tiers and authoritative limits
 */

export const ADMIN_EMAIL = 'kelajaksari2030@gmail.com';

export type SimulatedTier = 'admin' | 'free' | 'pro' | 'ultra';

export function isAdminUser(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export interface PlanEntitlements {
  id: 'free' | 'pro' | 'ultra' | 'admin';
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

export const ADMIN_PLAN: PlanEntitlements = {
  id: 'admin',
  name: 'Admin (Cheksiz)',
  badge: 'Admin',
  priceMonthlySom: 0,
  priceLabel: '0 so\'m (Admin)',
  dailyAdLimit: 999999,
  customTemplateLimit: 999999,
  description: 'Barcha Pro va Ultra imkoniyatlariga to\'liq va cheksiz kirish',
  features: [
    'Cheksiz kunlik reklama matnlari',
    'Cheksiz shaxsiy javob shablonlari',
    'Barcha Pro va Ultra eksklyuziv modullarga ruxsat',
    'CRM, Ombor, Savdo va Moliya modullariga to\'liq kirish',
  ],
};

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

/**
 * Authoritatively determines whether a given plan tier is entitled to export financial reports to CSV.
 * - Free: false (blocked)
 * - Pro: true (allowed)
 * - Ultra: true (allowed)
 * - Admin: true (allowed)
 */
export function canExportFinancialReports(planId?: string | null): boolean {
  if (!planId) return false;
  return planId === 'pro' || planId === 'ultra' || planId === 'admin';
}

/**
 * Authoritatively determines whether a given plan tier is entitled to the Ultra Business Forecast module.
 * - Free: false (blocked)
 * - Pro: false (blocked)
 * - Ultra: true (allowed)
 * - Admin: true (allowed)
 */
export function canAccessBusinessForecast(planId?: string | null): boolean {
  if (!planId) return false;
  return planId === 'ultra' || planId === 'admin';
}


