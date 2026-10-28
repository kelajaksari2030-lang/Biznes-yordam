/**
 * BiznesYordam - Daily Ad Generation Quota & Concurrency Test Suite
 * 
 * Verifies:
 * 1. Free limit: 5 allowed, 6th rejected
 * 2. Pro limit: 50 allowed, 51st rejected
 * 3. Ultra limit: 200 allowed, 201st rejected
 * 4. Concurrency test: Race condition prevention via atomic transaction
 * 5. Day rollover: Midnight Tashkent time quota reset
 * 6. Unauthenticated rejection
 * 7. Privilege escalation resistance (ignoring client-passed plan)
 * 8. Expired subscription downgrade to Free
 */

import {
  executeQuotaEnforcedAdGeneration,
  getTashkentDateKey,
  PLAN_DAILY_LIMITS,
  QuotaError,
  TransactionalStore,
  StoreTransaction,
} from '../src/server/generateAdCore';

// In-Memory Transactional Store with simulated locks for atomic concurrency testing
class MockFirestoreStore implements TransactionalStore {
  public users: Map<string, { currentPlan?: string; subscriptionStatus?: string; email?: string }> = new Map();
  public usage: Map<string, { adCount: number; lastGeneratedAt: string }> = new Map();
  
  private lock: Promise<void> = Promise.resolve();

  async runTransaction<T>(updateFunction: (transaction: StoreTransaction) => Promise<T>): Promise<T> {
    // Acquire transaction lock
    let releaseLock: () => void;
    const previousLock = this.lock;
    this.lock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await previousLock;

    try {
      const tx: StoreTransaction = {
        getUserProfile: async (userId: string) => {
          const profile = this.users.get(userId);
          return profile ? { ...profile } : null;
        },
        getDailyUsage: async (userId: string, dateKey: string) => {
          const key = `${userId}/${dateKey}`;
          const rec = this.usage.get(key);
          return rec ? { ...rec } : null;
        },
        incrementDailyUsage: async (userId: string, dateKey: string, newCount: number) => {
          const key = `${userId}/${dateKey}`;
          this.usage.set(key, {
            adCount: newCount,
            lastGeneratedAt: new Date().toISOString(),
          });
        },
      };

      return await updateFunction(tx);
    } finally {
      releaseLock!();
    }
  }
}

const sampleFormData = {
  productName: 'Erkaklar klassik soati',
  targetAudience: 'Erkaklar',
  keyBenefits: 'Tezkor yetkazib berish\nKafolat',
  platform: 'telegram' as const,
  tone: 'friendly' as const,
  variant: 'classic' as const,
  specialOffer: '10% chegirma',
  contactInfo: '+998901234567',
};

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING BIZNESYORDAM QUOTA ENFORCEMENT TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // --- Test 1: Unauthenticated rejection ---
  {
    const store = new MockFirestoreStore();
    try {
      await executeQuotaEnforcedAdGeneration(store, null, sampleFormData);
      assert(false, 'Unauthenticated request should be rejected');
    } catch (err: any) {
      assert(
        err instanceof QuotaError && err.code === 'unauthenticated',
        'Reject unauthenticated access without user UID'
      );
    }
  }

  // --- Test 2: Free Plan Limits (5 allowed, 6th rejected) ---
  {
    const store = new MockFirestoreStore();
    const uid = 'user_free_1';
    store.users.set(uid, { currentPlan: 'free', subscriptionStatus: 'active' });

    let lastRemaining = 5;
    for (let i = 1; i <= 5; i++) {
      const res = await executeQuotaEnforcedAdGeneration(store, uid, sampleFormData);
      assert(
        res.adCount === i && res.dailyLimit === 5 && res.remaining === 5 - i,
        `Free tier generation ${i}/5 succeeded (Remaining: ${res.remaining})`
      );
      lastRemaining = res.remaining;
    }
    assert(lastRemaining === 0, 'Free tier remaining count reaches 0 after 5 generations');

    // 6th generation must fail with resource-exhausted
    try {
      await executeQuotaEnforcedAdGeneration(store, uid, sampleFormData);
      assert(false, 'Free tier 6th generation should be rejected');
    } catch (err: any) {
      assert(
        err instanceof QuotaError && err.code === 'resource-exhausted',
        'Free tier 6th generation rejected with RESOURCE_EXHAUSTED',
        err.message
      );
    }
  }

  // --- Test 3: Pro Plan Limits (50 allowed, 51st rejected) ---
  {
    const store = new MockFirestoreStore();
    const uid = 'user_pro_1';
    store.users.set(uid, { currentPlan: 'pro', subscriptionStatus: 'active' });

    // Run 50 generations
    for (let i = 1; i <= 50; i++) {
      const res = await executeQuotaEnforcedAdGeneration(store, uid, sampleFormData);
      if (i === 1 || i === 25 || i === 50) {
        assert(
          res.adCount === i && res.dailyLimit === 50,
          `Pro tier generation ${i}/50 succeeded (Remaining: ${res.remaining})`
        );
      }
    }

    // 51st generation must fail
    try {
      await executeQuotaEnforcedAdGeneration(store, uid, sampleFormData);
      assert(false, 'Pro tier 51st generation should be rejected');
    } catch (err: any) {
      assert(
        err instanceof QuotaError && err.code === 'resource-exhausted',
        'Pro tier 51st generation rejected with RESOURCE_EXHAUSTED'
      );
    }
  }

  // --- Test 4: Ultra Plan Limits (200 allowed, 201st rejected) ---
  {
    const store = new MockFirestoreStore();
    const uid = 'user_ultra_1';
    store.users.set(uid, { currentPlan: 'ultra', subscriptionStatus: 'active' });

    // Seed 199 generations directly in storage to test edge
    const today = getTashkentDateKey();
    store.usage.set(`${uid}/${today}`, { adCount: 199, lastGeneratedAt: new Date().toISOString() });

    // 200th generation allowed
    const res200 = await executeQuotaEnforcedAdGeneration(store, uid, sampleFormData);
    assert(
      res200.adCount === 200 && res200.dailyLimit === 200 && res200.remaining === 0,
      'Ultra tier generation 200/200 succeeded'
    );

    // 201st generation must fail
    try {
      await executeQuotaEnforcedAdGeneration(store, uid, sampleFormData);
      assert(false, 'Ultra tier 201st generation should be rejected');
    } catch (err: any) {
      assert(
        err instanceof QuotaError && err.code === 'resource-exhausted',
        'Ultra tier 201st generation rejected with RESOURCE_EXHAUSTED'
      );
    }
  }

  // --- Test 5: Concurrent Requests Race Condition ---
  {
    const store = new MockFirestoreStore();
    const uid = 'user_concurrent_1';
    store.users.set(uid, { currentPlan: 'free', subscriptionStatus: 'active' });

    // Set usage to 3 (2 allowed before reaching 5)
    const today = getTashkentDateKey();
    store.usage.set(`${uid}/${today}`, { adCount: 3, lastGeneratedAt: new Date().toISOString() });

    // Fire 6 concurrent requests simultaneously
    const requests = Array.from({ length: 6 }, () =>
      executeQuotaEnforcedAdGeneration(store, uid, sampleFormData)
        .then((res) => ({ status: 'success', res }))
        .catch((err) => ({ status: 'error', err }))
    );

    const results = await Promise.all(requests);
    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    assert(
      successCount === 2,
      `Concurrent requests: exactly 2 succeeded out of 6 when 2 remaining (Actual: ${successCount})`
    );
    assert(
      errorCount === 4,
      `Concurrent requests: exactly 4 rejected with quota limit (Actual: ${errorCount})`
    );

    // Check final storage count
    const finalRecord = store.usage.get(`${uid}/${today}`);
    assert(
      finalRecord?.adCount === 5,
      `Concurrent requests: database count strictly clamped at 5 (Actual: ${finalRecord?.adCount})`
    );
  }

  // --- Test 6: Day Rollover (Asia/Tashkent UTC+5) ---
  {
    const store = new MockFirestoreStore();
    const uid = 'user_rollover_1';
    store.users.set(uid, { currentPlan: 'free', subscriptionStatus: 'active' });

    // User exhausts limit on Day 1 (e.g., 2026-10-24 at 23:00 Tashkent time)
    const day1 = new Date('2026-10-24T18:00:00Z'); // 23:00 Tashkent time
    const day1Key = getTashkentDateKey(day1);
    store.usage.set(`${uid}/${day1Key}`, { adCount: 5, lastGeneratedAt: day1.toISOString() });

    // Verify Day 1 is rejected
    try {
      await executeQuotaEnforcedAdGeneration(store, uid, sampleFormData, day1);
      assert(false, 'Day 1 should be exhausted');
    } catch (err: any) {
      assert(
        err instanceof QuotaError && err.code === 'resource-exhausted',
        'Day 1 confirms exhausted quota at 5/5'
      );
    }

    // Day 2 (e.g., 2026-10-24T19:05:00Z = 00:05:00 Tashkent time on 2026-10-25)
    const day2 = new Date('2026-10-24T19:05:00Z');
    const day2Key = getTashkentDateKey(day2);
    assert(day1Key !== day2Key, `Tashkent midnight rollover changes dateKey: ${day1Key} -> ${day2Key}`);

    // Request on Day 2 should succeed fresh
    const resDay2 = await executeQuotaEnforcedAdGeneration(store, uid, sampleFormData, day2);
    assert(
      resDay2.adCount === 1 && resDay2.date === day2Key && resDay2.remaining === 4,
      `Day 2 successfully resets daily quota (adCount: 1, remaining: 4)`
    );
  }

  // --- Test 7: Privilege Escalation Resistance ---
  {
    const store = new MockFirestoreStore();
    const uid = 'user_attacker_1';
    // User profile in database is 'free'
    store.users.set(uid, { currentPlan: 'free', subscriptionStatus: 'active' });

    // Client maliciously sends 'ultra' in rawFormData
    const maliciousPayload = {
      ...sampleFormData,
      currentPlan: 'ultra',
      plan: 'ultra',
      dailyAdLimit: 1000,
    };

    const res = await executeQuotaEnforcedAdGeneration(store, uid, maliciousPayload);
    assert(
      res.plan === 'free' && res.dailyLimit === 5,
      'Client cannot spoof plan; server reads strictly from user profile (Limit: 5)'
    );
  }

  // --- Test 8: Expired Subscription Fallback ---
  {
    const store = new MockFirestoreStore();
    const uid = 'user_expired_pro';
    store.users.set(uid, { currentPlan: 'pro', subscriptionStatus: 'expired' });

    const res = await executeQuotaEnforcedAdGeneration(store, uid, sampleFormData);
    assert(
      res.plan === 'free' && res.dailyLimit === 5,
      'Expired Pro subscription safely downgrades to Free tier (Limit: 5)'
    );
  }

  // --- Test 9: Admin User (kelajaksari2030@gmail.com) Unlimited Quota & Privileges ---
  {
    const store = new MockFirestoreStore();
    const adminUid = 'admin_user_2030';
    store.users.set(adminUid, {
      currentPlan: 'free',
      subscriptionStatus: 'active',
      email: 'kelajaksari2030@gmail.com',
    });

    // Run 10 generations for admin (more than free limit of 5)
    let lastRes: any = null;
    for (let i = 1; i <= 10; i++) {
      lastRes = await executeQuotaEnforcedAdGeneration(store, adminUid, sampleFormData);
    }

    assert(
      lastRes && lastRes.dailyLimit === 999999 && lastRes.adCount === 10,
      'Admin user (kelajaksari2030@gmail.com) gets unlimited daily ad generation quota'
    );

    // Verify case-insensitive email check
    const adminUidUpper = 'admin_user_upper';
    store.users.set(adminUidUpper, {
      currentPlan: 'free',
      subscriptionStatus: 'active',
      email: 'KELAJAKSARI2030@GMAIL.COM',
    });

    const resUpper = await executeQuotaEnforcedAdGeneration(store, adminUidUpper, sampleFormData);
    assert(
      resUpper.dailyLimit === 999999,
      'Admin check is case-insensitive for KELAJAKSARI2030@GMAIL.COM'
    );
  }

  // --- Test 10: Admin Simulation Mode Isolated Usage Counter & Spoofing Resistance ---
  {
    const store = new MockFirestoreStore();
    const adminUid = 'admin_user_sim_1';
    store.users.set(adminUid, {
      currentPlan: 'free',
      subscriptionStatus: 'active',
      email: 'kelajaksari2030@gmail.com',
    });

    // Admin simulates 'free' tier (limit = 5)
    const simFreePayload = { ...sampleFormData, simulatedTier: 'free' };
    for (let i = 1; i <= 5; i++) {
      const res = await executeQuotaEnforcedAdGeneration(store, adminUid, simFreePayload);
      assert(
        res.plan === 'free' && res.dailyLimit === 5 && res.adCount === i,
        `Admin Free simulation generation ${i}/5 succeeded`
      );
    }

    // 6th generation in Free simulation mode MUST trigger resource-exhausted error
    try {
      await executeQuotaEnforcedAdGeneration(store, adminUid, simFreePayload);
      assert(false, '6th generation in Free simulation mode should be rejected');
    } catch (err: any) {
      assert(
        err instanceof QuotaError && err.code === 'resource-exhausted',
        'Admin Free simulation correctly triggers RESOURCE_EXHAUSTED at 5 limit'
      );
    }

    // Switch admin back to Real Admin Mode (simulatedTier: 'admin' / undefined)
    const realRes = await executeQuotaEnforcedAdGeneration(store, adminUid, sampleFormData);
    assert(
      realRes.dailyLimit === 999999 && realRes.adCount === 1,
      'Real admin mode uses pristine unsimulated counter and retains unlimited quota'
    );

    // Non-admin attacker sends simulatedTier = 'ultra' or 'admin'
    const attackerUid = 'attacker_user_99';
    store.users.set(attackerUid, {
      currentPlan: 'free',
      subscriptionStatus: 'active',
      email: 'attacker@gmail.com',
    });

    const spoofedPayload = { ...sampleFormData, simulatedTier: 'ultra' };
    const attackerRes = await executeQuotaEnforcedAdGeneration(store, attackerUid, spoofedPayload);
    assert(
      attackerRes.plan === 'free' && attackerRes.dailyLimit === 5,
      'Server strictly ignores simulatedTier parameter from non-admin users'
    );
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
