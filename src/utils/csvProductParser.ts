/**
 * BESTO - Product CSV Bulk Import Parser and Validator
 * Supports UTF-8, UTF-8 BOM, comma (,) and semicolon (;) delimiters,
 * quoted fields, field synonyms, and row-by-row validation.
 */

import { Product, ProductUnit } from '../types/inventory';

export interface ParsedProductRow {
  rowNumber: number;
  raw: Record<string, string>;
  name: string;
  sku: string;
  costPrice: number;
  salePrice: number;
  initialStock: number;
  unit: ProductUnit;
  minimumStock: number;
  isValid: boolean;
  errors: string[];
  action: 'insert' | 'update' | 'skip';
  existingProductId?: string;
}

export interface CsvParseSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  toInsert: number;
  toUpdate: number;
  toSkip: number;
  rows: ParsedProductRow[];
}

const VALID_UNITS: Set<ProductUnit> = new Set([
  'dona',
  'kg',
  'metr',
  'poy',
  'quti',
  'litr',
  'to‘plam',
  'boshqa',
]);

/**
 * Normalizes input unit string into canonical ProductUnit
 */
export function normalizeUnit(rawUnit?: string): ProductUnit {
  if (!rawUnit) return 'dona';
  const clean = rawUnit.toLowerCase().trim();

  if (clean === 'd' || clean === 'dona' || clean === 'pcs' || clean === 'piece') return 'dona';
  if (clean === 'kg' || clean === 'kilogramm' || clean === 'kilo') return 'kg';
  if (clean === 'm' || clean === 'metr' || clean === 'meter') return 'metr';
  if (clean === 'poy' || clean === 'juft' || clean === 'pair') return 'poy';
  if (clean === 'quti' || clean === 'karobka' || clean === 'box' || clean === 'upakovka') return 'quti';
  if (clean === 'l' || clean === 'litr' || clean === 'liter') return 'litr';
  if (clean.includes('toplam') || clean.includes("to'plam") || clean.includes('to‘plam') || clean === 'set' || clean === 'komplekt') return 'to‘plam';

  return 'boshqa';
}

/**
 * Generates sample CSV string with UTF-8 BOM for immediate download
 */
export function generateSampleProductCsv(): string {
  const bom = '\uFEFF';
  const header = 'name,sku,costPrice,salePrice,initialStock,unit,minimumStock';
  const rows = [
    'Erkaklar paxtali ko‘ylak,SHIRT-001,85000,140000,25,dona,5',
    'Ayollar charm sumkasi,BAG-002,120000,210000,10,dona,3',
    'Tabiiy paxta matosi,FABRIC-003,18000,32000,150,metr,20',
    'Klassik charm tufli,SHOES-004,190000,310000,18,poy,4',
  ];

  return bom + [header, ...rows].join('\r\n');
}

/**
 * Robust CSV line tokenizer supporting quoted fields containing delimiters and escaped quotes
 */
export function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Auto-detects delimiter (, or ;) from first line
 */
export function detectDelimiter(headerLine: string): string {
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

/**
 * Parses, normalizes, and validates entire CSV string
 */
export function parseProductCsv(
  csvContent: string,
  existingProducts: Product[] = [],
  importMode: 'update' | 'skip' = 'update'
): CsvParseSummary {
  // 1. Strip UTF-8 BOM if present
  let cleanText = csvContent;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  // 2. Split lines
  const rawLines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      toInsert: 0,
      toUpdate: 0,
      toSkip: 0,
      rows: [],
    };
  }

  // 3. Delimiter & Header
  const headerLine = rawLines[0];
  const delimiter = detectDelimiter(headerLine);
  const rawHeaders = parseCsvLine(headerLine, delimiter).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));

  // Header mapping synonyms
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    if (['name', 'mahsulot', 'tovar', 'nomi', 'product', 'title'].includes(h)) {
      headerMap['name'] = idx;
    } else if (['sku', 'artikul', 'shtrixkod', 'shtrix', 'code', 'barcode'].includes(h)) {
      headerMap['sku'] = idx;
    } else if (['costprice', 'tannarx', 'tannarxi', 'xarid', 'xaridnarxi', 'cost', 'purchaseprice'].includes(h)) {
      headerMap['costPrice'] = idx;
    } else if (['saleprice', 'sotuv', 'sotuvnarxi', 'sotish', 'sotishnarxi', 'price'].includes(h)) {
      headerMap['salePrice'] = idx;
    } else if (['initialstock', 'miqdor', 'qoldiq', 'soni', 'stock', 'quantity'].includes(h)) {
      headerMap['initialStock'] = idx;
    } else if (['unit', 'birlik', 'olchov', "o'lchov", 'olchovbirligi'].includes(h)) {
      headerMap['unit'] = idx;
    } else if (['minimumstock', 'minstock', 'minstockalert', 'minimal', 'minqoldiq', 'minlimit'].includes(h)) {
      headerMap['minimumStock'] = idx;
    }
  });

  // Prepare existing SKU map for duplicate checking
  const existingSkuMap = new Map<string, Product>();
  for (const prod of existingProducts) {
    if (prod.sku && prod.sku.trim()) {
      existingSkuMap.set(prod.sku.trim().toLowerCase(), prod);
    }
  }

  const seenSkusInFile = new Set<string>();
  const parsedRows: ParsedProductRow[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    const cells = parseCsvLine(line, delimiter);
    const rowNumber = i + 1; // 1-indexed (header is line 1)

    const rawRecord: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      rawRecord[h] = cells[idx] || '';
    });

    const name = (headerMap['name'] !== undefined ? cells[headerMap['name']] : cells[0] || '').trim();
    let sku = (headerMap['sku'] !== undefined ? cells[headerMap['sku']] : cells[1] || '').trim();
    const rawCost = headerMap['costPrice'] !== undefined ? cells[headerMap['costPrice']] : cells[2];
    const rawSale = headerMap['salePrice'] !== undefined ? cells[headerMap['salePrice']] : cells[3];
    const rawStock = headerMap['initialStock'] !== undefined ? cells[headerMap['initialStock']] : cells[4];
    const rawUnit = headerMap['unit'] !== undefined ? cells[headerMap['unit']] : cells[5];
    const rawMin = headerMap['minimumStock'] !== undefined ? cells[headerMap['minimumStock']] : cells[6];

    const errors: string[] = [];

    // 1. Name validation
    if (!name) {
      errors.push("Mahsulot nomi bo'sh bo'lishi mumkin emas");
    } else if (name.length > 250) {
      errors.push("Mahsulot nomi 250 belgidan oshmasligi kerak");
    }

    // 2. Cost Price validation
    const costPrice = Number(rawCost?.replace(/\s/g, '').replace(',', '.'));
    if (rawCost === undefined || rawCost === '' || isNaN(costPrice) || costPrice < 0) {
      errors.push("Xarid narxi 0 yoki undan katta son bo'lishi shart");
    }

    // 3. Sale Price validation
    const salePrice = Number(rawSale?.replace(/\s/g, '').replace(',', '.'));
    if (rawSale === undefined || rawSale === '' || isNaN(salePrice) || salePrice < 0) {
      errors.push("Sotuv narxi 0 yoki undan katta son bo'lishi shart");
    }

    // 4. Initial Stock validation
    const initialStock = Number(rawStock?.replace(/\s/g, '').replace(',', '.'));
    if (rawStock === undefined || rawStock === '' || isNaN(initialStock) || initialStock < 0) {
      errors.push("Mavjud miqdor 0 yoki undan katta son bo'lishi shart");
    }

    // 5. Unit validation & normalization
    const unit = normalizeUnit(rawUnit);

    // 6. Minimum Stock validation
    let minimumStock = 5;
    if (rawMin !== undefined && rawMin.trim() !== '') {
      const parsedMin = Number(rawMin.replace(/\s/g, '').replace(',', '.'));
      if (isNaN(parsedMin) || parsedMin < 0) {
        errors.push("Minimal ogohlantirish qoldig'i 0 yoki musbat son bo'lishi kerak");
      } else {
        minimumStock = parsedMin;
      }
    }

    // 7. SKU handling & duplicate checks
    if (!sku) {
      // Auto-assign clean SKU preview
      sku = `SKU-AUTO-${rowNumber}`;
    } else {
      const lowerSku = sku.toLowerCase();
      if (seenSkusInFile.has(lowerSku)) {
        errors.push(`Fayl ichida takrorlangan SKU: "${sku}"`);
      } else {
        seenSkusInFile.add(lowerSku);
      }
    }

    // 8. Determine Action (insert vs update vs skip)
    let action: 'insert' | 'update' | 'skip' = 'insert';
    let existingProductId: string | undefined = undefined;

    const matchedExisting = existingSkuMap.get(sku.toLowerCase());
    if (matchedExisting) {
      existingProductId = matchedExisting.id;
      if (importMode === 'update') {
        action = 'update';
      } else {
        action = 'skip';
      }
    }

    parsedRows.push({
      rowNumber,
      raw: rawRecord,
      name,
      sku,
      costPrice: isNaN(costPrice) ? 0 : costPrice,
      salePrice: isNaN(salePrice) ? 0 : salePrice,
      initialStock: isNaN(initialStock) ? 0 : initialStock,
      unit,
      minimumStock,
      isValid: errors.length === 0,
      errors,
      action,
      existingProductId,
    });
  }

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  return {
    totalRows: parsedRows.length,
    validRows: validRows.length,
    invalidRows: invalidRows.length,
    toInsert: validRows.filter((r) => r.action === 'insert').length,
    toUpdate: validRows.filter((r) => r.action === 'update').length,
    toSkip: validRows.filter((r) => r.action === 'skip').length,
    rows: parsedRows,
  };
}
