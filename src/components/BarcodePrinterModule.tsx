/**
 * BiznesYordam - Barcode & Thermal Printing Module Component
 * EAN-13 Barcode generator/validator and thermal receipt printer setup.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types/inventory';
import { PrinterConfig } from '../types/modules';
import { getProducts } from '../services/inventoryService';
import { generateEan13Barcode, validateEan13Barcode, generateBarcodeSvgString, printReceipt, DEFAULT_PRINTER_CONFIG } from '../services/barcodePrinterService';
import { QrCode, Barcode, Printer, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export function BarcodePrinterModule() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [generatedBarcode, setGeneratedBarcode] = useState('');
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; reason?: string } | null>(null);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(DEFAULT_PRINTER_CONFIG);
  const [loading, setLoading] = useState(true);
  const [printFeedback, setPrintFeedback] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    getProducts(user.uid)
      .then((pList) => {
        setProducts(pList);
        if (pList.length > 0) {
          setSelectedProductId(pList[0].id);
          setGeneratedBarcode(generateEan13Barcode(pList[0].id));
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleGenerateNew = () => {
    const newCode = generateEan13Barcode();
    setGeneratedBarcode(newCode);
    setValidationResult(validateEan13Barcode(newCode));
  };

  const handleBarcodeChange = (val: string) => {
    setGeneratedBarcode(val);
    setValidationResult(validateEan13Barcode(val));
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0ECE8] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2.5 rounded-xl bg-[#D7F0E5] text-[#173B35]">
              <Barcode className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#112521]">Shtrix-kod va Chek Chop Etish (Print Lab)</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            EAN-13 va QR-kod generatsiyasi, mahsulot etiketkasi hamda 58mm/80mm termoprinter sozlamalari
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Barcode Generator & Label Designer */}
        <div className="bg-white p-6 rounded-2xl border border-[#E0ECE8] shadow-sm space-y-5">
          <div className="flex items-center space-x-2 border-b pb-3 border-[#E0ECE8]">
            <Barcode className="w-5 h-5 text-[#173B35]" />
            <h3 className="font-bold text-lg text-[#112521]">EAN-13 Shtrix-kod Generatori</h3>
          </div>

          <div className="space-y-4">
            {!loading && products.length === 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Omborda mahsulotlar mavjud emas. Avval Ombor bo'limidan tovar qo'shing yoki quyida namunaviy shtrix-kod yarating.
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mahsulotni Tanlang</label>
              <select
                value={selectedProductId}
                disabled={products.length === 0}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find((pr) => pr.id === e.target.value);
                  const code = generateEan13Barcode(p?.id);
                  setGeneratedBarcode(code);
                  setValidationResult(validateEan13Barcode(code));
                }}
                className="w-full px-3 py-2.5 min-h-[44px] border rounded-xl bg-white disabled:bg-gray-50 disabled:text-gray-500"
              >
                {products.length === 0 ? (
                  <option value="">Omborda mahsulot yo'q</option>
                ) : (
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sellingPrice.toLocaleString()} UZS)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-gray-600">EAN-13 Kodi (13 ta raqam)</label>
                <button
                  type="button"
                  onClick={handleGenerateNew}
                  className="text-xs font-semibold text-[#173B35] flex items-center space-x-1 hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Yangi generatsiya</span>
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={13}
                value={generatedBarcode}
                onChange={(e) => handleBarcodeChange(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] border rounded-xl font-mono text-lg font-bold text-center tracking-widest text-[#173B35]"
              />
            </div>

            {validationResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  validationResult.isValid ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {validationResult.isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>EAN-13 nazorat raqami (checksum) to'g'ri va tasdiqlandi.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>{validationResult.reason}</span>
                  </>
                )}
              </div>
            )}

            {/* Label Preview Card */}
            <div className="bg-[#F6F8F7] p-5 rounded-2xl border border-dashed border-[#173B35] text-center space-y-3">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Etiketka Namunasi</span>
              <div className="bg-white p-4 rounded-xl shadow-sm max-w-xs mx-auto border space-y-2">
                <p className="font-bold text-sm text-[#112521] line-clamp-1">{selectedProduct?.name || 'Mahsulot Nomi'}</p>
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateBarcodeSvgString(generatedBarcode || '4780000000000'),
                  }}
                />
                <p className="font-bold text-lg text-[#173B35]">
                  {(selectedProduct?.sellingPrice || 0).toLocaleString()} UZS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Thermal Printer Setup */}
        <div className="bg-white p-6 rounded-2xl border border-[#E0ECE8] shadow-sm space-y-5">
          <div className="flex items-center space-x-2 border-b pb-3 border-[#E0ECE8]">
            <Printer className="w-5 h-5 text-[#173B35]" />
            <h3 className="font-bold text-lg text-[#112521]">Termoprinter va Chek Sozlamalari</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Kassa Chek O'lchami</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrinterConfig((p) => ({ ...p, receiptWidth: '58mm' }))}
                  className={`py-2.5 rounded-xl font-bold text-sm border transition ${
                    printerConfig.receiptWidth === '58mm'
                      ? 'bg-[#173B35] text-white border-[#173B35]'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  58mm (Kichik Kassa)
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterConfig((p) => ({ ...p, receiptWidth: '80mm' }))}
                  className={`py-2.5 rounded-xl font-bold text-sm border transition ${
                    printerConfig.receiptWidth === '80mm'
                      ? 'bg-[#173B35] text-white border-[#173B35]'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  80mm (Katta Kassa)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Chek Yuqori Sarlavhasi (Header)</label>
              <input
                type="text"
                value={printerConfig.headerText}
                onChange={(e) => setPrinterConfig((p) => ({ ...p, headerText: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Chek Osti Matni (Footer)</label>
              <input
                type="text"
                value={printerConfig.footerText}
                onChange={(e) => setPrinterConfig((p) => ({ ...p, footerText: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>

            {printFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  printFeedback.type === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{printFeedback.text}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setPrintFeedback(null);
                  const res = printReceipt(
                    {
                      id: 'test_ord_1',
                      userId: user?.uid || '',
                      orderNumber: 'ORD-8888',
                      customerId: 'test',
                      customerName: 'Sinov Mijoz',
                      items: [
                        {
                          productId: selectedProduct?.id || '1',
                          productName: selectedProduct?.name || 'Namuna Tovar',
                          quantity: 2,
                          unitPrice: selectedProduct?.sellingPrice || 50000,
                          unitCost: selectedProduct?.purchasePrice || 30000,
                          totalPrice: (selectedProduct?.sellingPrice || 50000) * 2,
                          totalCost: (selectedProduct?.purchasePrice || 30000) * 2,
                        },
                      ],
                      totalAmount: (selectedProduct?.sellingPrice || 50000) * 2,
                      totalCost: (selectedProduct?.purchasePrice || 30000) * 2,
                      totalProfit: ((selectedProduct?.sellingPrice || 50000) - (selectedProduct?.purchasePrice || 30000)) * 2,
                      status: 'delivered',
                      paymentStatus: 'paid',
                      paidAmount: (selectedProduct?.sellingPrice || 50000) * 2,
                      stockDeducted: true,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                    'BESTO Market',
                    printerConfig
                  );
                  if (!res.success && res.error) {
                    setPrintFeedback({ type: 'error', text: res.error });
                  }
                }}
                className="w-full py-3 min-h-[44px] bg-[#173B35] text-white font-bold rounded-xl shadow-sm hover:bg-[#112521] transition flex items-center justify-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>Namuna Chekni Chop Etish (Test Print)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
