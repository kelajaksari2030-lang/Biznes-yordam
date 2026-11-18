export type PaidPlan = 'pro' | 'ultra';

function toExpiryDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

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

/**
 * Paid access is valid only while status is active and a valid expiry is in the future.
 * Missing, null, malformed, or elapsed expiry values fail closed to the Free plan.
 */
export function resolveActivePaidPlan(
  plan: unknown,
  subscriptionStatus: unknown,
  planExpiresAt: unknown,
  now: Date = new Date()
): PaidPlan | null {
  if (plan !== 'pro' && plan !== 'ultra') return null;
  if (subscriptionStatus !== 'active') return null;

  const expiry = toExpiryDate(planExpiresAt);
  if (!expiry || expiry.getTime() <= now.getTime()) return null;

  return plan;
}
