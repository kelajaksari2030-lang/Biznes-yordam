import type { Firestore } from 'firebase-admin/firestore';

export interface SubscriptionAuditSummary {
  totalPaidProfiles: number;
  activeValid: number;
  activeMissingExpiry: number;
  activeInvalidExpiry: number;
  activeExpired: number;
  inactiveStatus: number;
}

type PaidProfile = {
  currentPlan?: unknown;
  subscriptionStatus?: unknown;
  planExpiresAt?: unknown;
};

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
 * Produces aggregate-only diagnostics. It never returns user IDs or writes data.
 */
export function summarizePaidSubscriptionProfiles(
  profiles: PaidProfile[],
  now: Date = new Date()
): SubscriptionAuditSummary {
  const summary: SubscriptionAuditSummary = {
    totalPaidProfiles: profiles.length,
    activeValid: 0,
    activeMissingExpiry: 0,
    activeInvalidExpiry: 0,
    activeExpired: 0,
    inactiveStatus: 0,
  };

  for (const profile of profiles) {
    if (profile.subscriptionStatus !== 'active') {
      summary.inactiveStatus += 1;
      continue;
    }

    const rawExpiry = profile.planExpiresAt;
    if (rawExpiry === undefined || rawExpiry === null || rawExpiry === '') {
      summary.activeMissingExpiry += 1;
      continue;
    }

    const expiry = toExpiryDate(rawExpiry);
    if (!expiry) {
      summary.activeInvalidExpiry += 1;
    } else if (expiry.getTime() <= now.getTime()) {
      summary.activeExpired += 1;
    } else {
      summary.activeValid += 1;
    }
  }

  return summary;
}

export async function auditPaidSubscriptionProfiles(
  db: Firestore,
  now: Date = new Date()
): Promise<SubscriptionAuditSummary> {
  const snapshot = await db
    .collection('users')
    .where('currentPlan', 'in', ['pro', 'ultra'])
    .get();

  return summarizePaidSubscriptionProfiles(
    snapshot.docs.map((document) => document.data() as PaidProfile),
    now
  );
}
