import fs from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const projectId = 'demo-biznesyordam-rules';

async function run(): Promise<void> {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    await testEnv.clearFirestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'test', 'connection'), { ready: true });
      await setDoc(doc(db, 'users', 'owner-1'), {
        uid: 'owner-1',
        currentPlan: 'free',
        subscriptionStatus: 'active',
      });
    });

    const ownerDb = testEnv.authenticatedContext('owner-1').firestore();
    const otherDb = testEnv.authenticatedContext('other-1').firestore();
    const adminDb = testEnv.authenticatedContext('admin-1', { admin: true }).firestore();
    const anonymousDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(ownerDb, 'test', 'connection')));
    await assertFails(getDoc(doc(anonymousDb, 'test', 'connection')));
    console.log('PASS: connection probe requires authentication');

    await assertSucceeds(setDoc(doc(ownerDb, 'users', 'new-owner'), {
      uid: 'new-owner',
      currentPlan: 'free',
      subscriptionStatus: 'active',
    }));
    await assertFails(setDoc(doc(ownerDb, 'users', 'fake-pro'), {
      uid: 'fake-pro',
      currentPlan: 'pro',
      subscriptionStatus: 'active',
    }));
    console.log('PASS: user creation is restricted to the Free plan');

    await assertFails(getDoc(doc(otherDb, 'users', 'owner-1')));
    await assertSucceeds(updateDoc(doc(ownerDb, 'users', 'owner-1'), {
      displayName: 'Owner',
    }));
    await assertFails(updateDoc(doc(ownerDb, 'users', 'owner-1'), {
      currentPlan: 'pro',
    }));
    await assertFails(updateDoc(doc(ownerDb, 'users', 'owner-1'), {
      planExpiresAt: '2099-01-01T00:00:00.000Z',
    }));
    console.log('PASS: users can edit their own profile but cannot escalate subscription');

    await assertSucceeds(updateDoc(doc(adminDb, 'users', 'owner-1'), {
      currentPlan: 'ultra',
      subscriptionStatus: 'active',
      planExpiresAt: '2099-01-01T00:00:00.000Z',
    }));
    await assertSucceeds(setDoc(doc(adminDb, 'users', 'admin-1'), {
      uid: 'admin-1',
      currentPlan: 'ultra',
      subscriptionStatus: 'active',
    }));
    console.log('PASS: server-claimed admin can manage subscription fields');

    await assertFails(setDoc(doc(ownerDb, 'users', 'owner-1', 'usage', 'today'), {
      userId: 'owner-1',
      adCount: 1,
    }));
    await assertSucceeds(setDoc(doc(ownerDb, 'users', 'owner-1', 'adDrafts', 'draft-1'), {
      userId: 'owner-1',
      content: 'Draft',
    }));
    console.log('PASS: usage counters are server-only; owner draft access works');
  } finally {
    await testEnv.cleanup();
  }
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
