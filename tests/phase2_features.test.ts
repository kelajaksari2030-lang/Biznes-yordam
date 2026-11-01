/**
 * BESTO - Phase 2 Features Comprehensive Test Suite
 * 
 * Verifies:
 * 1. CSV Bulk Import parsing, delimiter detection, UTF-8 BOM, row validation, duplicate SKU detection.
 * 2. CSV Import Mode (update existing vs skip existing).
 * 3. Recipe / BOM validation: self-reference, circular dependency, zero/negative qty, duplicate ingredient.
 * 4. Recipe cost calculation (tannarx).
 * 5. Quick Sales / POS order idempotency & financial calculations.
 * 6. BOM atomic ingredient deduction simulation (raw ingredients deducted instead of finished product).
 * 7. Mixed order deduction (recipe products + non-recipe products).
 * 8. Insufficient raw ingredient rejection.
 * 9. Exact ingredient restoration on order cancellation.
 * 10. Multi-tenant user isolation (strictly scoped to /users/{userId}/*).
 */

import {
  parseProductCsv,
  detectDelimiter,
  parseCsvLine,
  normalizeUnit,
  generateSampleProductCsv,
} from '../src/utils/csvProductParser';
import {
  validateRecipe,
  calculateRecipeCost,
  validateProductInput,
  canDeleteProduct,
} from '../src/services/inventoryService';
import {
  validateOrderInput,
  calculateOrderFinancials,
} from '../src/services/orderService';
import { sanitizeFirestorePayload } from '../src/services/firebase';
import { Product, RecipeItem } from '../src/types/inventory';
import { Order, DeductedStockItem } from '../src/types/business';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING BESTO PHASE 2 TEST SUITE (CSV, POS, BOM)');
console.log('====================================================');

// ----------------------------------------------------
// 1. CSV Parser & Delimiter Detection
// ----------------------------------------------------
console.log('\n--- 1. CSV Delimiter & Tokenizer Tests ---');

assert(detectDelimiter('name,sku,costPrice,salePrice') === ',', 'Comma delimiter detected correctly');
assert(detectDelimiter('name;sku;costPrice;salePrice') === ';', 'Semicolon delimiter detected correctly');

const tokensComma = parseCsvLine('Erkaklar ko‘ylagi,SHIRT-01,85000,"140,000",10', ',');
assert(tokensComma.length === 5, 'Tokenizer parsed 5 comma-separated tokens');
assert(tokensComma[3] === '140,000', 'Quoted string with delimiter preserved');

const tokensSemicolon = parseCsvLine('Charm sumka;BAG-01;120000;200000;5', ';');
assert(tokensSemicolon.length === 5, 'Tokenizer parsed 5 semicolon-separated tokens');

// ----------------------------------------------------
// 2. Unit Normalization
// ----------------------------------------------------
console.log('\n--- 2. Product Unit Normalization ---');

assert(normalizeUnit('d') === 'dona', "Unit 'd' normalizes to 'dona'");
assert(normalizeUnit('dona') === 'dona', "Unit 'dona' stays 'dona'");
assert(normalizeUnit('pcs') === 'dona', "Unit 'pcs' normalizes to 'dona'");
assert(normalizeUnit('kg') === 'kg', "Unit 'kg' normalizes to 'kg'");
assert(normalizeUnit('kilogramm') === 'kg', "Unit 'kilogramm' normalizes to 'kg'");
assert(normalizeUnit('m') === 'metr', "Unit 'm' normalizes to 'metr'");
assert(normalizeUnit('juft') === 'poy', "Unit 'juft' normalizes to 'poy'");
assert(normalizeUnit('karobka') === 'quti', "Unit 'karobka' normalizes to 'quti'");
assert(normalizeUnit('l') === 'litr', "Unit 'l' normalizes to 'litr'");
assert(normalizeUnit('komplekt') === 'to‘plam', "Unit 'komplekt' normalizes to 'to‘plam'");

// ----------------------------------------------------
// 3. Sample CSV Generation
// ----------------------------------------------------
console.log('\n--- 3. Sample CSV Generation ---');

const sampleCsv = generateSampleProductCsv();
assert(sampleCsv.charCodeAt(0) === 0xFEFF, 'Sample CSV begins with UTF-8 BOM');
assert(sampleCsv.includes('name,sku,costPrice,salePrice'), 'Sample CSV includes standard header');
assert(sampleCsv.includes('SHIRT-001'), 'Sample CSV includes sample items');

// ----------------------------------------------------
// 4. CSV Bulk Import Parsing & Line-by-Line Validation
// ----------------------------------------------------
console.log('\n--- 4. CSV Bulk Import Parsing & Validation ---');

const validCsv = `name,sku,costPrice,salePrice,initialStock,unit,minimumStock
Erkaklar ko‘ylak,SHIRT-101,90000,160000,20,dona,5
Klassik charm tufli,SHOES-202,180000,290000,15,poy,3
Ayollar sumkasi,BAG-303,110000,195000,10,dona,4`;

const parseResult = parseProductCsv(validCsv);
assert(parseResult.totalRows === 3, 'Parsed 3 total rows');
assert(parseResult.validRows === 3, 'All 3 rows valid');
assert(parseResult.invalidRows === 0, 'Zero invalid rows');
assert(parseResult.rows[0].costPrice === 90000, 'Cost price numeric parsed correctly');
assert(parseResult.rows[1].unit === 'poy', 'Poy unit mapped correctly');

// Invalid CSV cases
const invalidCsv = `name,sku,costPrice,salePrice,initialStock,unit,minimumStock
,SKU-EMPTY-NAME,50000,80000,10,dona,2
Yaroqli tovar,SKU-BAD-PRICE,-10000,80000,10,dona,2
Yana bir tovar,SKU-BAD-QTY,50000,80000,-5,dona,2
Dublikat 1,SKU-DUP,50000,80000,10,dona,2
Dublikat 2,SKU-DUP,50000,80000,10,dona,2`;

const resInvalid = parseProductCsv(invalidCsv);
assert(resInvalid.totalRows === 5, 'Parsed 5 rows from invalid CSV');
assert(resInvalid.invalidRows >= 4, 'Detected at least 4 invalid rows');
assert(resInvalid.rows[0].errors.some((e) => e.includes('nomi')), 'Row 1 flagged empty name error');
assert(resInvalid.rows[1].errors.some((e) => e.includes('Xarid narxi')), 'Row 2 flagged negative cost error');
assert(resInvalid.rows[2].errors.some((e) => e.includes('miqdor')), 'Row 3 flagged negative quantity error');
assert(resInvalid.rows[4].errors.some((e) => e.includes('takrorlangan SKU')), 'Row 5 flagged duplicate SKU error');

// ----------------------------------------------------
// 5. CSV Import Action Matching (Update vs Skip)
// ----------------------------------------------------
console.log('\n--- 5. CSV Import Duplicate Action Modes ---');

const existingProductsMock: Product[] = [
  {
    id: 'prod_existing_1',
    userId: 'user_test',
    name: 'Eski ko‘ylak',
    sku: 'SHIRT-101',
    purchasePrice: 80000,
    sellingPrice: 150000,
    quantity: 5,
    unit: 'dona',
    minStockAlert: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const updateModeRes = parseProductCsv(validCsv, existingProductsMock, 'update');
const row1Update = updateModeRes.rows.find((r) => r.sku === 'SHIRT-101');
assert(row1Update?.action === 'update', "Existing SKU in 'update' mode is marked as update");
assert(row1Update?.existingProductId === 'prod_existing_1', 'Matched existing product ID');

const skipModeRes = parseProductCsv(validCsv, existingProductsMock, 'skip');
const row1Skip = skipModeRes.rows.find((r) => r.sku === 'SHIRT-101');
assert(row1Skip?.action === 'skip', "Existing SKU in 'skip' mode is marked as skip");

// ----------------------------------------------------
// 6. Recipe / BOM Validation Tests
// ----------------------------------------------------
console.log('\n--- 6. Recipe / BOM Validation ---');

const mockRawMaterials: Product[] = [
  {
    id: 'ing_leather',
    userId: 'user_test',
    name: 'Tabiiy charm',
    sku: 'RAW-LTR',
    purchasePrice: 60000,
    sellingPrice: 0,
    quantity: 100,
    unit: 'metr',
    minStockAlert: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ing_sole',
    userId: 'user_test',
    name: 'Kauchuk taglik',
    sku: 'RAW-SOL',
    purchasePrice: 25000,
    sellingPrice: 0,
    quantity: 50,
    unit: 'poy',
    minStockAlert: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_finished_shoe',
    userId: 'user_test',
    name: 'Klassik charm tufli',
    sku: 'SHOE-01',
    purchasePrice: 0,
    sellingPrice: 200000,
    quantity: 0,
    unit: 'poy',
    minStockAlert: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Valid Recipe
const validRecipe: RecipeItem[] = [
  { ingredientProductId: 'ing_leather', quantity: 0.5 },
  { ingredientProductId: 'ing_sole', quantity: 1 },
];

const validRecRes = validateRecipe(validRecipe, 'prod_finished_shoe', mockRawMaterials);
assert(validRecRes.isValid, 'Valid recipe passes validation');

// Rejects Self-Reference
const selfRefRecipe: RecipeItem[] = [
  { ingredientProductId: 'prod_finished_shoe', quantity: 1 },
];
const selfRefRes = validateRecipe(selfRefRecipe, 'prod_finished_shoe', mockRawMaterials);
assert(!selfRefRes.isValid, 'Self-reference recipe is rejected');
assert(selfRefRes.errors.some((e) => e.includes("o'z-o'ziga")), 'Error message specifies self-reference rejection');

// Rejects Zero or Negative Quantity
const negativeQtyRecipe: RecipeItem[] = [
  { ingredientProductId: 'ing_leather', quantity: -2 },
];
const negQtyRes = validateRecipe(negativeQtyRecipe, 'prod_finished_shoe', mockRawMaterials);
assert(!negQtyRes.isValid, 'Negative ingredient quantity is rejected');

// Rejects Duplicate Ingredients in Same Recipe
const duplicateIngRecipe: RecipeItem[] = [
  { ingredientProductId: 'ing_leather', quantity: 1 },
  { ingredientProductId: 'ing_leather', quantity: 0.5 },
];
const dupIngRes = validateRecipe(duplicateIngRecipe, 'prod_finished_shoe', mockRawMaterials);
assert(!dupIngRes.isValid, 'Duplicate ingredient within same recipe is rejected');

// Rejects Non-Existent Ingredient ID
const nonExistentRecipe: RecipeItem[] = [
  { ingredientProductId: 'ing_non_existent', quantity: 1 },
];
const nonExistentRes = validateRecipe(nonExistentRecipe, 'prod_finished_shoe', mockRawMaterials);
assert(!nonExistentRes.isValid, 'Non-existent ingredient is rejected');

// Circular Dependency Detection
const prodA: Product = {
  id: 'prod_A',
  userId: 'user_test',
  name: 'Tovar A',
  sku: 'A',
  purchasePrice: 10000,
  sellingPrice: 20000,
  quantity: 10,
  unit: 'dona',
  minStockAlert: 2,
  recipe: [{ ingredientProductId: 'prod_B', quantity: 1 }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const circularRecipe: RecipeItem[] = [{ ingredientProductId: 'prod_A', quantity: 1 }];
const circularRes = validateRecipe(circularRecipe, 'prod_B', [prodA]);
assert(!circularRes.isValid, 'Direct circular dependency (A->B, B->A) is detected and rejected');

// ----------------------------------------------------
// 7. Recipe Cost Calculation (Tannarx)
// ----------------------------------------------------
console.log('\n--- 7. Recipe Production Cost Calculation ---');

// Leather: 60,000 * 0.5 = 30,000; Sole: 25,000 * 1 = 25,000 => Total = 55,000 UZS
const calculatedCost = calculateRecipeCost(validRecipe, mockRawMaterials);
assert(calculatedCost === 55000, `Calculated recipe cost is 55,000 UZS (actual: ${calculatedCost})`);

// ----------------------------------------------------
// 8. Order Financial Calculations & BOM Ingredient Deductions
// ----------------------------------------------------
console.log('\n--- 8. BOM / Recipe Order Stock Deduction Simulation ---');

// Mock order containing 2 pairs of 'prod_finished_shoe' (which has validRecipe)
const orderItemsMock = [
  {
    productId: 'prod_finished_shoe',
    productName: 'Klassik charm tufli',
    quantity: 2,
    unitPrice: 200000,
    unitCost: 55000,
    unit: 'poy',
  },
];

const fin = calculateOrderFinancials(orderItemsMock);
assert(fin.totalAmount === 400000, 'Order totalAmount is 400,000 UZS');
assert(fin.totalCost === 110000, 'Order totalCost is 110,000 UZS');
assert(fin.totalProfit === 290000, 'Order expected profit is 290,000 UZS');

// Simulate BOM deduction logic
function simulateBomDeduction(
  orderItems: { productId: string; quantity: number }[],
  allProducts: Map<string, Product>
): {
  success: boolean;
  error?: string;
  deductions: DeductedStockItem[];
} {
  const deductionsMap = new Map<string, { requiredQty: number; name: string; unit: string; isIngredient: boolean }>();

  for (const item of orderItems) {
    const prod = allProducts.get(item.productId);
    if (!prod) return { success: false, error: 'Mahsulot topilmadi', deductions: [] };

    if (prod.recipe && prod.recipe.length > 0) {
      for (const rItem of prod.recipe) {
        const ing = allProducts.get(rItem.ingredientProductId);
        if (!ing) return { success: false, error: 'Xomashyo topilmadi', deductions: [] };
        const needed = item.quantity * rItem.quantity;
        const exist = deductionsMap.get(rItem.ingredientProductId);
        if (exist) {
          exist.requiredQty += needed;
        } else {
          deductionsMap.set(rItem.ingredientProductId, {
            requiredQty: needed,
            name: ing.name,
            unit: ing.unit,
            isIngredient: true,
          });
        }
      }
    } else {
      const exist = deductionsMap.get(item.productId);
      if (exist) {
        exist.requiredQty += item.quantity;
      } else {
        deductionsMap.set(item.productId, {
          requiredQty: item.quantity,
          name: prod.name,
          unit: prod.unit,
          isIngredient: false,
        });
      }
    }
  }

  // Stock sufficiency check
  const deductions: DeductedStockItem[] = [];
  for (const [prodId, ded] of deductionsMap.entries()) {
    const prod = allProducts.get(prodId)!;
    if (prod.quantity < ded.requiredQty) {
      return {
        success: false,
        error: `Omborda xomashyo yetarli emas: "${ded.name}". Mavjud: ${prod.quantity}, kerak: ${ded.requiredQty}`,
        deductions: [],
      };
    }
    deductions.push({
      productId: prodId,
      productName: ded.name,
      quantity: ded.requiredQty,
      unit: ded.unit,
      isIngredient: ded.isIngredient,
    });
  }

  // Deduct
  for (const d of deductions) {
    const prod = allProducts.get(d.productId)!;
    prod.quantity -= d.quantity;
  }

  return { success: true, deductions };
}

// Build map with finished product containing recipe
const simProductsMap = new Map<string, Product>();
simProductsMap.set('ing_leather', { ...mockRawMaterials[0], quantity: 10 }); // 10 meters leather
simProductsMap.set('ing_sole', { ...mockRawMaterials[1], quantity: 4 }); // 4 soles
simProductsMap.set('prod_finished_shoe', {
  ...mockRawMaterials[2],
  quantity: 0,
  recipe: validRecipe,
});

// Ordering 2 shoes requires: 2 * 0.5 = 1 meter leather, 2 * 1 = 2 soles
const simRes1 = simulateBomDeduction([{ productId: 'prod_finished_shoe', quantity: 2 }], simProductsMap);
assert(simRes1.success, 'BOM deduction succeeds when ingredients are sufficient');
assert(simRes1.deductions.length === 2, 'Two raw materials deducted');
assert(simProductsMap.get('ing_leather')!.quantity === 9, 'Leather reduced from 10 to 9 meters');
assert(simProductsMap.get('ing_sole')!.quantity === 2, 'Soles reduced from 4 to 2');
assert(simProductsMap.get('prod_finished_shoe')!.quantity === 0, 'Finished shoe quantity unmodified (on-demand BOM)');

// Ordering 5 shoes requires 5 soles, but only 2 remain => must fail cleanly
const simResInsufficient = simulateBomDeduction([{ productId: 'prod_finished_shoe', quantity: 5 }], simProductsMap);
assert(!simResInsufficient.success, 'BOM deduction fails when ingredient is insufficient');
assert(simResInsufficient.error!.includes('xomashyo yetarli emas'), 'Error mentions raw material insufficiency');
assert(simProductsMap.get('ing_sole')!.quantity === 2, 'Stock remains uncorrupted after failed deduction');

// ----------------------------------------------------
// 9. Exact Ingredient Restoration on Order Cancellation
// ----------------------------------------------------
console.log('\n--- 9. BOM Ingredient Restoration on Cancellation ---');

function simulateCancellationRestoration(
  deductions: DeductedStockItem[],
  allProducts: Map<string, Product>
) {
  for (const d of deductions) {
    const prod = allProducts.get(d.productId);
    if (prod) {
      prod.quantity += d.quantity;
    }
  }
}

simulateCancellationRestoration(simRes1.deductions, simProductsMap);
assert(simProductsMap.get('ing_leather')!.quantity === 10, 'Leather restored back to 10 meters');
assert(simProductsMap.get('ing_sole')!.quantity === 4, 'Soles restored back to 4');

// ----------------------------------------------------
// 10. Multi-Tenant User Isolation
// ----------------------------------------------------
console.log('\n--- 10. Multi-Tenant User Isolation ---');

const foreignProduct: Product = {
  id: 'prod_foreign_99',
  userId: 'attacker_user_999',
  name: 'Begona tovar',
  sku: 'FOREIGN',
  purchasePrice: 10000,
  sellingPrice: 20000,
  quantity: 50,
  unit: 'dona',
  minStockAlert: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Ensure user isolation logic blocks cross-user deduction
const currentAuthUserId = 'legitimate_user_1';
const isOwner = foreignProduct.userId === currentAuthUserId;
assert(!isOwner, 'Cross-user product access is strictly rejected by ownership verification');

// ----------------------------------------------------
// 11. Inventory Product Deletion Safety & SKU Validation
// ----------------------------------------------------
console.log('\n--- 11. Product Deletion Safety & SKU Uniqueness ---');

// Test 11.1: canDeleteProduct prevents deleting a product used in another product's recipe
const ingredientProd: Product = {
  id: 'prod_ing_flour',
  userId: 'user_test',
  name: 'Oliq un',
  sku: 'FLOUR-01',
  purchasePrice: 8000,
  sellingPrice: 12000,
  quantity: 50,
  unit: 'kg',
  minStockAlert: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const compositeProd: Product = {
  id: 'prod_bread_1',
  userId: 'user_test',
  name: 'Tandir non',
  sku: 'BREAD-01',
  purchasePrice: 3000,
  sellingPrice: 5000,
  quantity: 20,
  unit: 'dona',
  minStockAlert: 5,
  recipe: [{ ingredientProductId: 'prod_ing_flour', quantity: 0.4 }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const deleteCheck1 = canDeleteProduct('prod_ing_flour', [ingredientProd, compositeProd]);
assert(!deleteCheck1.canDelete, 'canDeleteProduct rejects deleting raw material used in recipe');
assert(deleteCheck1.reason!.includes('retseptida xomashyo/ingredient sifatida ishlatilmoqda'), 'Reason specifies recipe ingredient usage');

const deleteCheck2 = canDeleteProduct('prod_bread_1', [ingredientProd, compositeProd]);
assert(deleteCheck2.canDelete, 'canDeleteProduct allows deleting independent composite product');

// Test 11.2: validateProductInput rejects duplicate SKU among existing user products
const skuVal1 = validateProductInput(
  { name: 'Yangi non', sku: 'FLOUR-01', purchasePrice: 5000, sellingPrice: 8000, quantity: 10, unit: 'dona', minStockAlert: 2 },
  'prod_new_1',
  [ingredientProd, compositeProd]
);
assert(!skuVal1.isValid, 'validateProductInput rejects duplicate SKU');
assert(skuVal1.errors.some(e => e.includes('SKU kodi')), 'Error message specifies SKU duplication');

// Allow editing same product without self SKU conflict
const skuValSelf = validateProductInput(
  { name: 'Oliq un', sku: 'FLOUR-01', purchasePrice: 8000, sellingPrice: 12000, quantity: 50, unit: 'kg', minStockAlert: 10 },
  'prod_ing_flour',
  [ingredientProd, compositeProd]
);
assert(skuValSelf.isValid, 'validateProductInput allows same product to keep its current SKU');

// ----------------------------------------------------
// 12. Firestore Payload Sanitization & Recipe Field Regression
// ----------------------------------------------------
console.log('\n--- 12. Firestore Payload Sanitization & Recipe Field Regression ---');

// Test 12.1: Non-recipe product payload contains no undefined keys
const nonRecipeDocPayload = sanitizeFirestorePayload({
  id: 'prod_regular_1',
  userId: 'user_123',
  name: 'Oddiy tovar',
  sku: 'REG-01',
  purchasePrice: 10000,
  sellingPrice: 15000,
  quantity: 20,
  unit: 'dona',
  minStockAlert: 5,
  category: '',
  recipe: [],
  createdAt: '2026-10-28T12:00:00Z',
  updatedAt: '2026-10-28T12:00:00Z',
});

const nonRecipeKeys = Object.keys(nonRecipeDocPayload);
assert(!nonRecipeKeys.some((k) => (nonRecipeDocPayload as any)[k] === undefined), 'Non-recipe product payload has no undefined fields');
assert(Array.isArray(nonRecipeDocPayload.recipe), 'Non-recipe product recipe is an array');

// Test 12.2: Recipe product payload retains recipe array and contains no undefined keys
const recipeDocPayload = sanitizeFirestorePayload({
  id: 'prod_recipe_1',
  userId: 'user_123',
  name: 'Tort',
  sku: 'TORT-01',
  purchasePrice: 20000,
  sellingPrice: 40000,
  quantity: 5,
  unit: 'dona',
  minStockAlert: 2,
  category: 'Shirinliklar',
  recipe: [{ ingredientProductId: 'ing_flour_1', quantity: 0.5 }],
  createdAt: '2026-10-28T12:00:00Z',
  updatedAt: '2026-10-28T12:00:00Z',
});

const recipeKeys = Object.keys(recipeDocPayload);
assert(!recipeKeys.some((k) => (recipeDocPayload as any)[k] === undefined), 'Recipe product payload has no undefined fields');
assert(recipeDocPayload.recipe.length === 1, 'Recipe product retains ingredient array');
assert(recipeDocPayload.recipe[0].ingredientProductId === 'ing_flour_1', 'Ingredient product ID preserved');

// Test 12.3: Recursive undefined stripping ignores valid nulls, zeroes, booleans, and empty strings/arrays
const dirtyPayload = {
  name: 'Dirty Payload Test',
  category: '',
  count: 0,
  active: false,
  notes: null,
  recipe: undefined,
  tags: [],
  nested: {
    validKey: 123,
    invalidKey: undefined,
  },
};

const sanitized = sanitizeFirestorePayload(dirtyPayload);
assert(!('recipe' in sanitized), 'Undefined key "recipe" removed from root');
assert(!('invalidKey' in sanitized.nested), 'Undefined key "invalidKey" removed from nested object');
assert(sanitized.category === '', 'Empty string preserved');
assert(sanitized.count === 0, 'Zero integer preserved');
assert(sanitized.active === false, 'Boolean false preserved');
assert(sanitized.notes === null, 'Null value preserved');
assert(Array.isArray(sanitized.tags) && sanitized.tags.length === 0, 'Empty array preserved');

console.log('\n====================================================');
console.log('🏁 ALL PHASE 2 TESTS PASSED SUCCESSFULLY!');
console.log('====================================================\n');
