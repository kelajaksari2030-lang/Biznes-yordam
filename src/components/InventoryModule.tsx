import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Tag,
  Boxes,
  DollarSign,
  TrendingUp,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader2,
  Filter,
  BarChart3,
  Layers,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Product, ProductInput, ProductUnit, PRODUCT_UNITS } from '../types/inventory';
import {
  getProducts,
  saveProduct,
  deleteProduct,
  filterProducts,
  validateProductInput,
  calculateInventoryStats,
  isLowStock,
} from '../services/inventoryService';
import { formatUzbekSom, formatNumber } from '../utils/numberFormat';
import { getBusinessProfile } from '../services/businessService';
import { ModuleHelpGuide, HelpGuideButton, HelpStep } from './ModuleHelpGuide';

export const InventoryModule: React.FC = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("so'm");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Help Guide state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Check if first time viewing inventory module
  useEffect(() => {
    try {
      const seen = localStorage.getItem('besto_help_inventory_seen');
      if (!seen) {
        setIsHelpOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState<ProductUnit>('dona');
  const [minStockAlert, setMinStockAlert] = useState<number | ''>(5);
  const [category, setCategory] = useState('');

  // Load business profile currency preference
  useEffect(() => {
    if (!user) return;
    getBusinessProfile(user.uid)
      .then((p) => {
        if (p?.currency === 'USD') {
          setCurrencySymbol('$');
        } else {
          setCurrencySymbol("so'm");
        }
      })
      .catch(() => {
        // default UZS
      });
  }, [user]);

  // Load products from Firestore
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setLoading(true);

    getProducts(user.uid)
      .then((data) => {
        if (isMounted) {
          setProducts(data);
          try {
            localStorage.setItem('biznes_inventory_cache', JSON.stringify(data));
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load products from Firestore:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Open modal helpers
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setPurchasePrice('');
    setSellingPrice('');
    setQuantity('');
    setUnit('dona');
    setMinStockAlert(5);
    setCategory('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.sku);
    setPurchasePrice(prod.purchasePrice);
    setSellingPrice(prod.sellingPrice);
    setQuantity(prod.quantity);
    setUnit(prod.unit);
    setMinStockAlert(prod.minStockAlert);
    setCategory(prod.category || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormError(null);
  };

  // Save product handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const inputData: ProductInput = {
      name,
      sku,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      quantity: Number(quantity) || 0,
      unit,
      minStockAlert: Number(minStockAlert) || 0,
      category,
    };

    const validation = validateProductInput(inputData);
    if (!validation.isValid) {
      setFormError(validation.errors.join('. '));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const saved = await saveProduct(user.uid, inputData, editingProduct?.id);

      if (editingProduct) {
        setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      } else {
        setProducts((prev) => [saved, ...prev]);
      }

      handleCloseModal();
    } catch (err: any) {
      setFormError(err?.message || "Mahsulotni saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  // Delete product handler
  const handleDeleteProduct = async (prod: Product) => {
    if (!user) return;
    const confirmDelete = window.confirm(`"${prod.name}" mahsulotini ombordan o'chirishni tasdiqlaysizmi?`);
    if (!confirmDelete) return;

    try {
      await deleteProduct(user.uid, prod.id);
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
    } catch (err) {
      alert("O'chirishda xatolik yuz berdi.");
    }
  };

  // Filtered list
  const filteredProducts = useMemo(() => {
    return filterProducts(products, searchQuery, filterLowStockOnly);
  }, [products, searchQuery, filterLowStockOnly]);

  // Aggregated Statistics
  const stats = useMemo(() => {
    return calculateInventoryStats(products);
  }, [products]);

  const inventoryHelpSteps: HelpStep[] = useMemo(() => [
    {
      title: "1. Yangi tovar kiritish",
      description: "Sariq 'Yangi tovar qo'shish' tugmasini bosing. Mahsulot nomi, SKU (kodi) va kategoriyasini kiritib, tovarlaringizni tartibga soling.",
      tip: "SKU kodi shtrix-kod yoki do'konda tovarlarni tez topish uchun ishlatiladi (Masalan: SHOE-BR-42).",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="20" y="20" width="460" height="40" rx="10" fill="#FFFFFF" stroke="#E6DCD1" strokeWidth="1" />
          <rect x="35" y="32" width="16" height="16" rx="4" fill="#D7F0E5" />
          <text x="60" y="44" fill="#173B35" fontSize="11" fontWeight="bold">Mahsulotlar Ombori</text>
          <rect x="330" y="26" width="135" height="28" rx="8" fill="#F5B85C" />
          <text x="345" y="44" fill="#173B35" fontSize="10" fontWeight="bold">+ Yangi tovar qo'shish</text>

          <rect x="50" y="75" width="400" height="125" rx="12" fill="#FFFFFF" stroke="#173B35" strokeWidth="2" />
          <text x="70" y="96" fill="#173B35" fontSize="11" fontWeight="bold">Yangi mahsulot kiritish</text>

          <text x="70" y="118" fill="#6B5549" fontSize="9" fontWeight="bold">Mahsulot nomi *</text>
          <rect x="70" y="123" width="360" height="22" rx="6" fill="#FAF8F5" stroke="#D7F0E5" strokeWidth="1" />
          <text x="80" y="137" fill="#173B35" fontSize="10">Erkaklar klassik charm poyabzali</text>

          <text x="70" y="158" fill="#6B5549" fontSize="9" fontWeight="bold">SKU (Kodi)</text>
          <rect x="70" y="163" width="170" height="22" rx="6" fill="#FAF8F5" stroke="#D7F0E5" strokeWidth="1" />
          <text x="80" y="177" fill="#173B35" fontSize="10" fontFamily="monospace">SHOE-BR-42</text>

          <text x="260" y="158" fill="#6B5549" fontSize="9" fontWeight="bold">Kategoriya</text>
          <rect x="260" y="163" width="170" height="22" rx="6" fill="#FAF8F5" stroke="#D7F0E5" strokeWidth="1" />
          <text x="270" y="177" fill="#173B35" fontSize="10">Poyabzal</text>
        </svg>
      ),
    },
    {
      title: "2. Tannarx va sotuv narxini belgilash",
      description: "Tovarning haqiqiy xarid narxini (tannarx) hamda mijozlarga sotiladigan narxini kiriting. Tizim avtomatik ravishda har bir dona tovardan olinadigan sof marjani hisoblab beradi.",
      tip: "Sotuv narxi va xarid narxi o'rtasidagi farq do'koningiz marjasi va sof foyda hisobi uchun asos bo'ladi.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="30" y="30" width="210" height="70" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="45" y="52" fill="#6B5549" fontSize="10" fontWeight="bold">Xarid narxi (Tannarx)</text>
          <rect x="45" y="60" width="180" height="28" rx="6" fill="#FAF8F5" stroke="#D7F0E5" strokeWidth="1" />
          <text x="55" y="78" fill="#173B35" fontSize="12" fontWeight="bold" fontFamily="monospace">120 000 so'm</text>

          <rect x="260" y="30" width="210" height="70" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="275" y="52" fill="#173B35" fontSize="10" fontWeight="bold">Sotuv narxi</text>
          <rect x="275" y="60" width="180" height="28" rx="6" fill="#FAF8F5" stroke="#D7F0E5" strokeWidth="1" />
          <text x="285" y="78" fill="#173B35" fontSize="12" fontWeight="bold" fontFamily="monospace">210 000 so'm</text>

          <rect x="70" y="125" width="360" height="60" rx="12" fill="#D7F0E5" stroke="#173B35" strokeWidth="1.5" />
          <text x="90" y="150" fill="#173B35" fontSize="11" fontWeight="bold">1 dona tovardan sof marja:</text>
          <text x="90" y="170" fill="#173B35" fontSize="15" fontWeight="extrabold" fontFamily="monospace">+90 000 so'm (43% marja)</text>
        </svg>
      ),
    },
    {
      title: "3. Qoldiq va minimal limit",
      description: "Mavjud dona/miqdorni kiriting hamda minimal ogohlantirish limitini belgilang. Tovar miqdori ushbu limitdan kamaysa, tizim 'Diqqat' ogohlantirishini ko'rsatadi.",
      tip: "Minimal limitni haftalik sotuv hajmiga mos belgilang. Standart ko'rsatkich — 5 dona.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="30" y="25" width="130" height="65" rx="10" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="42" y="45" fill="#173B35" fontSize="10" fontWeight="bold">Ombordagi miqdor</text>
          <text x="42" y="72" fill="#173B35" fontSize="16" fontWeight="bold" fontFamily="monospace">3 dona</text>

          <rect x="180" y="25" width="130" height="65" rx="10" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="192" y="45" fill="#6B5549" fontSize="10" fontWeight="bold">O'lchov birligi</text>
          <text x="192" y="72" fill="#173B35" fontSize="14" fontWeight="bold">dona</text>

          <rect x="330" y="25" width="140" height="65" rx="10" fill="#FFFFFF" stroke="#F5B85C" strokeWidth="2" />
          <text x="342" y="45" fill="#173B35" fontSize="10" fontWeight="bold">Minimal limit</text>
          <text x="342" y="72" fill="#173B35" fontSize="16" fontWeight="bold" fontFamily="monospace">5 dona</text>

          <rect x="30" y="110" width="440" height="75" rx="12" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
          <circle cx="60" cy="147" r="14" fill="#F59E0B" />
          <text x="56" y="152" fill="#FFFFFF" fontSize="14" fontWeight="bold">!</text>
          <text x="85" y="140" fill="#78350F" fontSize="12" fontWeight="bold">Diqqat: Qoldiq oz qoldi! (3 dona &lt; min: 5 dona)</text>
          <text x="85" y="160" fill="#92400E" fontSize="10">Ushbu tovar kam qolganlar ro'yxatida ko'rinadi va zudlik bilan xarid qilinishi kerak.</text>
        </svg>
      ),
    },
    {
      title: "4. Qidiruv va kam qolganlarni saralash",
      description: "Qidiruv satri orqali istalgan tovarni nomi yoki kodi bo'yicha toping. 'Faqat kam qolganlar' tugmasi orqali omborda tugayotgan tovarlarni bir bosishda saralang.",
      tip: "Kam qolgan tovarlar ro'yxatini tezda saralab, yetkazib beruvchiga yangi zakaz berishingiz mumkin.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="25" y="20" width="280" height="36" rx="10" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="40" y="42" fill="#8D786D" fontSize="11">🔍 Poyabzal...</text>

          <rect x="315" y="20" width="160" height="36" rx="10" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
          <text x="330" y="42" fill="#78350F" fontSize="10" fontWeight="bold">⚠️ Faqat kam qolganlar (1)</text>

          <rect x="25" y="70" width="450" height="120" rx="12" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="1.5" />
          <text x="40" y="95" fill="#173B35" fontSize="12" fontWeight="bold">Erkaklar klassik charm poyabzali</text>
          <rect x="250" y="82" width="80" height="18" rx="4" fill="#F6F8F7" stroke="#E6DCD1" strokeWidth="1" />
          <text x="258" y="95" fill="#6B5549" fontSize="9" fontFamily="monospace">SHOE-BR-42</text>

          <rect x="40" y="108" width="170" height="22" rx="6" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1" />
          <text x="48" y="123" fill="#78350F" fontSize="10" fontWeight="bold">⚠️ Qoldiq oz qoldi! (Qoldiq: 3 / min: 5)</text>

          <text x="40" y="155" fill="#6B5549" fontSize="10">Xarid narxi: 120 000 so'm</text>
          <text x="200" y="155" fill="#173B35" fontSize="10" fontWeight="bold">Sotuv narxi: 210 000 so'm</text>
          <text x="360" y="155" fill="#047857" fontSize="10" fontWeight="bold">Marja: ~43%</text>
        </svg>
      ),
    },
  ], []);

  const formatMoney = (amount: number) => {
    if (currencySymbol === '$') {
      return `$${formatNumber(amount)}`;
    }
    return formatUzbekSom(amount);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Header */}
      <div className="bg-white border border-[#E6DCD1] rounded-3xl p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF6F0] text-[#795640] rounded-lg text-xs font-semibold border border-[#E8D6B7]/60">
              <Package className="w-3.5 h-3.5 text-[#D0AE70]" />
              <span>Mahsulotlar Ombori (Sklad)</span>
            </div>
            <HelpGuideButton onClick={() => setIsHelpOpen(true)} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#493329]">
            Tovar Qoldiqlari va Narxlar
          </h1>
          <p className="text-xs sm:text-sm text-[#6B5549] max-w-2xl leading-relaxed">
            Ombordagi tovarlar miqdorini nazorat qiling, xarid va sotuv narxlarini kuzating hamda tugab borayotgan mahsulotlarni vaqtida aniqlang.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-5 py-3 rounded-2xl bg-[#D0AE70] hover:bg-[#C39F60] text-[#34221A] text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 btn-tactile shrink-0"
        >
          <Plus className="w-4 h-4 text-[#34221A]" />
          <span>Yangi tovar qo'shish</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total products */}
        <div className="p-4 sm:p-5 bg-white border border-[#E6DCD1] rounded-2xl shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8D786D]">Jami tovar turlari</span>
            <Boxes className="w-4 h-4 text-[#D0AE70]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#493329] font-mono mt-2">
            {stats.totalProducts}
          </div>
          <span className="text-[11px] text-[#795640] mt-1 block">
            Jami dona/miqdor: <strong>{formatNumber(stats.totalQuantity)}</strong>
          </span>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => setFilterLowStockOnly((prev) => !prev)}
          className={`p-4 sm:p-5 rounded-2xl shadow-card cursor-pointer transition-all border ${
            stats.lowStockCount > 0
              ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400'
              : 'bg-white border-[#E6DCD1]'
          }`}
          title="Kam qolganlarni saralash"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Kam qolganlar</span>
            </span>
            {stats.lowStockCount > 0 && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                Diqqat
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#493329] font-mono mt-2">
            {stats.lowStockCount}
          </div>
          <span className="text-[11px] text-amber-900 mt-1 block font-medium">
            {filterLowStockOnly ? "Filtr faol (barchasini ko'rish)" : "Limitdan kam tovarlar"}
          </span>
        </div>

        {/* Total Purchase Cost */}
        <div className="p-4 sm:p-5 bg-white border border-[#E6DCD1] rounded-2xl shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8D786D]">Xarid qiymati (Tannarx)</span>
            <DollarSign className="w-4 h-4 text-[#795640]" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-[#493329] font-mono mt-2 truncate">
            {formatMoney(stats.totalPurchaseValue)}
          </div>
          <span className="text-[11px] text-[#795640] mt-1 block">Omborga kiritilgan sarmoya</span>
        </div>

        {/* Total Potential Revenue */}
        <div className="p-4 sm:p-5 bg-white border border-[#E6DCD1] rounded-2xl shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Kutilayotgan sotuv</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-800 font-mono mt-2 truncate">
            {formatMoney(stats.totalSellingValue)}
          </div>
          <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
            Kutilayotgan sof foyda: +{formatMoney(stats.potentialProfit)}
          </span>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white border border-[#E6DCD1] rounded-2xl p-4 sm:p-5 shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8D786D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mahsulot nomi, SKU (kodi) yoki kategoriya bo'yicha qidirish..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D5C7B8] focus:border-[#493329] focus:ring-1 focus:ring-[#493329] outline-none text-xs sm:text-sm text-[#34221A] bg-[#FAF8F5]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8D786D] hover:text-[#493329]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Low Stock Toggle Button */}
          <button
            type="button"
            onClick={() => setFilterLowStockOnly((prev) => !prev)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all btn-tactile shrink-0 ${
              filterLowStockOnly
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                : 'bg-[#FAF6F0] border-[#E6DCD1] text-[#634839] hover:bg-[#F2ECE1]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Faqat kam qolganlar ({stats.lowStockCount})</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-[#8D786D] pt-1">
          <span>
            Ko'rsatilmoqda: <strong className="text-[#493329] font-mono">{filteredProducts.length}</strong> ta tovar
          </span>
          {filterLowStockOnly && (
            <span className="text-amber-800 text-[11px] font-medium bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
              Kam qolgan tovarlar filtri faol
            </span>
          )}
        </div>
      </div>

      {/* Product List Content */}
      {loading ? (
        <div className="py-16 bg-white border border-[#E6DCD1] rounded-3xl flex flex-col items-center justify-center space-y-3 shadow-card">
          <Loader2 className="w-8 h-8 text-[#D0AE70] animate-spin" />
          <span className="text-xs font-semibold text-[#795640]">
            Ombordagi tovarlar yuklanmoqda...
          </span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-14 bg-white border border-[#E6DCD1] rounded-3xl text-center space-y-3 p-6 shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF6F0] border border-[#E6DCD1] text-[#D0AE70] flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#493329]">
            {products.length === 0
              ? "Omborda hali mahsulotlar yo'q"
              : "Qidiruv bo'yicha hech qanday tovar topilmadi"}
          </h3>
          <p className="text-xs text-[#8D786D] max-w-md mx-auto">
            {products.length === 0
              ? "Yangi mahsulot qo'shing yoki Foyda kalkulyatoridan hisoblangan tovarlarni bir bosishda omborga saqlang."
              : "Boshqa so'z bilan qidirib ko'ring yoki kam qolganlar filtrini o'chiring."}
          </p>
          {products.length === 0 && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-2 px-4 py-2.5 bg-[#D0AE70] hover:bg-[#C39F60] text-[#34221A] text-xs font-bold rounded-xl transition-all btn-tactile inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#34221A]" />
              <span>Birinchi tovaringizni qo'shing</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#E6DCD1] rounded-3xl shadow-card overflow-hidden">
          <div className="divide-y divide-[#EFE8DE]">
            {filteredProducts.map((prod) => {
              const low = isLowStock(prod);
              const marginPercent =
                prod.sellingPrice > 0
                  ? (((prod.sellingPrice - prod.purchasePrice) / prod.sellingPrice) * 100).toFixed(0)
                  : '0';

              return (
                <div
                  key={prod.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    low ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-[#FAF8F5]'
                  }`}
                >
                  {/* Left: Product Info */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-[#493329] truncate">
                        {prod.name}
                      </h3>
                      {prod.sku && (
                        <span className="text-[10px] font-mono text-[#8D786D] bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#E6DCD1]">
                          SKU: {prod.sku}
                        </span>
                      )}
                      {prod.category && (
                        <span className="text-[10px] font-medium text-[#795640] bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#E6DCD1]">
                          {prod.category}
                        </span>
                      )}
                    </div>

                    {/* Stock & Warning badge */}
                    <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#8D786D]">Qoldiq:</span>
                        <strong className="text-sm font-mono text-[#493329]">
                          {formatNumber(prod.quantity)} {prod.unit}
                        </strong>
                      </div>

                      {low ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Qoldiq oz qoldi! (min: {prod.minStockAlert})</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-medium">
                          ✓ Yetarli miqdor
                        </span>
                      )}
                    </div>

                    {/* Price details */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B5549] pt-1">
                      <div>
                        <span className="text-[#8D786D]">Xarid narxi: </span>
                        <span className="font-mono font-medium">{formatMoney(prod.purchasePrice)}</span>
                      </div>
                      <div>
                        <span className="text-[#8D786D]">Sotuv narxi: </span>
                        <strong className="font-mono text-[#493329] font-bold">
                          {formatMoney(prod.sellingPrice)}
                        </strong>
                      </div>
                      <div className="text-emerald-700 font-medium text-[11px]">
                        Marja: ~{marginPercent}%
                      </div>
                      <div className="text-[11px] text-[#8D786D]">
                        Jami sotuv qiymati: {formatMoney(prod.quantity * prod.sellingPrice)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(prod)}
                      className="p-2 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F0] text-[#795640] transition-colors btn-tactile"
                      title="Tahrirlash"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prod)}
                      className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors btn-tactile"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#251A14]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden overscroll-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
          role="presentation"
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-modal border border-[#E6DCD1] flex flex-col max-h-[calc(100vh-24px)] max-h-[calc(100dvh-24px)] my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-[#EFE8DE] pb-3 mb-4 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF6F0] border border-[#E6DCD1] flex items-center justify-center text-[#795640] shrink-0">
                  <Package className="w-5 h-5 text-[#D0AE70]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#493329]">
                    {editingProduct ? "Mahsulotni tahrirlash" : "Yangi mahsulot kiritish"}
                  </h3>
                  <p className="text-xs text-[#8D786D]">
                    Ombor qoldig'i, xarid va sotuv narxlari
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-[#8D786D] hover:text-[#493329] p-1.5 rounded-lg transition-colors shrink-0"
                aria-label="Yopish"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2 overscroll-contain touch-pan-y">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Name */}
              <div>
                <label className="block text-xs font-bold text-[#493329] mb-1.5">
                  Mahsulot yoki xizmat nomi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Erkaklar klassik charm poyabzali"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C7B8] focus:border-[#493329] focus:ring-1 focus:ring-[#493329] outline-none text-sm text-[#34221A] bg-[#FAF8F5]"
                  required
                />
              </div>

              {/* 2. SKU and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#493329] mb-1.5">
                    SKU (Mahsulot kodi)
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Masalan: SHOE-BR-42"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5C7B8] focus:border-[#493329] outline-none text-sm font-mono text-[#34221A] bg-[#FAF8F5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493329] mb-1.5">
                    Kategoriya (ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Masalan: Poyabzal, Kiyim, Kosmetika"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5C7B8] focus:border-[#493329] outline-none text-sm text-[#34221A] bg-[#FAF8F5]"
                  />
                </div>
              </div>

              {/* 3. Prices Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#493329] mb-1.5">
                    Xarid narxi (Tannarx) ({currencySymbol}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Masalan: 120000"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5C7B8] focus:border-[#493329] outline-none text-sm font-mono text-[#34221A] bg-[#FAF8F5]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493329] mb-1.5">
                    Sotuv narxi ({currencySymbol}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Masalan: 210000"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5C7B8] focus:border-[#493329] outline-none text-sm font-mono text-[#34221A] bg-[#FAF8F5]"
                    required
                  />
                </div>
              </div>

              {/* 4. Quantity, Unit, and Min Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#493329] mb-1.5">
                    Ombordagi miqdor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Masalan: 50"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5C7B8] focus:border-[#493329] outline-none text-sm font-mono text-[#34221A] bg-[#FAF8F5]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493329] mb-1.5">
                    O'lchov birligi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as ProductUnit)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:border-[#493329] outline-none text-sm text-[#34221A] bg-[#FAF8F5]"
                  >
                    {PRODUCT_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#493329] mb-1.5" title="Ushbu sondan kam qolsa ogohlantirish beriladi">
                    Minimal limit (ogohlantirish) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="5"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5C7B8] focus:border-[#493329] outline-none text-sm font-mono text-[#34221A] bg-[#FAF8F5]"
                    required
                  />
                </div>
              </div>

              {/* Price Preview helper */}
              {Number(sellingPrice) > 0 && Number(purchasePrice) > 0 && (
                <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#EFE8DE] text-xs text-[#795640] flex items-center justify-between">
                  <span>1 dona tovardan sof marja:</span>
                  <strong className="text-emerald-700 font-mono">
                    +{formatMoney(Number(sellingPrice) - Number(purchasePrice))} (
                    {(((Number(sellingPrice) - Number(purchasePrice)) / Number(sellingPrice)) * 100).toFixed(0)}%)
                  </strong>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-[#EFE8DE] flex items-center justify-end gap-3 sticky bottom-0 bg-white pt-2 mt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl border border-[#D5C7B8] text-xs font-bold text-[#634839] hover:bg-[#FAF6F0] transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#493329] hover:bg-[#34221A] text-[#FAF6F0] text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 btn-tactile"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saqlanmoqda...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#D0AE70]" />
                      Saqlash
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module Help Guide */}
      <ModuleHelpGuide
        moduleKey="inventory"
        moduleTitle="Mahsulotlar Ombori"
        steps={inventoryHelpSteps}
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
};
