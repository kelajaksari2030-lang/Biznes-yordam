/**
 * BiznesYordam - Unified Business Profile Test Suite
 * Validates businessService inputs, doc path (/users/{userId}/businessProfile/main),
 * security rules constraints, and UI integration.
 */

import { validateBusinessProfileInput, BUSINESS_PROFILE_DOC_ID } from '../src/services/businessService';
import fs from 'fs';
import path from 'path';

function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING BIZNESYORDAM BUSINESS PROFILE TEST SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Doc ID & Path constant test
  assert(BUSINESS_PROFILE_DOC_ID === 'main', 'BusinessProfile doc ID must strictly be "main"');

  // 2. Input validation tests
  const validResult = validateBusinessProfileInput({
    companyName: "Rayhon Fashion",
    category: "Kiyim va poyabzal do'koni",
    targetAudience: "Toshkent va viloyatlardagi ayollar",
    currency: 'UZS',
  });
  assert(validResult.isValid && validResult.errors.length === 0, 'Valid business profile input passes validation');

  const emptyNameResult = validateBusinessProfileInput({
    companyName: "",
    category: "Kiyim do'koni",
    targetAudience: "Aholisi",
  });
  assert(!emptyNameResult.isValid && emptyNameResult.errors.some(e => e.includes("Kompaniya")), 'Empty companyName fails validation');

  const invalidCurrencyResult = validateBusinessProfileInput({
    companyName: "Test Shop",
    category: "Retail",
    targetAudience: "Public",
    currency: 'EUR' as any,
  });
  assert(!invalidCurrencyResult.isValid && invalidCurrencyResult.errors.some(e => e.includes("Valyuta")), 'Invalid currency code fails validation');

  // 3. Check firestore.rules file contents
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  assert(
    rulesContent.includes('match /businessProfile/{docId}'),
    'firestore.rules contains match rule for /businessProfile/{docId}'
  );

  assert(
    rulesContent.includes('allow get, list: if isOwner(userId)'),
    'firestore.rules enforces isOwner(userId) for reads'
  );

  assert(
    rulesContent.includes('allow create, update: if isOwner(userId) && incoming().userId == userId'),
    'firestore.rules enforces isOwner(userId) and incoming().userId == userId for writes'
  );

  // 4. Check BusinessDiagnostics JSX for "Profilimdan yuklash" button and click handler
  const diagPath = path.resolve(process.cwd(), 'src/components/BusinessDiagnostics.tsx');
  const diagContent = fs.readFileSync(diagPath, 'utf8');

  assert(
    diagContent.includes('Profilimdan yuklash'),
    'BusinessDiagnostics.tsx contains "Profilimdan yuklash" button text'
  );

  assert(
    diagContent.includes('handleLoadFromProfile'),
    'BusinessDiagnostics.tsx attaches handleLoadFromProfile to button'
  );

  assert(
    diagContent.includes('getBusinessProfile'),
    'BusinessDiagnostics.tsx calls getBusinessProfile from businessService'
  );

  // 5. Check BusinessProfileModal & App.tsx rendering
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  assert(
    appContent.includes('BusinessProfileModal'),
    'App.tsx imports and renders BusinessProfileModal'
  );

  assert(
    appContent.includes('isBusinessProfileOpen'),
    'App.tsx controls isBusinessProfileOpen state'
  );

  // 6. Check BusinessProfileModal.tsx responsive mobile viewport and scroll lock
  const modalPath = path.resolve(process.cwd(), 'src/components/BusinessProfileModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf8');

  assert(
    modalContent.includes('max-h-[calc(100dvh-24px)]'),
    'BusinessProfileModal.tsx uses 100dvh viewport height safety cap for mobile Chrome/Android'
  );

  assert(
    modalContent.includes("document.body.style.overflow = 'hidden'"),
    'BusinessProfileModal.tsx locks document body overflow when open to prevent background scrolling'
  );

  assert(
    modalContent.includes('overflow-y-auto'),
    'BusinessProfileModal.tsx enforces internal scroll container for form content'
  );

  console.log('====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
