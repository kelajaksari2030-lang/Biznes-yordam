/**
 * Centralized server-side admin authorization.
 *
 * Admin access is granted only by a server-assigned Firebase custom claim
 * or an explicit server-side UID allowlist. Email and client-editable profile
 * fields are never authorization sources.
 */
export function parseAdminUids(rawValue: string | undefined): Set<string> {
  return new Set(
    (rawValue || '')
      .split(',')
      .map((uid) => uid.trim())
      .filter(Boolean)
  );
}

export function isAdminUser(
  uid?: string | null,
  hasAdminClaim = false,
  adminUids: Set<string> = parseAdminUids(process.env.ADMIN_UIDS)
): boolean {
  if (!uid) return false;
  return hasAdminClaim === true || adminUids.has(uid);
}
