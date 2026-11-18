import { summarizePaidSubscriptionProfiles } from '../server/src/subscriptionDataAudit.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error('FAIL: ' + message);
  console.log('PASS: ' + message);
}

const now = new Date('2026-11-18T12:00:00.000Z');
const summary = summarizePaidSubscriptionProfiles([
  { currentPlan: 'pro', subscriptionStatus: 'active', planExpiresAt: '2026-11-19T12:00:00.000Z' },
  { currentPlan: 'ultra', subscriptionStatus: 'active', planExpiresAt: null },
  { currentPlan: 'pro', subscriptionStatus: 'active', planExpiresAt: 'not-a-date' },
  { currentPlan: 'pro', subscriptionStatus: 'active', planExpiresAt: '2026-11-17T12:00:00.000Z' },
  { currentPlan: 'ultra', subscriptionStatus: 'expired', planExpiresAt: '2026-11-19T12:00:00.000Z' },
  { currentPlan: 'pro', subscriptionStatus: 'active', planExpiresAt: { toDate: () => new Date('2026-11-20T12:00:00.000Z') } },
], now);

assert(summary.totalPaidProfiles === 6, 'All paid-plan profiles are counted');
assert(summary.activeValid === 2, 'Future ISO and Firestore Timestamp expiries are valid');
assert(summary.activeMissingExpiry === 1, 'Missing expiry is isolated');
assert(summary.activeInvalidExpiry === 1, 'Malformed expiry is isolated');
assert(summary.activeExpired === 1, 'Elapsed expiry is isolated');
assert(summary.inactiveStatus === 1, 'Inactive subscription status is isolated');
