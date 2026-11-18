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
