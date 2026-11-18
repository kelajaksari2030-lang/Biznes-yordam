/**
 * BiznesYordam - Security Hardening Test Suite (SEC-01 & SEC-02)
 *
 * Verifies:
 * 1. SEC-01: Custom claim `admin == true` grants plan update privileges in security rule logic.
 * 2. SEC-01: Legacy admin email `kelajaksari2030@gmail.com` fallback remains supported during migration.
 * 3. SEC-01: Non-admin users cannot write or escalate plan/subscription fields.
 * 4. SEC-01: Client-side spoof attempts without admin claims or admin email fail authorization checks.
 * 5. SEC-02: Connection probe `/test/connection` denies unauthenticated reads.
 * 6. SEC-02: Connection probe `/test/connection` allows authenticated reads.
 */

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING SECURITY HARDENING TEST SUITE (SEC-01 & SEC-02)');
console.log('====================================================');

// Mock security rule helper functions mirroring firestore.rules
interface MockAuthToken {
  uid: string;
  email?: string | null;
  email_verified?: boolean;
  admin?: boolean;
}

interface MockRequest {
  auth: MockAuthToken | null;
}

function isSignedIn(req: MockRequest): boolean {
  return req.auth !== null;
}

function isOwner(req: MockRequest, userId: string): boolean {
  return isSignedIn(req) && req.auth?.uid === userId;
}

function isAdmin(req: MockRequest): boolean {
  if (!isSignedIn(req) || !req.auth) return false;
  const token = req.auth;
  const hasCustomClaim = token.admin === true;
  const isFallbackAdminEmail =
    token.email_verified === true &&
    token.email != null &&
    token.email.toLowerCase() === 'kelajaksari2030@gmail.com';
  return hasCustomClaim || isFallbackAdminEmail;
}

function canReadTestConnection(req: MockRequest): boolean {
  // SEC-02: allow read: if isSignedIn();
  return isSignedIn(req);
}

function canCreateUserProfile(
  req: MockRequest,
  userId: string,
  incomingData: { uid: string; currentPlan: string }
): boolean {
  return (
    isOwner(req, userId) &&
    incomingData.uid === userId &&
    (incomingData.currentPlan === 'free' || isAdmin(req))
  );
}

function canUpdateUserProfile(
  req: MockRequest,
  userId: string,
  existingData: { uid: string; currentPlan: string; subscriptionStatus?: string },
  incomingData: { uid: string; currentPlan: string; subscriptionStatus?: string; [key: string]: any }
): boolean {
  if (!isOwner(req, userId) || incomingData.uid !== userId) {
    return false;
  }

  const planChanged = incomingData.currentPlan !== existingData.currentPlan;
  const statusChanged = incomingData.subscriptionStatus !== existingData.subscriptionStatus;

  if ((planChanged || statusChanged) && !isAdmin(req)) {
    return false;
  }

  return true;
}

// ----------------------------------------------------
// 1. SEC-02: Connection Probe (/test/connection) Tests
// ----------------------------------------------------
console.log('\n--- 1. SEC-02: /test/connection Path Access Control ---');

const unauthenticatedReq: MockRequest = { auth: null };
const regularUserReq: MockRequest = { auth: { uid: 'usr_123', email: 'user@example.com' } };
const customClaimAdminReq: MockRequest = {
  auth: { uid: 'usr_admin', email: 'admin_custom@example.com', admin: true },
};

assert(
  canReadTestConnection(unauthenticatedReq) === false,
  'Unauthenticated request to /test/connection is DENIED'
);
assert(
  canReadTestConnection(regularUserReq) === true,
  'Authenticated regular user request to /test/connection is ALLOWED'
);
assert(
  canReadTestConnection(customClaimAdminReq) === true,
  'Authenticated admin user request to /test/connection is ALLOWED'
);

// ----------------------------------------------------
// 2. SEC-01: Admin Privilege & Custom Claims Authorization
// ----------------------------------------------------
console.log('\n--- 2. SEC-01: Custom Claims & Legacy Email Fallback Authorization ---');

const legacyAdminEmailReq: MockRequest = {
  auth: { uid: 'usr_legacy_admin', email: 'kelajaksari2030@gmail.com', email_verified: true },
};
const uppercaseLegacyAdminEmailReq: MockRequest = {
  auth: { uid: 'usr_legacy_admin2', email: 'KELAJAKSARI2030@GMAIL.COM', email_verified: true },
};
const unverifiedLegacyAdminEmailReq: MockRequest = {
  auth: { uid: 'usr_unverified_admin', email: 'kelajaksari2030@gmail.com', email_verified: false },
};
const missingVerifiedLegacyAdminEmailReq: MockRequest = {
  auth: { uid: 'usr_unverified_admin2', email: 'kelajaksari2030@gmail.com' },
};
const spoofedEmailReq: MockRequest = {
  auth: { uid: 'usr_hacker', email: 'fake_kelajaksari2030@gmail.com', email_verified: true },
};

assert(
  isAdmin(customClaimAdminReq) === true,
  'User with custom claim admin == true is authorized as admin'
);
assert(
  isAdmin(legacyAdminEmailReq) === true,
  'User with verified legacy admin email is authorized as admin during migration'
);
assert(
  isAdmin(uppercaseLegacyAdminEmailReq) === true,
  'Verified legacy admin email check is case-insensitive'
);
assert(
  isAdmin(unverifiedLegacyAdminEmailReq) === false,
  'Unverified legacy admin email (email_verified: false) is NOT authorized as admin'
);
assert(
  isAdmin(missingVerifiedLegacyAdminEmailReq) === false,
  'Legacy admin email without email_verified === true is NOT authorized as admin'
);
assert(
  isAdmin(regularUserReq) === false,
  'Regular user without admin claim or email is NOT authorized as admin'
);
assert(
  isAdmin(spoofedEmailReq) === false,
  'Similar or spoofed email prefix is NOT authorized as admin'
);
assert(
  isAdmin(unauthenticatedReq) === false,
  'Unauthenticated request is NOT authorized as admin'
);

// ----------------------------------------------------
// 3. SEC-01: User Profile & Plan Modification Enforcement
// ----------------------------------------------------
console.log('\n--- 3. SEC-01: User Profile Plan Modification Rules ---');

const regularProfile = { uid: 'usr_123', currentPlan: 'free', subscriptionStatus: 'active' };

// Normal profile creation (Free plan)
assert(
  canCreateUserProfile(regularUserReq, 'usr_123', { uid: 'usr_123', currentPlan: 'free' }) === true,
  'Regular user can create profile with default "free" plan'
);

// Non-admin attempting to create profile with Pro/Ultra plan directly
assert(
  canCreateUserProfile(regularUserReq, 'usr_123', { uid: 'usr_123', currentPlan: 'pro' }) === false,
  'Regular non-admin CANNOT create profile with "pro" plan directly'
);
assert(
  canCreateUserProfile(regularUserReq, 'usr_123', { uid: 'usr_123', currentPlan: 'ultra' }) === false,
  'Regular non-admin CANNOT create profile with "ultra" plan directly'
);

// Admin creating profile with Ultra plan
assert(
  canCreateUserProfile(customClaimAdminReq, 'usr_admin', { uid: 'usr_admin', currentPlan: 'ultra' }) === true,
  'Admin with custom claim CAN create profile with "ultra" plan'
);

// Non-admin updating non-plan fields
assert(
  canUpdateUserProfile(
    regularUserReq,
    'usr_123',
    regularProfile,
    { uid: 'usr_123', currentPlan: 'free', subscriptionStatus: 'active', name: 'New Name' }
  ) === true,
  'Regular user can update non-plan fields (e.g. name)'
);

// Non-admin attempting self-upgrade to Pro/Ultra
assert(
  canUpdateUserProfile(
    regularUserReq,
    'usr_123',
    regularProfile,
    { uid: 'usr_123', currentPlan: 'pro', subscriptionStatus: 'active' }
  ) === false,
  'Regular non-admin user CANNOT upgrade currentPlan to "pro"'
);
assert(
  canUpdateUserProfile(
    regularUserReq,
    'usr_123',
    regularProfile,
    { uid: 'usr_123', currentPlan: 'ultra', subscriptionStatus: 'active' }
  ) === false,
  'Regular non-admin user CANNOT upgrade currentPlan to "ultra"'
);

// Non-admin attempting to modify subscriptionStatus
assert(
  canUpdateUserProfile(
    regularUserReq,
    'usr_123',
    regularProfile,
    { uid: 'usr_123', currentPlan: 'free', subscriptionStatus: 'admin_override' }
  ) === false,
  'Regular non-admin user CANNOT modify subscriptionStatus'
);

// Verified Admin updating user plan via Firestore security rules
assert(
  canUpdateUserProfile(
    customClaimAdminReq,
    'usr_admin',
    { uid: 'usr_admin', currentPlan: 'free', subscriptionStatus: 'active' },
    { uid: 'usr_admin', currentPlan: 'ultra', subscriptionStatus: 'active' }
  ) === true,
  'Admin with custom claim CAN update currentPlan'
);

assert(
  canUpdateUserProfile(
    legacyAdminEmailReq,
    'usr_legacy_admin',
    { uid: 'usr_legacy_admin', currentPlan: 'free', subscriptionStatus: 'active' },
    { uid: 'usr_legacy_admin', currentPlan: 'pro', subscriptionStatus: 'active' }
  ) === true,
  'Verified legacy admin email user CAN update currentPlan during migration'
);

assert(
  canUpdateUserProfile(
    unverifiedLegacyAdminEmailReq,
    'usr_unverified_admin',
    { uid: 'usr_unverified_admin', currentPlan: 'free', subscriptionStatus: 'active' },
    { uid: 'usr_unverified_admin', currentPlan: 'ultra', subscriptionStatus: 'active' }
  ) === false,
  'Unverified legacy admin email CANNOT escalate currentPlan'
);

console.log('\n====================================================');
console.log('✅ ALL SECURITY HARDENING TESTS PASSED SUCCESSFULLY!');
console.log('====================================================\n');
