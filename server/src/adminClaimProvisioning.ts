import type { Auth } from 'firebase-admin/auth';

export interface AdminClaimProvisionResult {
  updated: number;
  unchanged: number;
}

export function parseAdminClaimUids(rawValue: string | undefined): string[] {
  return [...new Set(
    (rawValue || '')
      .split(',')
      .map((uid) => uid.trim())
      .filter(Boolean)
  )];
}

/**
 * Grants admin=true only to UIDs explicitly configured by the server operator.
 * Existing custom claims are preserved. This function never accepts client input.
 */
export async function provisionAdminClaims(
  auth: Pick<Auth, 'getUser' | 'setCustomUserClaims'>,
  rawValue: string | undefined
): Promise<AdminClaimProvisionResult> {
  const uids = parseAdminClaimUids(rawValue);
  let updated = 0;
  let unchanged = 0;

  for (const uid of uids) {
    const user = await auth.getUser(uid);
    const existingClaims = user.customClaims || {};

    if (existingClaims.admin === true) {
      unchanged += 1;
      continue;
    }

    await auth.setCustomUserClaims(uid, {
      ...existingClaims,
      admin: true,
    });
    updated += 1;
  }

  return { updated, unchanged };
}
