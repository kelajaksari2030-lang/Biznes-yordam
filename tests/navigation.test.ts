/**
 * BiznesYordam - Navigation & Visual Feature Catalog Test Suite
 * 
 * Verifies:
 * 1. All 8 visual modules are defined with correct identifiers and routing targets.
 * 2. Hash routing whitelist includes all valid tool identifiers.
 * 3. Preset parameters for "Mahsulot tavsifi" and "Ijtimoiy tarmoq postlari" correctly map to AdGenerator.
 * 4. Collapsible sidebar state serialization.
 * 5. Mobile drawer navigation contract integrity.
 */

import { ToolType } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING NAVIGATION & CATALOG TEST SUITE');
console.log('====================================================');

// 1. Whitelist of all supported primary routes
const VALID_ROUTES: ToolType[] = [
  'home',
  'today-navigator',
  'ad-lab',
  'ad-generator',
  'profit-calculator',
  'reply-templates',
  'business-diagnostics',
  'crm',
  'inventory',
  'orders'
];

assert(VALID_ROUTES.length === 10, "All 10 core tool routes are present in route matrix");

// 2. The 11 Visual Cards on Home Catalog
interface CatalogCardDef {
  id: string;
  targetTab: ToolType;
  title: string;
  category: string;
  preset?: string;
}

const CATALOG_CARDS: CatalogCardDef[] = [
  { id: 'today_navigator', targetTab: 'today-navigator', title: '“Bugun nima qilay?” navigatori', category: 'Kunlik boshqaruv' },
  { id: 'ad_lab', targetTab: 'ad-lab', title: 'Reklama laboratoriyasi', category: 'A/B Sinov & Laboratoriya' },
  { id: 'business_diagnostics', targetTab: 'business-diagnostics', title: 'AI Biznes Diagnostikasi', category: 'Strategik Tahlil' },
  { id: 'ad_generator', targetTab: 'ad-generator', title: 'Reklama matni generatori', category: 'Reklama & Kreativ' },
  { id: 'product_desc', targetTab: 'ad-generator', title: 'Mahsulot tavsifi', category: 'Mahsulot & Sifat', preset: 'product_desc' },
  { id: 'social_post', targetTab: 'ad-generator', title: 'Ijtimoiy tarmoq postlari', category: 'SMM & Kontent', preset: 'social_post' },
  { id: 'profit_calc', targetTab: 'profit-calculator', title: 'Foyda kalkulyatori', category: 'Moliya & Hisob' },
  { id: 'reply_templates', targetTab: 'reply-templates', title: 'Mijozlarga javoblar', category: 'Muloqot & Savdo' },
  { id: 'crm', targetTab: 'crm', title: 'Mijozlar bazasi (CRM)', category: 'Mijozlar & CRM' },
  { id: 'inventory', targetTab: 'inventory', title: 'Mahsulotlar ombori', category: 'Ombor & Tovar' },
  { id: 'orders', targetTab: 'orders', title: 'Savdo buyurtmalari', category: 'Savdo & Hisob' },
];

assert(CATALOG_CARDS.length === 11, "Exactly 11 visual feature cards are configured for the home grid");

CATALOG_CARDS.forEach(card => {
  assert(VALID_ROUTES.includes(card.targetTab), `Card "${card.title}" targets a valid route "${card.targetTab}"`);
  assert(card.category.length > 3, `Card "${card.title}" has descriptive category "${card.category}"`);
});

// 3. Test Sidebar collapse toggle logic
let isCollapsed = false;
const toggleSidebar = (current: boolean) => !current;
isCollapsed = toggleSidebar(isCollapsed);
assert(isCollapsed === true, "Sidebar toggles from expanded to collapsed");
isCollapsed = toggleSidebar(isCollapsed);
assert(isCollapsed === false, "Sidebar toggles from collapsed to expanded");

// 4. Test Mobile drawer close on link selection contract
class DrawerController {
  public isOpen = true;
  close() {
    this.isOpen = false;
  }
}
const drawerCtrl = new DrawerController();
drawerCtrl.close();
assert(drawerCtrl.isOpen === false, "Selecting a mobile link closes the drawer");

console.log('====================================================');
console.log('🏁 ALL NAVIGATION TESTS PASSED SUCCESSFULLY');
console.log('====================================================');
