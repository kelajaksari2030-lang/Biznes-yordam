/**
 * Number formatting and financial calculations with Uzbek locale standards
 */

import { ProfitInputs, ProfitResults } from '../types';

/**
 * Formats a number with space thousand separators (e.g., 1 250 000)
 */
export function formatNumber(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0';
  const rounded = Math.round(value * 100) / 100;
  const parts = rounded.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
}

/**
 * Formats a number as Uzbek Soums (e.g., 1 250 000 so'm)
 */
export function formatUzbekSom(value: number): string {
  return `${formatNumber(value)} so'm`;
}

/**
 * Formats a percentage with 1 decimal place (e.g., 25.5%)
 */
export function formatPercent(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0%';
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}

/**
 * Parses user text input into a safe non-negative number
 */
export function parseCleanNumber(input: string | number): number {
  if (typeof input === 'number') {
    return Math.max(0, isNaN(input) ? 0 : input);
  }
  const cleanStr = input.replace(/\s+/g, '').replace(/,/g, '.');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

/**
 * Calculates comprehensive profit, margins, markups and break-even points
 */
export function calculateProfitResults(inputs: ProfitInputs): ProfitResults {
  const purchaseCost = Math.max(0, inputs.purchaseCost);
  const sellingPrice = Math.max(0, inputs.sellingPrice);
  const quantity = Math.max(0, inputs.quantity);
  const extraCostPerItem = Math.max(0, inputs.extraCostPerItem);
  const fixedCosts = Math.max(0, inputs.fixedCosts);

  const totalRevenue = sellingPrice * quantity;
  const totalDirectCost = purchaseCost * quantity;
  const totalExtraItemCost = extraCostPerItem * quantity;
  const totalAllCost = totalDirectCost + totalExtraItemCost + fixedCosts;

  const netProfit = totalRevenue - totalAllCost;
  const profitPerItem = quantity > 0 ? netProfit / quantity : 0;

  // Margin % = (Net Profit / Total Revenue) * 100
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Unit direct cost
  const unitCost = purchaseCost + extraCostPerItem;

  // Markup % = ((Selling Price - Unit Direct Cost) / Unit Direct Cost) * 100
  const markupPercent = unitCost > 0 ? ((sellingPrice - unitCost) / unitCost) * 100 : 0;

  // Contribution margin per unit for break-even
  const unitContribution = sellingPrice - unitCost;
  const breakEvenUnits = unitContribution > 0 ? Math.ceil(fixedCosts / unitContribution) : 0;

  return {
    totalRevenue,
    totalDirectCost,
    totalExtraItemCost,
    totalFixedCost: fixedCosts,
    totalAllCost,
    netProfit,
    profitPerItem,
    marginPercent,
    markupPercent,
    breakEvenUnits,
    isProfitable: netProfit >= 0,
  };
}
