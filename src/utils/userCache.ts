/**
 * Per-user scoped localStorage cache helpers.
 * Prevents cross-account data leakage when switching or signing out of accounts.
 */

const SCOPED_PREFIX = 'besto_cache_';

const LEGACY_UNSCOPED_KEYS = [
  'biznes_orders_cache',
  'biznes_inventory_cache',
  'biznes_crm_cache',
  'biznes_finance_cache',
  'biznes_saved_drafts',
  'biznes_saved_calculations',
  'biznes_saved_diagnostics',
  'biznes_saved_ad_lab_tests',
  'biznes_today_navigator_plan',
  'biznes_business_profile',
  'biznes_reply_templates',
  'biznes_quick_variables',
];

export function getScopedCacheKey(baseKey: string, userId?: string | null): string {
  const uid = (userId || '').trim();
  if (!uid) return '';
  return `${SCOPED_PREFIX}${uid}_${baseKey}`;
}

export function readScopedCache<T>(baseKey: string, userId?: string | null): T | null {
  const key = getScopedCacheKey(baseKey, userId);
  if (!key || typeof window === 'undefined' || !window.localStorage) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeScopedCache(
  baseKey: string,
  userId: string | undefined | null,
  value: unknown
): void {
  const key = getScopedCacheKey(baseKey, userId);
  if (!key || typeof window === 'undefined' || !window.localStorage) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota safety
  }
}

export function removeScopedCache(baseKey: string, userId?: string | null): void {
  const key = getScopedCacheKey(baseKey, userId);
  if (!key || typeof window === 'undefined' || !window.localStorage) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearLegacyUnscopedCaches(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    for (const key of LEGACY_UNSCOPED_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function clearAllUserBusinessCaches(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    clearLegacyUnscopedCaches();

    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (
        k &&
        (k.startsWith(SCOPED_PREFIX) ||
          k.startsWith('biznes_') ||
          k.startsWith('besto_settings_'))
      ) {
        keysToRemove.push(k);
      }
    }

    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}
