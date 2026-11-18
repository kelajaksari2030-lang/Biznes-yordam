import { resolveActivePaidPlan } from '../server/src/subscriptionAuthorization.js';
import { resolveActivePaidPlan as resolveCloudFunctionPaidPlan } from '../functions/src/subscriptionAuthorization';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

const now = new Date('2026-11-18T12:00:00.000Z');
const future = '2026-11-19T12:00:00.000Z';
const past = '2026-11-17T12:00:00.000Z';

assert(resolveActivePaidPlan('pro', 'active', future, now) === 'pro', 'Active Pro with future ISO expiry is allowed');
assert(resolveActivePaidPlan('ultra', 'active', new Date(future), now) === 'ultra', 'Active Ultra with future Date expiry is allowed');
assert(resolveActivePaidPlan('pro', 'active', past, now) === null, 'Expired paid plan falls back to Free');
assert(resolveActivePaidPlan('pro', 'expired', future, now) === null, 'Expired status cannot retain paid access');
assert(resolveActivePaidPlan('pro', 'active', null, now) === null, 'Missing expiry fails closed');
assert(resolveActivePaidPlan('ultra', 'active', 'not-a-date', now) === null, 'Malformed expiry fails closed');
assert(resolveActivePaidPlan('free', 'active', future, now) === null, 'Free plan never resolves as paid');
assert(resolveActivePaidPlan('pro', 'active', now, now) === null, 'Expiry at current instant is expired');

assert(resolveCloudFunctionPaidPlan('pro', 'active', future, now) === 'pro', 'Cloud Functions fallback allows active Pro with future expiry');
assert(resolveCloudFunctionPaidPlan('ultra', 'active', past, now) === null, 'Cloud Functions fallback rejects expired Ultra');
assert(resolveCloudFunctionPaidPlan('pro', 'active', null, now) === null, 'Cloud Functions fallback rejects missing expiry');
