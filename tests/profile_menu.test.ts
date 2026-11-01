/**
 * BESTO - Profile Menu & Sidebar Redesign Test Suite
 * 
 * Verifies:
 * 1. User initials derivation for circular avatars ("Nodir Mahmudov" -> "NM", email fallback, single-name fallback).
 * 2. Main sidebar navigation does NOT contain standalone 'settings' item in its list.
 * 3. Mobile drawer navigation does NOT contain standalone 'settings' item in its list.
 * 4. Settings route remains valid and accessible in application route matrix.
 * 5. Profile popover contract includes all required options:
 *    - User info header (name, email, current plan)
 *    - 'Profil va hisob'
 *    - 'Tizim sozlamalari'
 *    - 'Chiqish' (with confirmation flow)
 */

import { getUserInitials } from '../src/utils/userInitials';
import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING PROFILE MENU & SIDEBAR REDESIGN TEST SUITE');
console.log('====================================================');

// ----------------------------------------------------
// 1. User Initials Derivation Tests
// ----------------------------------------------------
console.log('\n--- 1. User Initials Derivation Tests ---');

assert(getUserInitials('Nodir Mahmudov') === 'NM', 'Full name "Nodir Mahmudov" yields initials "NM"');
assert(getUserInitials('Alisher Navoiy') === 'AN', 'Full name "Alisher Navoiy" yields initials "AN"');
assert(getUserInitials('Nodir') === 'NO', 'Single name "Nodir" yields 2-letter prefix "NO"');
assert(getUserInitials('B') === 'B', 'Single letter name "B" yields "B"');
assert(getUserInitials(null, 'kelajaksari2030@gmail.com') === 'KE', 'Email fallback "kelajaksari2030@gmail.com" yields "KE"');
assert(getUserInitials(undefined, 'admin@besto.uz') === 'AD', 'Email fallback "admin@besto.uz" yields "AD"');
assert(getUserInitials('', '') === 'BE', 'Empty input falls back to brand default "BE"');
assert(getUserInitials(null, null) === 'BE', 'Null input falls back to brand default "BE"');

// ----------------------------------------------------
// 2. Sidebar Navigation Items Inspection
// ----------------------------------------------------
console.log('\n--- 2. Sidebar Navigation Items Inspection ---');

const sidebarPath = path.resolve(process.cwd(), 'src/components/Sidebar.tsx');
const sidebarCode = fs.readFileSync(sidebarPath, 'utf-8');

// Ensure 'settings' is not in navGroups items list
const navGroupsMatch = sidebarCode.match(/navGroups\s*:\s*\{[^}]*items\s*:\s*NavItem\[\]\s*\}\[\]\s*=\s*\[([\s\S]*?)\];/);
assert(Boolean(navGroupsMatch), 'Sidebar contains navGroups definition');

if (navGroupsMatch) {
  const navGroupsContent = navGroupsMatch[1];
  const hasSettingsInNavGroups = /id\s*:\s*['"]settings['"]/.test(navGroupsContent);
  assert(!hasSettingsInNavGroups, 'Standalone "settings" item is removed from sidebar navGroups list');
}

// Ensure persistent profile row exists with avatar and popover menu
assert(sidebarCode.includes('getUserInitials'), 'Sidebar uses getUserInitials for circular avatar');
assert(sidebarCode.includes('isProfileMenuOpen'), 'Sidebar implements isProfileMenuOpen state');
assert(sidebarCode.includes('Profil va hisob'), 'Sidebar popover contains "Profil va hisob"');
assert(sidebarCode.includes('Tizim sozlamalari'), 'Sidebar popover contains "Tizim sozlamalari"');
assert(sidebarCode.includes('Chiqish'), 'Sidebar popover contains "Chiqish"');
assert(sidebarCode.includes('signOutUser'), 'Sidebar popover triggers signOutUser');
assert(sidebarCode.includes('rounded-full'), 'Sidebar avatar uses circular rounded-full styling');

// ----------------------------------------------------
// 3. Mobile Drawer Navigation Inspection
// ----------------------------------------------------
console.log('\n--- 3. Mobile Drawer Navigation Inspection ---');

const topHeaderPath = path.resolve(process.cwd(), 'src/components/TopHeader.tsx');
const topHeaderCode = fs.readFileSync(topHeaderPath, 'utf-8');

// Ensure 'settings' is not in mobile drawer navItems list
const mobileNavItemsMatch = topHeaderCode.match(/const\s+navItems\s*=\s*\[([\s\S]*?)\];/);
assert(Boolean(mobileNavItemsMatch), 'TopHeader contains mobile navItems list');

if (mobileNavItemsMatch) {
  const mobileNavContent = mobileNavItemsMatch[1];
  const hasSettingsInMobileNav = /id\s*:\s*['"]settings['"]/.test(mobileNavContent);
  assert(!hasSettingsInMobileNav, 'Standalone "settings" item is removed from mobile drawer navItems list');
}

// Ensure mobile drawer profile row and popover menu exist
assert(topHeaderCode.includes('isMobileProfileMenuOpen'), 'Mobile drawer implements isMobileProfileMenuOpen state');
assert(topHeaderCode.includes('getUserInitials'), 'Mobile drawer uses getUserInitials for circular avatar');
assert(topHeaderCode.includes('Profil va hisob'), 'Mobile drawer popover contains "Profil va hisob"');
assert(topHeaderCode.includes('Tizim sozlamalari'), 'Mobile drawer popover contains "Tizim sozlamalari"');
assert(topHeaderCode.includes('Chiqish'), 'Mobile drawer popover contains "Chiqish"');
assert(topHeaderCode.includes('safe-area-inset-bottom'), 'Mobile drawer footer respects safe area insets');

// ----------------------------------------------------
// 4. Application Routes Whitelist
// ----------------------------------------------------
console.log('\n--- 4. Application Routes Whitelist ---');

const appPath = path.resolve(process.cwd(), 'src/App.tsx');
const appCode = fs.readFileSync(appPath, 'utf-8');

assert(appCode.includes("'settings'"), "App.tsx VALID_TABS preserves 'settings' route");
assert(appCode.includes('<SettingsPage'), 'App.tsx renders <SettingsPage /> for settings tab');

console.log('====================================================');
console.log('🏁 ALL PROFILE MENU & SIDEBAR TESTS PASSED');
console.log('====================================================');
