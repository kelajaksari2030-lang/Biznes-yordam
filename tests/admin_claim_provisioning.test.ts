import {
  parseAdminClaimUids,
  provisionAdminClaims,
} from '../server/src/adminClaimProvisioning.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error('FAIL: ' + message);
  console.log('PASS: ' + message);
}

async function run(): Promise<void> {
  assert(
    JSON.stringify(parseAdminClaimUids(' uid-a,uid-b, uid-a ,, ')) === JSON.stringify(['uid-a', 'uid-b']),
    'Admin claim UID parser trims values and removes duplicates'
  );

  const users: Record<string, { customClaims?: Record<string, unknown> }> = {
    'uid-a': { customClaims: { billingRole: 'owner' } },
    'uid-b': { customClaims: { admin: true, featureFlag: true } },
  };
  const writes: Array<{ uid: string; claims: Record<string, unknown> }> = [];

  const fakeAuth = {
    async getUser(uid: string) {
      const user = users[uid];
      if (!user) throw new Error('user-not-found');
      return { uid, customClaims: user.customClaims };
    },
    async setCustomUserClaims(uid: string, claims: Record<string, unknown>) {
      writes.push({ uid, claims });
      users[uid].customClaims = claims;
    },
  };

  const result = await provisionAdminClaims(fakeAuth as any, 'uid-a,uid-b');
  assert(result.updated === 1 && result.unchanged === 1, 'Only users missing admin=true are updated');
  assert(
    users['uid-a'].customClaims?.admin === true &&
      users['uid-a'].customClaims?.billingRole === 'owner',
    'Existing custom claims are preserved when admin=true is added'
  );
  assert(writes.length === 1 && writes[0].uid === 'uid-a', 'Already-admin users are not rewritten');

  const emptyResult = await provisionAdminClaims(fakeAuth as any, ' , , ');
  assert(emptyResult.updated === 0 && emptyResult.unchanged === 0, 'Empty allowlist performs no writes');
}

void run();
