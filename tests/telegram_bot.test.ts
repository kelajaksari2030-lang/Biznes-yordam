/**
 * BESTO Telegram Bot Integration Test Suite
 * Tests 8-character verification code generation, alphabet compliance,
 * regex match against Firestore security rules, deep link URL structure,
 * and 10-minute expiry calculations.
 */

import {
  generateTelegramLinkCode,
  getTelegramBotStartUrl,
  TELEGRAM_CODE_ALPHABET,
  TELEGRAM_BOT_USERNAME,
  LINK_CODE_VALIDITY_MS,
} from '../src/services/telegramBotService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING BESTO TELEGRAM BOT LINKING TEST SUITE');
console.log('====================================================');

// 1. Code Generation & Alphabet Tests
console.log('\n--- 1. Link Code Alphabet & Length Tests ---');
const allowedAlphabetSet = new Set(TELEGRAM_CODE_ALPHABET.split(''));
const forbiddenChars = ['0', 'O', '1', 'I'];

assert(TELEGRAM_CODE_ALPHABET === 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 'Alphabet matches specification ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
assert(TELEGRAM_CODE_ALPHABET.length === 32, 'Alphabet has exactly 32 distinct characters (base32 Crockford subset)');

for (let i = 0; i < 20; i++) {
  const code = generateTelegramLinkCode();
  assert(code.length === 8, `Code iteration ${i + 1} length is exactly 8 characters ("${code}")`);
  
  // Verify all chars belong to the allowed alphabet
  const allCharsValid = code.split('').every((ch) => allowedAlphabetSet.has(ch));
  assert(allCharsValid, `Code "${code}" only uses allowed characters`);

  // Verify no forbidden ambiguous chars
  const hasForbidden = forbiddenChars.some((ch) => code.includes(ch));
  assert(!hasForbidden, `Code "${code}" does not contain confusing characters (0, O, 1, I)`);

  // Verify strict match with Firestore security rules regex: [A-Z0-9]{8}
  const matchesFirestoreRuleRegex = /^[A-Z0-9]{8}$/.test(code);
  assert(matchesFirestoreRuleRegex, `Code "${code}" matches Firestore rule pattern [A-Z0-9]{8}`);
}

// 2. Deep Link URL Tests
console.log('\n--- 2. Bot Deep Link Generation Tests ---');
const sampleCode = 'H7K9MN42';
const startUrl = getTelegramBotStartUrl(sampleCode);

assert(TELEGRAM_BOT_USERNAME === 'Bestouzbbot', 'Bot username is Bestouzbbot');
assert(startUrl === 'https://t.me/Bestouzbbot?start=H7K9MN42', 'Start URL correctly matches https://t.me/Bestouzbbot?start=H7K9MN42');

// 3. Expiry & Timing Constants
console.log('\n--- 3. Expiry & Timing Calculations ---');
assert(LINK_CODE_VALIDITY_MS === 10 * 60 * 1000, 'Link code validity is exactly 10 minutes (600,000 ms)');

const simulatedNow = Date.now();
const simulatedExpiresAt = simulatedNow + LINK_CODE_VALIDITY_MS;
const diffSeconds = Math.round((simulatedExpiresAt - simulatedNow) / 1000);
assert(diffSeconds === 600, 'Calculated expiry delta is exactly 600 seconds');

console.log('\n====================================================');
console.log('🏁 ALL TELEGRAM BOT TESTS PASSED SUCCESSFULLY!');
console.log('====================================================\n');
