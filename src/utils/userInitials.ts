/**
 * Computes user initials for circular avatars.
 * Examples:
 * - "Nodir Mahmudov" -> "NM"
 * - "Nodir" -> "NO"
 * - "kelajaksari2030@gmail.com" -> "KE"
 */
export function getUserInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0][0] || '';
      const last = parts[parts.length - 1][0] || '';
      return (first + last).toUpperCase();
    }
    const single = parts[0];
    return single.length >= 2 ? single.slice(0, 2).toUpperCase() : single.toUpperCase();
  }

  if (email && email.trim()) {
    const local = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    if (local.length >= 2) {
      return local.slice(0, 2).toUpperCase();
    }
    return local.toUpperCase() || 'U';
  }

  return 'BE';
}
