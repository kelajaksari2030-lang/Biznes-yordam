export type PaidPlan = 'pro' | 'ultra';

function toExpiryDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === 'function') {
      const parsed = toDate.call(value);
      if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

export function resolveActivePaidPlan(
  plan: unknown,
  subscriptionStatus: unknown,
  planExpiresAt: unknown,
  now: Date = new Date()
): PaidPlan | null {
  if ((plan !== 'pro' && plan !== 'ultra') || subscriptionStatus !== 'active') return null;
  const expiry = toExpiryDate(planExpiresAt);
  return expiry && expiry.getTime() > now.getTime() ? plan : null;
}

export type AuthorizedPlan = 'free' | 'pro' | 'ultra';

export interface AuthorizedQuota {
  plan: AuthorizedPlan;
  dailyLimit: number;
}

/**
 * Server-verified admin claims bypass paid-plan expiry and retain the admin quota.
 * Non-admin users must have an active paid plan with a valid future expiry.
 */
export function resolveAuthorizedQuota(
  plan: unknown,
  subscriptionStatus: unknown,
  planExpiresAt: unknown,
  isAdmin: boolean,
  now: Date = new Date()
): AuthorizedQuota {
  if (isAdmin) return { plan: 'ultra', dailyLimit: 999999 };

  const activePaidPlan = resolveActivePaidPlan(
    plan,
    subscriptionStatus,
    planExpiresAt,
    now
  );

  if (activePaidPlan === 'pro') return { plan: 'pro', dailyLimit: 50 };
  if (activePaidPlan === 'ultra') return { plan: 'ultra', dailyLimit: 200 };
  return { plan: 'free', dailyLimit: 5 };
}
