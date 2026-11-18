/**
 * BiznesYordam - Barcode & Thermal Printing Service
 * Generates valid EAN-13 barcodes with checksum calculation,
 * formats 58mm / 80mm thermal receipts, and handles browser label printing.
 */

import { Order } from '../types/business';
import { Product } from '../types/inventory';
import { PrinterConfig } from '../types/modules';

/**
 * Calculates EAN-13 checksum digit for a 12-digit string
 */
export function calculateEan13Checksum(first12Digits: string): number {
  const digits = first12Digits.replace(/\D/g, '');
  if (digits.length !== 12) {
    throw new Error("EAN-13 hisoblash uchun 12 ta raqam kerak");
  }

  let sumOdd = 0;
  let sumEven = 0;

  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits[i], 10);
    if ((i + 1) % 2 === 1) {
      sumOdd += d; // Odd position (1, 3, 5, ...)
    } else {
      sumEven += d; // Even position (2, 4, 6, ...)
    }
  }

  const total = sumOdd + sumEven * 3;
  const remainder = total % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Generates a full 13-digit EAN-13 barcode from product ID or timestamp
 */
export function generateEan13Barcode(productIdOrSeed?: string): string {
  let seed = (productIdOrSeed || Date.now().toString()).replace(/\D/g, '');
  // Default prefix for Uzbekistan UZS products: 478
  const prefix = '478';
  if (seed.length < 9) {
    seed = seed.padStart(9, '0');
  } else {
    seed = seed.slice(-9);
  }
  const first12 = `${prefix}${seed}`;
  const checksum = calculateEan13Checksum(first12);
  return `${first12}${checksum}`;
}

/**
 * Validates 13-digit EAN-13 barcode with checksum verification
 */
export function validateEan13Barcode(barcode: string): { isValid: boolean; reason?: string } {
  const clean = barcode.trim();
  if (!/^\d{13}$/.test(clean)) {
    return { isValid: false, reason: "Shtrix-kod roppa-rosa 13 ta raqamdan iborat bo'lishi kerak" };
  }

  const first12 = clean.slice(0, 12);
  const expectedCheckDigit = calculateEan13Checksum(first12);
  const actualCheckDigit = parseInt(clean[12], 10);

  if (expectedCheckDigit !== actualCheckDigit) {
    return {
      isValid: false,
      reason: `Shtrix-kod nazorat raqami noto'g'ri (kutilgan: ${expectedCheckDigit}, kiritilgan: ${actualCheckDigit})`,
    };
  }

  return { isValid: true };
}

/**
 * Generates lightweight SVG SVG visualization of EAN-13 barcode bars
 */
export function generateBarcodeSvgString(barcode: string): string {
  const clean = barcode.replace(/\D/g, '').padEnd(13, '0').slice(0, 13);
  // Pattern rendering simulation for thermal labels
  const bars: string[] = [];
  let x = 10;
  for (let i = 0; i < clean.length; i++) {
    const digit = parseInt(clean[i], 10);
    const barWidth = (digit % 3) + 1;
    const isSpace = i % 2 === 1;
    if (!isSpace) {
      bars.push(`<rect x="${x}" y="5" width="${barWidth * 2}" height="40" fill="#112521" />`);
    }
    x += barWidth * 2 + 2;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 10} 60" width="100%" height="60">
    <rect width="100%" height="100%" fill="#ffffff"/>
    ${bars.join('\n')}
    <text x="${(x + 10) / 2}" y="55" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle" fill="#112521">${clean}</text>
  </svg>`;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  receiptWidth: '80mm',
  headerText: 'BESTO POS - Savdo Cheki',
  footerText: 'Xaridingiz uchun rahmat! Yana kutib qolamiz.',
  showQrCode: true,
  showLoyaltyPoints: true,
  autoPrintAfterSale: false,
};

/**
 * Triggers thermal receipt print dialog in browser
 */
export function printReceipt(
  order: Order,
  companyName: string = 'BESTO Market',
  config: PrinterConfig = DEFAULT_PRINTER_CONFIG
): { success: boolean; error?: string } {
  const widthClass = config.receiptWidth === '58mm' ? 'max-w-[58mm]' : 'max-w-[80mm]';
  const formattedItems = order.items
    .map(
      (it) => `
      <tr style="border-bottom: 1px dashed #ccc;">
        <td style="padding: 4px 0;">${it.productName}<br/><small>${it.quantity} x ${it.unitPrice.toLocaleString()} UZS</small></td>
        <td style="text-align: right; vertical-align: top; padding: 4px 0;">${it.totalPrice.toLocaleString()} UZS</td>
      </tr>
    `
    )
    .join('');

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    return {
      success: false,
      error: "Printer oynasini ochish brauzer tomonidan bloklandi. Brauzerda pop-up oynalarga ruxsat bering.",
    };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>BESTO Savdo Cheki - ${order.orderNumber || order.id}</title>
        <style>
          @page { size: ${config.receiptWidth} auto; margin: 0; }
          body { font-family: monospace, sans-serif; font-size: 12px; margin: 0; padding: 8px; color: #000; background: #fff; }
          .container { width: 100%; ${widthClass}; margin: 0 auto; text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
          .bold { font-weight: bold; }
          .total-row { font-size: 14px; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 style="margin: 0;">${companyName}</h2>
          <div style="font-size: 10px; margin-bottom: 4px;">${config.headerText}</div>
          <div style="font-size: 10px;">Buyurtma: #${order.orderNumber || order.id.slice(-6)}</div>
          <div style="font-size: 10px;">Sana: ${new Date(order.createdAt).toLocaleString()}</div>
          <div style="font-size: 10px;">Mijoz: ${order.customerName}</div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th>Tovar</th>
                <th style="text-align: right;">Jami</th>
              </tr>
            </thead>
            <tbody>
              ${formattedItems}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="total-row bold" style="display: flex; justify-content: space-between;">
            <span>JAMI:</span>
            <span>${order.totalAmount.toLocaleString()} UZS</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px;">
            <span>To'landi:</span>
            <span>${(order.paidAmount || order.totalAmount).toLocaleString()} UZS</span>
          </div>
          <div class="divider"></div>
          <div style="font-size: 10px; margin-top: 8px;">${config.footerText}</div>
          <div style="font-size: 9px; margin-top: 6px; color: #666;">BESTO SaaS platformasi orqali chop etildi</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  return { success: true };
}
