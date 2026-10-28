/**
 * BiznesYordam - Warehouse & Inventory Types
 */

export type ProductUnit = 'dona' | 'kg' | 'metr' | 'poy' | 'quti' | 'litr' | 'to‘plam' | 'boshqa';

export interface Product {
  id: string;
  userId: string;
  name: string;
  sku: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  unit: ProductUnit;
  minStockAlert: number;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<Product, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'sku'> & {
  sku?: string;
};

export const PRODUCT_UNITS: { id: ProductUnit; label: string }[] = [
  { id: 'dona', label: 'dona (d)' },
  { id: 'kg', label: 'kilogramm (kg)' },
  { id: 'metr', label: 'metr (m)' },
  { id: 'poy', label: 'poy (juft)' },
  { id: 'quti', label: 'quti (upakovka)' },
  { id: 'litr', label: 'litr (l)' },
  { id: 'to‘plam', label: 'to‘plam (komplekt)' },
  { id: 'boshqa', label: 'boshqa' },
];
