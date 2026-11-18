import { resolveAuthorizedQuota } from '../functions/src/subscriptionAuthorization';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error('FAIL: ' + message);
  console.log('PASS: ' + message);
}

const now = new Date('2026-11-18T12:00:00.000Z');
const admin = resolveAuthorizedQuota('pro', 'active', null, true, now);
assert(admin.plan === 'ultra' && admin.dailyLimit === 999999, 'Admin custom claim preserves unlimited backend quota despite missing expiry');

const pro = resolveAuthorizedQuota('pro', 'active', '2026-11-19T12:00:00.000Z', false, now);
assert(pro.plan === 'pro' && pro.dailyLimit === 50, 'Valid Pro subscription keeps Pro quota');

const missingExpiry = resolveAuthorizedQuota('pro', 'active', null, false, now);
assert(missingExpiry.plan === 'free' && missingExpiry.dailyLimit === 5, 'Non-admin paid profile without expiry fails closed to Free');
