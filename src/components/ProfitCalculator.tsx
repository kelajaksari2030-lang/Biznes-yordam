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
  Database
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
    const text = `📊 BIZNESYORDAM — MAHSULOT FOYDA HISOBOTI
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#493329]">
              Foyda va marja kalkulyatori
            </h1>
            <p className="text-sm text-[#6B5549] mt-1 max-w-2xl">
              Mahsulot tannarxi, qo'shimcha xarajatlar va sotish narxini kiritib, kutilayotgan sof foyda hamda marjani bir zumda aniqlang.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="px-3.5 py-2 text-xs font-medium text-[#493329] bg-white hover:bg-[#FAF6F0] border border-[#E6DCD1] rounded-xl transition-all btn-tactile flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
            >
              <HelpCircle className="w-4 h-4 text-[#795640]" />
              <span>Marja vs Ustama farqi</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="px-3.5 py-2 text-xs font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl transition-all btn-tactile flex items-center gap-1.5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#34221A]" />
                  <span>Nusxalandi!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#34221A]" />
                  <span>Hisobotni nusxalash</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick industry presets */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-medium text-[#8D786D] whitespace-nowrap">
            Tayyor namunalar:
          </span>
          {PRESETS.map((preset) => (
            <button
              key={preset.title}
              onClick={() => setInputs({ ...preset.inputs })}
              className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-[#FAF6F0] border border-[#E6DCD1] rounded-xl text-[#6B5549] hover:text-[#493329] whitespace-nowrap transition-all btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
            >
              {preset.title}
            </button>
          ))}
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-[#8D786D] hover:text-[#493329] border border-dashed border-[#D8CCC0] rounded-xl whitespace-nowrap transition-all btn-tactile flex items-center gap-1 ml-auto"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Tozalash</span>
          </button>
        </div>
      </div>

      {/* Educational Explanation Box (Marja va Ustama farqi) */}
      {showExplanation && (
        <div className="p-5 bg-white border border-[#E8D6B7] rounded-2xl shadow-card text-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-[#493329] font-semibold">
            <Info className="w-5 h-5 text-[#D0AE70] shrink-0" />
            <span>Marja (Profit Margin) va Ustama (Markup) o'rtasidagi farq nima?</span>
          </div>

          <p className="text-[#6B5549] leading-relaxed">
            Ko'plab tadbirkorlar marja va ustamani adashtirishadi, bu esa kutilganidan kamroq foyda olishga olib keladi:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 bg-[#FAF6F0] rounded-xl border border-[#E6DCD1]">
              <span className="font-semibold text-[#493329] block mb-1">
                1. Ustama foizi (Markup %)
              </span>
              <p className="text-xs text-[#6B5549] leading-relaxed">
                Tannarxga necha foiz qo'shib sotayotganingizni ko'rsatadi.
              </p>
              <div className="mt-2 text-xs font-mono bg-white p-2.5 rounded-lg border border-[#E6DCD1] text-[#34221A]">
                Formula: ((Sotish narxi - Tannarx) / Tannarx) × 100%
              </div>
            </div>

            <div className="p-3.5 bg-[#F6EFE3] rounded-xl border border-[#E8D6B7]">
              <span className="font-semibold text-[#493329] block mb-1">
                2. Foyda marjasi (Margin %)
              </span>
              <p className="text-xs text-[#6B5549] leading-relaxed">
                Har bir so'mlik umumiy tushumning necha foizi sizning cho'ntagingizda sof foyda bo'lib qolishini ko'rsatadi.
              </p>
              <div className="mt-2 text-xs font-mono bg-white p-2.5 rounded-lg border border-[#E8D6B7] text-[#493329]">
                Formula: (Sof foyda / Jami tushum) × 100%
              </div>
            </div>
          </div>

          <p className="text-xs italic bg-[#FAF6F0] p-3 rounded-xl border border-[#E6DCD1] text-[#795640]">
            <strong>Oddiy misol:</strong> 100 000 so'mga olgan tovaringizni 150 000 so'mga sotsangiz, <strong>Ustama 50%</strong> bo'ladi, lekin <strong>Marjangiz 33.3%</strong> bo'ladi. Hech qachon marja 100% dan oshmaydi!
          </p>
        </div>
      )}

      {/* Main 2-Column Split: Form on Left, Live Financial Cards on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Input Form (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white border border-[#E6DCD1] rounded-2xl p-5 sm:p-6 shadow-card space-y-5">
          <h2 className="text-base font-semibold text-[#493329] border-b border-[#EFE8DE] pb-3">
            Xarajat va sotuv ko'rsatkichlari
          </h2>

          {/* Input: Purchase Cost */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#493329]">
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
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8D786D]">
                so'm
              </span>
            </div>
            <p className="text-[11px] text-[#8D786D]">
              Ishlab chiqaruvchi yoki ulgurji bozordan olingan asl narx
            </p>
          </div>

          {/* Input: Extra direct costs per item */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#493329]">
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
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8D786D]">
                so'm
              </span>
            </div>
            <p className="text-[11px] text-[#8D786D]">
              Paket, quti, 1 donaga to'g'ri keladigan reklama yoki yetkazib berish xarajati
            </p>
          </div>

          {/* Input: Selling Price */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#493329]">
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
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8D786D]">
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
            <label className="block text-xs font-semibold text-[#493329]">
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
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8D786D]">
                dona
              </span>
            </div>
          </div>

          {/* Input: Fixed costs (Optional) */}
          <div className="space-y-1.5 pt-2 border-t border-[#EFE8DE]">
            <label className="block text-xs font-semibold text-[#493329]">
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
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8D786D]">
                so'm
              </span>
            </div>
            <p className="text-[11px] text-[#8D786D]">
              Masalan: do'kon oylik ijarasi, kommunal to'lov yoki oylik maosh ulushi
            </p>
          </div>

          {/* Save this calculation form */}
          <form onSubmit={handleSaveCalculation} className="pt-3 border-t border-[#EFE8DE] space-y-2">
            <label className="block text-xs font-medium text-[#6B5549]">
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
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#493329] hover:bg-[#3B2921] rounded-xl transition-all btn-tactile flex items-center gap-1 shrink-0"
              >
                <Save className="w-3.5 h-3.5 text-[#D0AE70]" />
                <span>Saqlash</span>
              </button>
            </div>
            {saveSuccess && (
              <p className="text-[11px] text-[#795640] font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-[#D0AE70]" />
                <span>Hisob-kitob muvaffaqiyatli saqlandi!</span>
              </p>
            )}
          </form>
        </div>

        {/* Right Side: Live Results Dashboard (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Profit Status Banner - Executive Deep Warm Brown or Wine Loss banner */}
          <div
            className={`p-6 rounded-2xl border transition-all shadow-card ${
              isLoss
                ? 'bg-[#6B2023] border-[#852C30] text-white'
                : 'bg-[#493329] border-[#614537] text-[#FAF6F0]'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold opacity-85 text-[#D0AE70]">
                  {isLoss ? 'Kutilayotgan zarar' : 'Kutilayotgan sof foyda'}
                </span>
                <div className={`text-3xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight mt-1 ${
                  isLoss ? 'text-white' : 'text-[#D0AE70]'
                }`}>
                  {isLoss ? '-' : '+'}
                  {formatUzbekSom(Math.abs(results.netProfit))}
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  isLoss
                    ? 'bg-[#852C30] text-white border-[#A1383D]'
                    : 'bg-[#3B2921] text-[#D0AE70] border-[#5A4033]'
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
                <span className="font-bold font-mono text-sm tabular-nums text-[#D0AE70]">
                  {formatPercent(results.marginPercent)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[#D7C9BF] block">Ustama foizi:</span>
                <span className="font-bold font-mono text-sm tabular-nums text-[#D0AE70]">
                  {formatPercent(results.markupPercent)}
                </span>
              </div>
            </div>
          </div>

          {/* Metric breakdown cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Revenue */}
            <div className="bg-white border border-[#E6DCD1] rounded-2xl p-4 shadow-card card-elevation">
              <span className="text-xs font-medium text-[#8D786D] block">
                Jami kutilayotgan tushum (Oborot)
              </span>
              <div className="text-xl font-bold font-mono tabular-nums text-[#493329] mt-1">
                {formatUzbekSom(results.totalRevenue)}
              </div>
              <span className="text-[11px] text-[#8D786D] mt-1 block">
                {formatNumber(inputs.quantity)} dona × {formatUzbekSom(inputs.sellingPrice)}
              </span>
            </div>

            {/* Total All Costs */}
            <div className="bg-white border border-[#E6DCD1] rounded-2xl p-4 shadow-card card-elevation">
              <span className="text-xs font-medium text-[#8D786D] block">
                Jami barcha xarajatlar
              </span>
              <div className="text-xl font-bold font-mono tabular-nums text-[#493329] mt-1">
                {formatUzbekSom(results.totalAllCost)}
              </div>
              <span className="text-[11px] text-[#8D786D] mt-1 block">
                Tannarx + qo'shimcha xarajatlar
              </span>
            </div>
          </div>

          {/* Detailed itemized cost distribution table */}
          <div className="bg-white border border-[#E6DCD1] rounded-2xl p-5 shadow-card">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#795640] mb-3">
              Xarajatlar taqsimoti tafsiloti
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFE8DE]">
                <span className="text-[#6B5549]">Xarid tannarxi (Jami):</span>
                <span className="font-mono font-medium text-[#493329] tabular-nums">
                  {formatUzbekSom(results.totalDirectCost)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#EFE8DE]">
                <span className="text-[#6B5549]">Donabay qo'shimcha xarajatlar:</span>
                <span className="font-mono font-medium text-[#493329] tabular-nums">
                  {formatUzbekSom(results.totalExtraItemCost)}
                </span>
              </div>

              {inputs.fixedCosts > 0 && (
                <div className="flex items-center justify-between pb-2 border-b border-[#EFE8DE]">
                  <span className="text-[#6B5549]">Doimiy umumiy xarajatlar:</span>
                  <span className="font-mono font-medium text-[#493329] tabular-nums">
                    {formatUzbekSom(results.totalFixedCost)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 font-semibold text-[#493329]">
                <span>1 dona mahsulotning to'liq xarajati:</span>
                <span className="font-mono tabular-nums text-[#795640]">
                  {formatUzbekSom(totalCostPerUnit)}
                </span>
              </div>
            </div>

            {/* Break-even point notice */}
            {inputs.fixedCosts > 0 && (
              <div className="mt-4 pt-4 border-t border-[#EFE8DE] text-xs text-[#6B5549] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#D0AE70] shrink-0 mt-0.5" />
                <span>
                  <strong>Zararsizlik chegarasi (Break-even):</strong> Doimiy xarajatlaringizni to'liq qoplash uchun kamida <strong>{results.breakEvenUnits} dona</strong> mahsulot sotishingiz kerak.
                </span>
              </div>
            )}
          </div>

          {/* Saved Calculations Drawer / History */}
          {savedCalculations.length > 0 && (
            <div className="bg-white border border-[#E6DCD1] rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#795640]">
                  Saqlangan hisob-kitoblar ({savedCalculations.length})
                </h3>
                <span className="text-[11px] text-[#8D786D]">
                  Qurilmangizda saqlangan
                </span>
              </div>

              <div className="divide-y divide-[#EFE8DE] max-h-60 overflow-y-auto">
                {savedCalculations.map((calc) => (
                  <div
                    key={calc.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#FAF6F0] px-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#493329] truncate">
                        {calc.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#8D786D] mt-0.5">
                        <span>{calc.date}</span>
                        <span>·</span>
                        <span>{formatNumber(calc.inputs.quantity)} dona</span>
                        <span>·</span>
                        <span className="font-mono text-[#795640] font-medium">
                          {formatUzbekSom(calc.results.netProfit)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleLoadSaved(calc)}
                        className="px-2.5 py-1 text-xs font-medium text-[#493329] hover:bg-white rounded-lg border border-[#E6DCD1] transition-all btn-tactile"
                      >
                        Ochish
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(calc.id)}
                        className="p-1 text-[#8D786D] hover:text-[#9E2A2B] transition-colors btn-tactile"
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
    </div>
  );
};
