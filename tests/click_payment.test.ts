/**
 * BiznesYordam - Click Payment & Signature Verification Test Suite
 * 
 * Verifies:
 * 1. MD5 Signature calculation for Prepare (action=0) and Complete (action=1)
 * 2. Plan prices and strict amount enforcement
 * 3. Error code definitions and descriptions
 * 4. Payment redirection URL parameter formatting
 */

import {
  calculateMd5,
  generatePrepareSignature,
  generateCompleteSignature,
  generateClickPaymentUrl,
  PLAN_PRICES,
  CLICK_ERRORS,
  PaidPlanType,
} from '../server/src/clickService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING CLICK PAYMENT TEST SUITE');
console.log('====================================================');

// ----------------------------------------------------
// 1. MD5 Hash Calculation Tests
// ----------------------------------------------------
console.log('\n--- 1. MD5 Hash Calculation ---');

const knownString = '123456789SecretKey1000';
const expectedMd5 = calculateMd5(knownString);
assert(typeof expectedMd5 === 'string' && expectedMd5.length === 32, 'MD5 hash produces 32-character hex string');
assert(expectedMd5 === calculateMd5(knownString), 'MD5 hashing is deterministic');

// ----------------------------------------------------
// 2. Prepare Signature Generation Tests
// ----------------------------------------------------
console.log('\n--- 2. Prepare Signature Generation ---');

const clickTransId = '100200300';
const serviceId = '12345';
const secretKey = 'my_click_secret';
const merchantTransId = 'ord_123456';
const amount = '79000';
const actionPrepare = '0';
const signTime = '2026-10-29 10:00:00';

const prepareSig = generatePrepareSignature(
  clickTransId,
  serviceId,
  secretKey,
  merchantTransId,
  amount,
  actionPrepare,
  signTime
);

const manualRawPrepare = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${amount}${actionPrepare}${signTime}`;
const expectedPrepareSig = calculateMd5(manualRawPrepare);

assert(prepareSig === expectedPrepareSig, 'Prepare signature matches Click specification formula');

// ----------------------------------------------------
// 3. Complete Signature Generation Tests
// ----------------------------------------------------
console.log('\n--- 3. Complete Signature Generation ---');

const merchantPrepareId = 'ord_123456';
const actionComplete = '1';

const completeSig = generateCompleteSignature(
  clickTransId,
  serviceId,
  secretKey,
  merchantTransId,
  merchantPrepareId,
  amount,
  actionComplete,
  signTime
);

const manualRawComplete = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${merchantPrepareId}${amount}${actionComplete}${signTime}`;
const expectedCompleteSig = calculateMd5(manualRawComplete);

assert(completeSig === expectedCompleteSig, 'Complete signature matches Click specification formula');

// ----------------------------------------------------
// 4. Server-Side Plan Price Enforcement
// ----------------------------------------------------
console.log('\n--- 4. Server-Side Plan Price Enforcement ---');

assert(PLAN_PRICES.pro.amount === 79000, 'Pro plan price is strictly 79,000 UZS');
assert(PLAN_PRICES.ultra.amount === 189000, 'Ultra plan price is strictly 189,000 UZS');
assert(PLAN_PRICES.pro.durationDays === 30, 'Pro plan duration is 30 days');
assert(PLAN_PRICES.ultra.durationDays === 30, 'Ultra plan duration is 30 days');

// ----------------------------------------------------
// 5. Click Error Code Specifications
// ----------------------------------------------------
console.log('\n--- 5. Click Error Codes ---');

assert(CLICK_ERRORS.SUCCESS === 0, 'SUCCESS code is 0');
assert(CLICK_ERRORS.SIGN_CHECK_FAILED === -1, 'SIGN_CHECK_FAILED code is -1');
assert(CLICK_ERRORS.INCORRECT_AMOUNT === -2, 'INCORRECT_AMOUNT code is -2');
assert(CLICK_ERRORS.ALREADY_PAID === -4, 'ALREADY_PAID code is -4');
assert(CLICK_ERRORS.USER_NOT_FOUND === -5, 'USER_NOT_FOUND code is -5');
assert(CLICK_ERRORS.TRANSACTION_CANCELLED === -9, 'TRANSACTION_CANCELLED code is -9');

// ----------------------------------------------------
// 6. Click Payment URL Generation
// ----------------------------------------------------
console.log('\n--- 6. Click Payment URL Generation ---');

process.env.CLICK_SERVICE_ID = '12345';
process.env.CLICK_MERCHANT_ID = '67890';

const paymentUrl = generateClickPaymentUrl('ord_999', 79000, 'https://besto.uz');
assert(paymentUrl.includes('https://my.click.uz/services/pay'), 'Payment URL points to my.click.uz service endpoint');
assert(paymentUrl.includes('service_id=12345'), 'Payment URL includes service_id');
assert(paymentUrl.includes('merchant_id=67890'), 'Payment URL includes merchant_id');
assert(paymentUrl.includes('amount=79000'), 'Payment URL includes exact amount');
assert(paymentUrl.includes('transaction_param=ord_999'), 'Payment URL includes order transaction_param');

console.log('====================================================');
console.log('🏁 ALL CLICK PAYMENT TESTS PASSED SUCCESSFULLY');
console.log('====================================================\n');
