import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  HelpCircle, 
  Copy, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle, 
  Save, 
  Trash2, 
  RefreshCw,
  Info,
  TrendingUp,
  Percent,
  Database,
  Package
} from 'lucide-react';
import { ProfitInputs, ProfitResults, SavedCalculation } from '../types';
import { 
  formatNumber, 
  formatUzbekSom, 
  formatPercent, 
  calculateProfitResults, 
  parseCleanNumber 
} from '../utils/numberFormat';
import { useAuth } from '../context/AuthContext';
import { getUserCalculations, saveCalculation, deleteCalculation } from '../services/firestore';
import { saveProduct } from '../services/inventoryService';
import { ModuleHelpGuide, HelpGuideButton, HelpStep } from './ModuleHelpGuide';

interface PresetItem {
  title: string;
  inputs: ProfitInputs;
}

const PRESETS: PresetItem[] = [
  {
    title: 'Kiyim va poyabzal',
    inputs: {
      purchaseCost: 120000,
      sellingPrice: 220000,
      quantity: 50,
      extraCostPerItem: 15000, // qadoqlash + yetkazish
      fixedCosts: 1500000, // ijara ulushi
    },
  },
  {
    title: 'Telefon aksessuarlari',
    inputs: {
      purchaseCost: 25000,
      sellingPrice: 70000,
      quantity: 100,
      extraCostPerItem: 5000,
      fixedCosts: 500000,
    },
  },
  {
    title: 'Kosmetika va parvarish',
    inputs: {
      purchaseCost: 80000,
      sellingPrice: 150000,
      quantity: 40,
      extraCostPerItem: 12000,
      fixedCosts: 600000,
    },
  },
  {
    title: 'Hunarmandchilik / Qo\'l mehnati',
    inputs: {
      purchaseCost: 45000,
      sellingPrice: 110000,
      quantity: 30,
      extraCostPerItem: 8000,
      fixedCosts: 300000,
    },
  },
];

export const ProfitCalculator: React.FC = () => {
  const { user } = useAuth();

  const [inputs, setInputs] = useState<ProfitInputs>({
    purchaseCost: 100000,
    sellingPrice: 160000,
    quantity: 20,
    extraCostPerItem: 10000,
    fixedCosts: 0,
  });

  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>(() => {
    try {
      const stored = localStorage.getItem('biznes_saved_calculations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [calcName, setCalcName] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [inventorySaving, setInventorySaving] = useState(false);
  const [inventorySaved, setInventorySaved] = useState(false);
  const [inventoryMsg, setInventoryMsg] = useState<string | null>(null);

  // Help Guide state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem('besto_help_profit_calculator_seen');
      if (!seen) {
        setIsHelpOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const profitHelpSteps: HelpStep[] = useMemo(() => [
    {
      title: "1. Mahsulot va sotuv narxini kiritish",
      description: "Mahsulotning asl xarid tannarxini va mijozga sotish narxini kiriting. Necha dona mahsulot sotishingizni ham ko'rsating.",
      tip: "Kalkulyator kiritilgan raqamlar bo'yicha darhol xarajatlar va daromadni real-vaqt rejimida hisoblaydi.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="30" y="25" width="210" height="75" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="45" y="48" fill="#52796F" fontSize="10" fontWeight="bold">Xarid narxi (1 dona)</text>
          <rect x="45" y="56" width="180" height="30" rx="6" fill="#FAF8F5" stroke="#D7F0E5" strokeWidth="1" />
          <text x="55" y="76" fill="#173B35" fontSize="12" fontWeight="bold" fontFamily="monospace">100 000 so'm</text>

          <rect x="260" y="25" width="210" height="75" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="275" y="48" fill="#173B35" fontSize="10" fontWeight="bold">Mijozga sotish narxi</text>
          <rect x="275" y="56" width="180" height="30" rx="6" fill="#FAF8F5" stroke="#D7F0E5" strokeWidth="1" />
          <text x="285" y="76" fill="#173B35" fontSize="12" fontWeight="bold" fontFamily="monospace">160 000 so'm</text>

          <rect x="30" y="115" width="440" height="80" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="45" y="138" fill="#52796F" fontSize="10" fontWeight="bold">Rejalashtirilgan sotuv miqdori</text>
          <rect x="45" y="148" width="410" height="32" rx="8" fill="#FAF8F5" stroke="#D7F0E5" strokeWidth="1" />
          <text x="60" y="169" fill="#173B35" fontSize="13" fontWeight="bold" fontFamily="monospace">20 dona</text>
        </svg>
      ),
    },
    {
      title: "2. Qo'shimcha va doimiy xarajatlar",
      description: "1 donaga to'g'ri keladigan direct xarajatlarni (qadoq, reklama, kuryer) hamda oylik doimiy ijarasi/maosh kabi xarajatlarni hisobga oling.",
      tip: "Doimiy xarajatlar kiritilsa, kalkulyator do'koningiz zararga kirmasligi uchun kamida necha dona mahsulot sotishi kerakligini (Zararsizlik nuqtasi) ko'rsatib beradi.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="30" y="25" width="440" height="75" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="45" y="48" fill="#52796F" fontSize="10" fontWeight="bold">1 donaga qo'shimcha xarajat (Qadoq + Reklama)</text>
          <rect x="45" y="56" width="410" height="30" rx="6" fill="#FAF8F5" stroke="#D7F0E5" strokeWidth="1" />
          <text x="55" y="76" fill="#173B35" fontSize="12" fontWeight="bold" fontFamily="monospace">10 000 so'm</text>

          <rect x="30" y="115" width="440" height="80" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="45" y="138" fill="#52796F" fontSize="10" fontWeight="bold">Umumiy doimiy xarajatlar (Oylik ijara / kommunal)</text>
          <rect x="45" y="148" width="410" height="32" rx="8" fill="#FAF8F5" stroke="#D7F0E5" strokeWidth="1" />
          <text x="60" y="169" fill="#173B35" fontSize="13" fontWeight="bold" fontFamily="monospace">1 500 000 so'm</text>
        </svg>
      ),
    },
    {
      title: "3. Real-vaqt foyda va marja natijalari",
      description: "O'ng tomonda kutilayotgan umumiy oborot, barcha xarajatlar va o'zingizga qoladigan sof foyda va marja foizi darhol hisoblanadi.",
      tip: "Sotish narxi xarajatdan past bo'lsa, tizim ogohlantirish beradi.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="25" y="20" width="450" height="85" rx="14" fill="#173B35" />
          <text x="45" y="45" fill="#F5B85C" fontSize="11" fontWeight="bold">KUTILAYOTGAN SOF FOYDA</text>
          <text x="45" y="78" fill="#F5B85C" fontSize="24" fontWeight="extrabold" fontFamily="monospace">+1 000 000 so'm</text>

          <rect x="25" y="120" width="215" height="75" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="40" y="142" fill="#52796F" fontSize="10">Jami oborot (Tushum)</text>
          <text x="40" y="168" fill="#173B35" fontSize="15" fontWeight="bold" fontFamily="monospace">3 200 000 so'm</text>

          <rect x="260" y="120" width="215" height="75" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="275" y="142" fill="#173B35" fontSize="10" fontWeight="bold">Foyda marjasi</text>
          <text x="275" y="168" fill="#173B35" fontSize="18" fontWeight="extrabold" fontFamily="monospace">31.25%</text>
        </svg>
      ),
    },
    {
      title: "4. Saqlash, hisobot nusxalash va Omborga o'tkazish",
      description: "Hisoblangan natijalarni xotirada saqlashingiz, matn ko'rinishida Telegram'ga nusxalashingiz yoki 'Omborga saqlash' tugmasi bilan bir bosishda Ombor moduliga tovar qilib kiritishingiz mumkin.",
      tip: "'Omborga saqlash' tugmasi kalkulyatorda hisoblangan narxlarni qayta yozmasdan to'g'ridan-to'g'ri Skladga o'tkazadi.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="25" y="40" width="140" height="45" rx="10" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="38" y="67" fill="#173B35" fontSize="10" fontWeight="bold">💾 Saqlash</text>

          <rect x="180" y="40" width="140" height="45" rx="10" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="192" y="67" fill="#173B35" fontSize="10" fontWeight="bold">📦 Omborga saqlash</text>

          <rect x="335" y="40" width="140" height="45" rx="10" fill="#F5B85C" />
          <text x="348" y="67" fill="#173B35" fontSize="10" fontWeight="bold">📋 Nusxalash</text>

          <rect x="25" y="105" width="450" height="90" rx="12" fill="#D7F0E5" stroke="#173B35" strokeWidth="1" />
          <text x="45" y="130" fill="#173B35" fontSize="11" fontWeight="bold">✓ Muvaffaqiyatli saqlandi!</text>
          <text x="45" y="152" fill="#173B35" fontSize="10">Mahsulot ombor modulingizga xarid va sotuv narxi bilan birga qo'shildi.</text>
        </svg>
      ),
    },
  ], []);

  // Synchronize calculations from Firestore for authenticated user
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    getUserCalculations(user.uid)
      .then((docs) => {
        if (isMounted && docs.length > 0) {
          const mapped: SavedCalculation[] = docs.map((d) => {
            const reconstructedInputs: ProfitInputs = {
              purchaseCost: d.purchaseCost,
              sellingPrice: d.sellingPrice,
              quantity: d.quantity,
              extraCostPerItem: d.extraCostPerItem,
              fixedCosts: d.fixedCosts,
            };
            return {
              id: d.id,
              name: d.name,
              date: d.date,
              inputs: reconstructedInputs,
              results: calculateProfitResults(reconstructedInputs),
            };
          });
          setSavedCalculations(mapped);
          try {
            localStorage.setItem('biznes_saved_calculations', JSON.stringify(mapped));
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => {
        console.warn('Could not load calculations from Firestore:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Compute results real-time
  const results = useMemo(() => {
    return calculateProfitResults(inputs);
  }, [inputs]);

  const handleInputChange = (field: keyof ProfitInputs, value: string) => {
    // Only accept numeric inputs and automatically sanitize
    const parsed = parseCleanNumber(value);
    setInputs((prev) => ({
      ...prev,
      [field]: parsed,
    }));
  };

  const handleSaveCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = calcName.trim() || `Hisob-kitob #${savedCalculations.length + 1}`;
    const newEntry: SavedCalculation = {
      id: Date.now().toString(),
      name,
      date: new Date().toLocaleDateString('uz-UZ'),
      inputs: { ...inputs },
      results: { ...results },
    };

    const updated = [newEntry, ...savedCalculations];
    setSavedCalculations(updated);

    if (user) {
      await saveCalculation(user.uid, {
        id: newEntry.id,
        name: newEntry.name,
        date: newEntry.date,
        purchaseCost: inputs.purchaseCost,
        sellingPrice: inputs.sellingPrice,
        quantity: inputs.quantity,
        extraCostPerItem: inputs.extraCostPerItem,
        fixedCosts: inputs.fixedCosts,
        netProfit: results.netProfit,
        marginPercent: results.marginPercent,
        markupPercent: results.markupPercent,
        createdAt: new Date().toISOString(),
      });
    }

    try {
      localStorage.setItem('biznes_saved_calculations', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setCalcName('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDeleteSaved = async (id: string) => {
    const updated = savedCalculations.filter((c) => c.id !== id);
    setSavedCalculations(updated);

    if (user) {
      await deleteCalculation(user.uid, id);
    }

    try {
      localStorage.setItem('biznes_saved_calculations', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleLoadSaved = (saved: SavedCalculation) => {
    setInputs(saved.inputs);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopySummary = async () => {
    const text = `📊 BESTO — MAHSULOT FOYDA HISOBOTI
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Sotish narxi (1 dona): ${formatUzbekSom(inputs.sellingPrice)}
📦 Xarid tannarxi (1 dona): ${formatUzbekSom(inputs.purchaseCost)}
➕ Qo'shimcha xarajat (1 dona): ${formatUzbekSom(inputs.extraCostPerItem)}
🔢 Sotiladigan miqdor: ${formatNumber(inputs.quantity)} dona
🏢 Oylik doimiy xarajatlar: ${formatUzbekSom(inputs.fixedCosts)}
━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Jami kutilayotgan tushum: ${formatUzbekSom(results.totalRevenue)}
📉 Jami barcha xarajatlar: ${formatUzbekSom(results.totalAllCost)}
💵 Sof foyda: ${formatUzbekSom(results.netProfit)}
🎯 1 donadan sof foyda: ${formatUzbekSom(results.profitPerItem)}
📊 Foyda marjasi: ${formatPercent(results.marginPercent)}
📐 Ustama foizi: ${formatPercent(results.markupPercent)}
${inputs.fixedCosts > 0 ? `⚖️ Zararsizlik nuqtasi: kamida ${results.breakEvenUnits} dona sotish lozim.` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Hisoblash sanasi: ${new Date().toLocaleDateString('uz-UZ')}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSaveToInventory = async () => {
    if (!user) {
      setInventoryMsg("Omborga saqlash uchun iltimos tizimga kiring.");
      setTimeout(() => setInventoryMsg(null), 3000);
      return;
    }
    if (inputs.purchaseCost <= 0 || inputs.sellingPrice <= 0) {
      setInventoryMsg("Xarid tannarxi va sotish narxini 0 dan yuqori qilib kiriting.");
      setTimeout(() => setInventoryMsg(null), 3000);
      return;
    }
    setInventorySaving(true);
    setInventoryMsg(null);
    try {
      const prodName = calcName.trim() || `Mahsulot (${formatUzbekSom(inputs.sellingPrice)})`;
      await saveProduct(user.uid, {
        name: prodName,
        purchasePrice: inputs.purchaseCost,
        sellingPrice: inputs.sellingPrice,
        quantity: Math.max(1, inputs.quantity),
        unit: 'dona',
        minStockAlert: Math.max(1, Math.min(5, Math.round(inputs.quantity * 0.2) || 1)),
        category: 'Kalkulyatordan',
      });
      setInventorySaved(true);
      setInventoryMsg("Mahsulot omborga muvaffaqiyatli saqlandi!");
      setTimeout(() => {
        setInventorySaved(false);
        setInventoryMsg(null);
      }, 3500);
    } catch (err: any) {
      console.error('Failed to save product to inventory:', err);
      setInventoryMsg(err?.message || "Omborga saqlashda xatolik yuz berdi");
      setTimeout(() => setInventoryMsg(null), 3500);
    } finally {
      setInventorySaving(false);
    }
  };

  const handleReset = () => {
    setInputs({
      purchaseCost: 0,
      sellingPrice: 0,
      quantity: 1,
      extraCostPerItem: 0,
      fixedCosts: 0,
    });
  };

  // Warnings
  const isLoss = results.netProfit < 0;
  const isZeroPrice = inputs.sellingPrice <= 0;
  const totalCostPerUnit = inputs.purchaseCost + inputs.extraCostPerItem;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header section */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#112521]">
              Foyda va marja kalkulyatori
            </h1>
            <p className="text-sm text-[#52796F] mt-1 max-w-2xl">
              Mahsulot tannarxi, qo'shimcha xarajatlar va sotish narxini kiritib, kutilayotgan sof foyda hamda marjani bir zumda aniqlang.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HelpGuideButton onClick={() => setIsHelpOpen(true)} />

            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="px-3.5 py-2 text-xs font-medium text-[#112521] bg-white hover:bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl transition-all btn-tactile flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C]"
            >
              <HelpCircle className="w-4 h-4 text-[#173B35]" />
              <span>Marja vs Ustama farqi</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToInventory}
              disabled={inventorySaving || inputs.purchaseCost <= 0 || inputs.sellingPrice <= 0}
              className="px-3.5 py-2 text-xs font-medium text-[#112521] bg-white hover:bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl transition-all btn-tactile flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C] disabled:opacity-50"
              title="Ushbu mahsulotni to'g'ridan-to'g'ri omborga tovar sifatida qo'shish"
            >
              {inventorySaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Omborga saqlandi!</span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 text-[#F5B85C]" />
                  <span>{inventorySaving ? "Saqlanmoqda..." : "Omborga saqlash"}</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopySummary}
              className="px-3.5 py-2 text-xs font-semibold text-[#112521] bg-[#F5B85C] hover:bg-[#E5A749] border border-[#F5B85C]/50 rounded-xl transition-all btn-tactile flex items-center gap-1.5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#112521]" />
                  <span>Nusxalandi!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#112521]" />
                  <span>Hisobotni nusxalash</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Inventory notification toast banner if message exists */}
        {inventoryMsg && (
          <div className="mt-3 p-3 rounded-xl text-xs flex items-center gap-2 bg-[#D7F0E5] text-[#112521] border border-[#E0ECE8] animate-in fade-in duration-200">
            <Info className="w-4 h-4 text-[#F5B85C] shrink-0" />
            <span>{inventoryMsg}</span>
          </div>
        )}

        {/* Quick industry presets */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-medium text-[#52796F] whitespace-nowrap">
            Tayyor namunalar:
          </span>
          {PRESETS.map((preset) => (
            <button
              key={preset.title}
              onClick={() => setInputs({ ...preset.inputs })}
              className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-[#52796F] hover:text-[#112521] whitespace-nowrap transition-all btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C]"
            >
              {preset.title}
            </button>
          ))}
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-[#52796F] hover:text-[#112521] border border-dashed border-[#E0ECE8] rounded-xl whitespace-nowrap transition-all btn-tactile flex items-center gap-1 ml-auto"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Tozalash</span>
          </button>
        </div>
      </div>

      {/* Educational Explanation Box (Marja va Ustama farqi) */}
      {showExplanation && (
        <div className="p-5 bg-white border border-[#E0ECE8] rounded-2xl shadow-card text-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-[#112521] font-semibold">
            <Info className="w-5 h-5 text-[#F5B85C] shrink-0" />
            <span>Marja (Profit Margin) va Ustama (Markup) o'rtasidagi farq nima?</span>
          </div>

          <p className="text-[#52796F] leading-relaxed">
            Ko'plab tadbirkorlar marja va ustamani adashtirishadi, bu esa kutilganidan kamroq foyda olishga olib keladi:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8]">
              <span className="font-semibold text-[#112521] block mb-1">
                1. Ustama foizi (Markup %)
              </span>
              <p className="text-xs text-[#52796F] leading-relaxed">
                Tannarxga necha foiz qo'shib sotayotganingizni ko'rsatadi.
              </p>
              <div className="mt-2 text-xs font-mono bg-white p-2.5 rounded-lg border border-[#E0ECE8] text-[#112521]">
                Formula: ((Sotish narxi - Tannarx) / Tannarx) × 100%
              </div>
            </div>

            <div className="p-3.5 bg-[#D7F0E5] rounded-xl border border-[#E0ECE8]">
              <span className="font-semibold text-[#112521] block mb-1">
                2. Foyda marjasi (Margin %)
              </span>
              <p className="text-xs text-[#52796F] leading-relaxed">
                Har bir so'mlik umumiy tushumning necha foizi sizning cho'ntagingizda sof foyda bo'lib qolishini ko'rsatadi.
              </p>
              <div className="mt-2 text-xs font-mono bg-white p-2.5 rounded-lg border border-[#E0ECE8] text-[#112521]">
                Formula: (Sof foyda / Jami tushum) × 100%
              </div>
            </div>
          </div>

          <p className="text-xs italic bg-[#F6F8F7] p-3 rounded-xl border border-[#E0ECE8] text-[#173B35]">
            <strong>Oddiy misol:</strong> 100 000 so'mga olgan tovaringizni 150 000 so'mga sotsangiz, <strong>Ustama 50%</strong> bo'ladi, lekin <strong>Marjangiz 33.3%</strong> bo'ladi. Hech qachon marja 100% dan oshmaydi!
          </p>
        </div>
      )}

      {/* Main 2-Column Split: Form on Left, Live Financial Cards on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Input Form (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white border border-[#E0ECE8] rounded-2xl p-5 sm:p-6 shadow-card space-y-5">
          <h2 className="text-base font-semibold text-[#112521] border-b border-[#E0ECE8] pb-3">
            Xarajat va sotuv ko'rsatkichlari
          </h2>

          {/* Input: Purchase Cost */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#112521]">
              Mahsulot xarid narxi / Tannarxi (1 dona uchun)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={inputs.purchaseCost === 0 ? '' : formatNumber(inputs.purchaseCost)}
                onChange={(e) => handleInputChange('purchaseCost', e.target.value)}
                placeholder="Masalan: 100 000"
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl input-warm pr-14"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#52796F]">
                so'm
              </span>
            </div>
            <p className="text-[11px] text-[#52796F]">
              Ishlab chiqaruvchi yoki ulgurji bozordan olingan asl narx
            </p>
          </div>

          {/* Input: Extra direct costs per item */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#112521]">
              1 donaga qo'shimcha xarajat (Yetkazish, qadoq, reklama)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={inputs.extraCostPerItem === 0 ? '' : formatNumber(inputs.extraCostPerItem)}
                onChange={(e) => handleInputChange('extraCostPerItem', e.target.value)}
                placeholder="Masalan: 10 000"
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl input-warm pr-14"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#52796F]">
                so'm
              </span>
            </div>
            <p className="text-[11px] text-[#52796F]">
              Paket, quti, 1 donaga to'g'ri keladigan reklama yoki yetkazib berish xarajati
            </p>
          </div>

          {/* Input: Selling Price */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#112521]">
              Mijozga sotish narxi (1 dona uchun)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={inputs.sellingPrice === 0 ? '' : formatNumber(inputs.sellingPrice)}
                onChange={(e) => handleInputChange('sellingPrice', e.target.value)}
                placeholder="Masalan: 160 000"
                className={`w-full px-3.5 py-2.5 text-sm font-mono rounded-xl input-warm pr-14 ${
                  isLoss ? '!border-[#A93C3E] bg-[#FDF4F4]' : ''
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#52796F]">
                so'm
              </span>
            </div>
            {totalCostPerUnit > inputs.sellingPrice && inputs.sellingPrice > 0 && (
              <p className="text-[11px] text-[#A93C3E] font-medium flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Sotish narxi 1 dona umumiy tannarxidan ({formatUzbekSom(totalCostPerUnit)}) past!
              </p>
            )}
          </div>

          {/* Input: Quantity */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#112521]">
              Rejalashtirilgan sotuv miqdori (dona)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={inputs.quantity === 0 ? '' : formatNumber(inputs.quantity)}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                placeholder="Masalan: 20"
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl input-warm pr-14"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#52796F]">
                dona
              </span>
            </div>
          </div>

          {/* Input: Fixed costs (Optional) */}
          <div className="space-y-1.5 pt-2 border-t border-[#E0ECE8]">
            <label className="block text-xs font-semibold text-[#112521]">
              Umumiy doimiy xarajatlar (ixtiyoriy)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={inputs.fixedCosts === 0 ? '' : formatNumber(inputs.fixedCosts)}
                onChange={(e) => handleInputChange('fixedCosts', e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl input-warm pr-14"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#52796F]">
                so'm
              </span>
            </div>
            <p className="text-[11px] text-[#52796F]">
              Masalan: do'kon oylik ijarasi, kommunal to'lov yoki oylik maosh ulushi
            </p>
          </div>

          {/* Save this calculation form */}
          <form onSubmit={handleSaveCalculation} className="pt-3 border-t border-[#E0ECE8] space-y-2">
            <label className="block text-xs font-medium text-[#52796F]">
              Ushbu hisob-kitobni saqlab qo'yish:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={calcName}
                onChange={(e) => setCalcName(e.target.value)}
                placeholder="Masalan: Erkaklar kostyumi partiyasi"
                className="flex-1 px-3 py-2 text-xs rounded-xl input-warm"
              />
              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#173B35] hover:bg-[#102A26] rounded-xl transition-all btn-tactile flex items-center gap-1 shrink-0"
              >
                <Save className="w-3.5 h-3.5 text-[#F5B85C]" />
                <span>Saqlash</span>
              </button>
            </div>
            {saveSuccess && (
              <p className="text-[11px] text-[#173B35] font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-[#047857]" />
                <span>Hisob-kitob muvaffaqiyatli saqlandi!</span>
              </p>
            )}
          </form>
        </div>

        {/* Right Side: Live Results Dashboard (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Profit Status Banner - Executive Deep BESTO Green or Wine Loss banner */}
          <div
            className={`p-6 rounded-2xl border transition-all shadow-card ${
              isLoss
                ? 'bg-[#6B2023] border-[#852C30] text-white'
                : 'bg-[#173B35] border-[#23584F] text-[#F6F8F7]'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold opacity-85 text-[#F5B85C]">
                  {isLoss ? 'Kutilayotgan zarar' : 'Kutilayotgan sof foyda'}
                </span>
                <div className={`text-3xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight mt-1 ${
                  isLoss ? 'text-white' : 'text-[#F5B85C]'
                }`}>
                  {isLoss ? '-' : '+'}
                  {formatUzbekSom(Math.abs(results.netProfit))}
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  isLoss
                    ? 'bg-[#852C30] text-white border-[#A1383D]'
                    : 'bg-[#173B35] text-[#F5B85C] border-[#23584F]'
                }`}
              >
                {isLoss ? (
                  <ArrowDownRight className="w-7 h-7" />
                ) : (
                  <ArrowUpRight className="w-7 h-7" />
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#D7C9BF] block">1 donadan sof foyda:</span>
                <span className="font-bold font-mono text-sm tabular-nums text-white">
                  {formatUzbekSom(results.profitPerItem)}
                </span>
              </div>
              <div>
                <span className="text-[#D7C9BF] block">Foyda marjasi:</span>
                <span className="font-bold font-mono text-sm tabular-nums text-[#F5B85C]">
                  {formatPercent(results.marginPercent)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[#D7C9BF] block">Ustama foizi:</span>
                <span className="font-bold font-mono text-sm tabular-nums text-[#F5B85C]">
                  {formatPercent(results.markupPercent)}
                </span>
              </div>
            </div>
          </div>

          {/* Metric breakdown cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Revenue */}
            <div className="bg-white border border-[#E0ECE8] rounded-2xl p-4 shadow-card card-elevation">
              <span className="text-xs font-medium text-[#52796F] block">
                Jami kutilayotgan tushum (Oborot)
              </span>
              <div className="text-xl font-bold font-mono tabular-nums text-[#112521] mt-1">
                {formatUzbekSom(results.totalRevenue)}
              </div>
              <span className="text-[11px] text-[#52796F] mt-1 block">
                {formatNumber(inputs.quantity)} dona × {formatUzbekSom(inputs.sellingPrice)}
              </span>
            </div>

            {/* Total All Costs */}
            <div className="bg-white border border-[#E0ECE8] rounded-2xl p-4 shadow-card card-elevation">
              <span className="text-xs font-medium text-[#52796F] block">
                Jami barcha xarajatlar
              </span>
              <div className="text-xl font-bold font-mono tabular-nums text-[#112521] mt-1">
                {formatUzbekSom(results.totalAllCost)}
              </div>
              <span className="text-[11px] text-[#52796F] mt-1 block">
                Tannarx + qo'shimcha xarajatlar
              </span>
            </div>
          </div>

          {/* Detailed itemized cost distribution table */}
          <div className="bg-white border border-[#E0ECE8] rounded-2xl p-5 shadow-card">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#173B35] mb-3">
              Xarajatlar taqsimoti tafsiloti
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#E0ECE8]">
                <span className="text-[#52796F]">Xarid tannarxi (Jami):</span>
                <span className="font-mono font-medium text-[#112521] tabular-nums">
                  {formatUzbekSom(results.totalDirectCost)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#E0ECE8]">
                <span className="text-[#52796F]">Donabay qo'shimcha xarajatlar:</span>
                <span className="font-mono font-medium text-[#112521] tabular-nums">
                  {formatUzbekSom(results.totalExtraItemCost)}
                </span>
              </div>

              {inputs.fixedCosts > 0 && (
                <div className="flex items-center justify-between pb-2 border-b border-[#E0ECE8]">
                  <span className="text-[#52796F]">Doimiy umumiy xarajatlar:</span>
                  <span className="font-mono font-medium text-[#112521] tabular-nums">
                    {formatUzbekSom(results.totalFixedCost)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 font-semibold text-[#112521]">
                <span>1 dona mahsulotning to'liq xarajati:</span>
                <span className="font-mono tabular-nums text-[#173B35]">
                  {formatUzbekSom(totalCostPerUnit)}
                </span>
              </div>
            </div>

            {/* Break-even point notice */}
            {inputs.fixedCosts > 0 && (
              <div className="mt-4 pt-4 border-t border-[#E0ECE8] text-xs text-[#52796F] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#F5B85C] shrink-0 mt-0.5" />
                <span>
                  <strong>Zararsizlik chegarasi (Break-even):</strong> Doimiy xarajatlaringizni to'liq qoplash uchun kamida <strong>{results.breakEvenUnits} dona</strong> mahsulot sotishingiz kerak.
                </span>
              </div>
            )}
          </div>

          {/* Saved Calculations Drawer / History */}
          {savedCalculations.length > 0 && (
            <div className="bg-white border border-[#E0ECE8] rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#173B35]">
                  Saqlangan hisob-kitoblar ({savedCalculations.length})
                </h3>
                <span className="text-[11px] text-[#52796F]">
                  Qurilmangizda saqlangan
                </span>
              </div>

              <div className="divide-y divide-[#E0ECE8] max-h-60 overflow-y-auto">
                {savedCalculations.map((calc) => (
                  <div
                    key={calc.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#F6F8F7] px-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#112521] truncate">
                        {calc.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#52796F] mt-0.5">
                        <span>{calc.date}</span>
                        <span>·</span>
                        <span>{formatNumber(calc.inputs.quantity)} dona</span>
                        <span>·</span>
                        <span className="font-mono text-[#173B35] font-medium">
                          {formatUzbekSom(calc.results.netProfit)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleLoadSaved(calc)}
                        className="px-2.5 py-1 text-xs font-medium text-[#112521] hover:bg-white rounded-lg border border-[#E0ECE8] transition-all btn-tactile"
                      >
                        Ochish
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(calc.id)}
                        className="p-1 text-[#52796F] hover:text-[#9E2A2B] transition-colors btn-tactile"
                        title="O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Module Help Guide */}
      <ModuleHelpGuide
        moduleKey="profit_calculator"
        moduleTitle="Foyda Kalkulyatori"
        steps={profitHelpSteps}
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
};
