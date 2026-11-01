import React, { useState, useId } from 'react';
import {
  X,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { Product } from '../types/inventory';
import {
  parseProductCsv,
  generateSampleProductCsv,
  CsvParseSummary,
  ParsedProductRow,
} from '../utils/csvProductParser';
import { batchImportProducts } from '../services/inventoryService';

interface ProductCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (result: { added: number; updated: number; failed: number }) => void;
  existingProducts: Product[];
  userId: string;
}

export const ProductCsvImportModal: React.FC<ProductCsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  existingProducts,
  userId,
}) => {
  const fileInputId = useId();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'update' | 'skip'>('update');
  const [summary, setSummary] = useState<CsvParseSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ added: number; updated: number; failed: number } | null>(null);

  if (!isOpen) return null;

  // Handle sample file download
  const handleDownloadSample = () => {
    const csvData = generateSampleProductCsv();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'besto_mahsulotlar_namuna.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
      const parsed = parseProductCsv(content, existingProducts, importMode);
      setSummary(parsed);
    };
    reader.onerror = () => {
      setErrorMessage("Faylni o'qishda xatolik yuz berdi. Iltimos, CSV faylni qayta tanlang.");
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Re-parse when mode changes
  const handleModeChange = (newMode: 'update' | 'skip') => {
    setImportMode(newMode);
    if (fileContent) {
      const parsed = parseProductCsv(fileContent, existingProducts, newMode);
      setSummary(parsed);
    }
  };

  // Execute Batch Import
  const handleExecuteImport = async () => {
    if (!summary || summary.validRows === 0 || !userId) return;

    setIsImporting(true);
    setErrorMessage(null);

    try {
      const result = await batchImportProducts(
        userId,
        summary.rows,
        importMode,
        existingProducts
      );

      setImportResult(result);
      onImportSuccess(result);
    } catch (err: any) {
      setErrorMessage(err?.message || "Ommaviy import qilishda xatolik yuz berdi.");
    } finally {
      setIsImporting(false);
    }
  };

  const resetAll = () => {
    setFileContent(null);
    setFileName(null);
    setSummary(null);
    setImportResult(null);
    setErrorMessage(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#112521]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden overscroll-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isImporting) onClose();
      }}
      role="presentation"
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-modal border border-[#E0ECE8] flex flex-col max-h-[calc(100vh-24px)] max-h-[calc(100dvh-24px)] my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[#E0ECE8] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D7F0E5] text-[#173B35] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#112521]">
                Mahsulotlarni CSV orqali ommaviy yuklash
              </h3>
              <p className="text-xs text-[#2A5C52]">
                Excel yoki 1C dan eksport qilingan tovarlarni bir zumda omborga kiritish
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="text-[#2A5C52] hover:text-[#112521] p-1.5 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2 overscroll-contain">
          {/* Success Result Banner */}
          {importResult && (
            <div className="p-4 bg-[#D7F0E5] border border-[#23584F]/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#173B35]">
                <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                <span>Ommaviy import muvaffaqiyatli yakunlandi!</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-[#E0ECE8] text-center">
                  <span className="text-[#2A5C52] block">Yangi qo'shildi</span>
                  <strong className="text-base font-bold text-[#10B981]">{importResult.added}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E0ECE8] text-center">
                  <span className="text-[#2A5C52] block">Yangilandi</span>
                  <strong className="text-base font-bold text-[#173B35]">{importResult.updated}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E0ECE8] text-center">
                  <span className="text-[#2A5C52] block">Xato / Rad etildi</span>
                  <strong className="text-base font-bold text-rose-600">{importResult.failed}</strong>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#173B35] text-white rounded-xl text-xs font-bold btn-tactile"
                >
                  Omborga qaytish
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!importResult && (
            <>
              {/* Instructions and Sample download */}
              <div className="p-4 bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#112521] block">
                    1. CSV andoza faylidan foydalaning
                  </span>
                  <p className="text-[11px] text-[#2A5C52] leading-relaxed max-w-xl">
                    Kerakli ustunlar: <code className="bg-white px-1 py-0.5 rounded border border-[#E0ECE8] font-mono text-[10px]">name, sku, costPrice, salePrice, initialStock, unit, minimumStock</code>.
                    UTF-8, vergul (,) va nuqtali vergul (;) ajratgichlari qo'llab-quvvatlanadi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="px-3.5 py-2 bg-white hover:bg-[#D7F0E5]/40 border border-[#E0ECE8] text-[#173B35] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shrink-0 btn-tactile"
                >
                  <Download className="w-3.5 h-3.5 text-[#173B35]" />
                  <span>Namuna CSV</span>
                </button>
              </div>

              {/* File Upload Zone */}
              {!summary ? (
                <div className="border-2 border-dashed border-[#E0ECE8] hover:border-[#173B35] rounded-2xl p-8 text-center transition-all bg-[#F6F8F7]/50">
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor={fileInputId}
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#D7F0E5] text-[#173B35] flex items-center justify-center shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[#173B35] block">
                        CSV faylni yuklash uchun bosing
                      </span>
                      <span className="text-xs text-[#2A5C52]">yoki faylni shu yerga tortib keling</span>
                    </div>
                    <span className="text-[10px] text-[#2A5C52]/70">Maksimal hajm: 5MB (.csv)</span>
                  </label>
                </div>
              ) : (
                /* File Selected and Parsed Preview */
                <div className="space-y-4">
                  {/* Mode and File Status Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-[#173B35] shrink-0" />
                      <span className="text-xs font-bold text-[#112521] truncate max-w-[200px]">
                        {fileName}
                      </span>
                      <button
                        type="button"
                        onClick={resetAll}
                        className="text-[11px] text-rose-600 hover:underline ml-2"
                      >
                        Boshqa fayl tanlash
                      </button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[#2A5C52] font-medium">Takroriy SKU:</span>
                      <div className="inline-flex rounded-xl p-0.5 bg-white border border-[#E0ECE8]">
                        <button
                          type="button"
                          onClick={() => handleModeChange('update')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            importMode === 'update'
                              ? 'bg-[#173B35] text-white shadow-xs'
                              : 'text-[#2A5C52] hover:text-[#112521]'
                          }`}
                        >
                          Yangilash
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModeChange('skip')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            importMode === 'skip'
                              ? 'bg-[#173B35] text-white shadow-xs'
                              : 'text-[#2A5C52] hover:text-[#112521]'
                          }`}
                        >
                          O'tkazib yuborish
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-white border border-[#E0ECE8] rounded-xl">
                      <span className="text-[#2A5C52] block text-[10px]">Jami satr</span>
                      <strong className="text-sm font-bold text-[#112521]">{summary.totalRows}</strong>
                    </div>
                    <div className="p-2.5 bg-[#D7F0E5]/50 border border-[#23584F]/20 rounded-xl">
                      <span className="text-[#173B35] block text-[10px]">To'g'ri (Valid)</span>
                      <strong className="text-sm font-bold text-[#173B35]">{summary.validRows}</strong>
                    </div>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-emerald-700 block text-[10px]">Yangi tovar</span>
                      <strong className="text-sm font-bold text-emerald-800">+{summary.toInsert}</strong>
                    </div>
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                      <span className="text-blue-700 block text-[10px]">Yangilanadi</span>
                      <strong className="text-sm font-bold text-blue-800">{summary.toUpdate}</strong>
                    </div>
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                      <span className="text-rose-700 block text-[10px]">Xatoliklar</span>
                      <strong className="text-sm font-bold text-rose-700">{summary.invalidRows}</strong>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-[#E0ECE8] rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#F6F8F7] sticky top-0 border-b border-[#E0ECE8] text-[#112521] font-bold">
                        <tr>
                          <th className="p-2.5 pl-3">#</th>
                          <th className="p-2.5">Holat</th>
                          <th className="p-2.5">Mahsulot nomi</th>
                          <th className="p-2.5">SKU</th>
                          <th className="p-2.5">Xarid</th>
                          <th className="p-2.5">Sotuv</th>
                          <th className="p-2.5">Miqdor</th>
                          <th className="p-2.5 pr-3">Xatolik / Izoh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0ECE8]">
                        {summary.rows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={row.isValid ? 'hover:bg-[#F6F8F7]/60' : 'bg-red-50/50 hover:bg-red-50'}
                          >
                            <td className="p-2.5 pl-3 font-mono text-[#2A5C52] text-[11px]">
                              {row.rowNumber}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              {row.isValid ? (
                                row.action === 'insert' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    Yangi
                                  </span>
                                ) : row.action === 'update' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                    Yangilash
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                    O'tkazish
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                  Xato
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-medium text-[#112521] max-w-[160px] truncate" title={row.name}>
                              {row.name || <span className="text-rose-500 italic">Bo'sh</span>}
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-[#2A5C52]">
                              {row.sku}
                            </td>
                            <td className="p-2.5 font-mono">{row.costPrice.toLocaleString()}</td>
                            <td className="p-2.5 font-mono font-bold text-[#173B35]">
                              {row.salePrice.toLocaleString()}
                            </td>
                            <td className="p-2.5 font-mono">
                              {row.initialStock} {row.unit}
                            </td>
                            <td className="p-2.5 pr-3 text-[11px]">
                              {row.errors.length > 0 ? (
                                <span className="text-rose-600 font-medium">
                                  {row.errors.join('; ')}
                                </span>
                              ) : (
                                <span className="text-emerald-700">✓ Tayyor</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!importResult && (
          <div className="shrink-0 pt-4 border-t border-[#E0ECE8] flex items-center justify-between gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2.5 rounded-xl border border-[#E0ECE8] text-xs font-bold text-[#173B35] hover:bg-[#F6F8F7] transition-colors"
            >
              Bekor qilish
            </button>

            {summary && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || summary.validRows === 0}
                className="px-5 py-2.5 rounded-xl bg-[#173B35] hover:bg-[#112521] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 btn-tactile cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Yuklanmoqda ({summary.validRows} ta)...</span>
                  </>
                ) : (
                  <>
                    <span>Importni tasdiqlash ({summary.validRows} ta tovar)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#F5B85C]" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
