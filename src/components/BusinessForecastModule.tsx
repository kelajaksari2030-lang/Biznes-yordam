import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Package,
  ShoppingBag,
  ReceiptText,
  Clock,
  HelpCircle,
  BarChart3,
  Calendar,
  DollarSign,
  Boxes,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccessBusinessForecast } from '../config/plans';
import { getOrders } from '../services/orderService';
import { getTransactions } from '../services/financeService';
import { getProducts } from '../services/inventoryService';
import { getBusinessProfile } from '../services/businessService';
import {
  generateBusinessForecast,
  MIN_HISTORICAL_ORDERS,
  MIN_HISTORICAL_DAYS,
} from '../services/businessForecastService';
import { Order, FinancialTransaction, BusinessProfile } from '../types/business';
import { Product } from '../types/inventory';

interface BusinessForecastModuleProps {
  onOpenPricing?: () => void;
  setActiveTab?: (tab: any) => void;
}

export const BusinessForecastModule: React.FC<BusinessForecastModuleProps> = ({
  onOpenPricing,
  setActiveTab,
}) => {
  const { user, currentPlan } = useAuth();

  // Authoritative plan permission gate
  const isAuthorized = canAccessBusinessForecast(currentPlan?.id);

  // Module data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    // If user is not authorized, strictly avoid calling underlying business queries
    if (!isAuthorized || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [fetchedOrders, fetchedTransactions, fetchedProducts, profile] = await Promise.all([
        getOrders(user.uid),
        getTransactions(user.uid),
        getProducts(user.uid),
        getBusinessProfile(user.uid),
      ]);
      setOrders(fetchedOrders);
      setTransactions(fetchedTransactions);
      setProducts(fetchedProducts);
      setBusinessProfile(profile);
    } catch (err: any) {
      setError(err.message || "Prognoz ma'lumotlarini yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, isAuthorized]);

  // Pure deterministic forecast calculations
  const forecast = useMemo(() => {
    return generateBusinessForecast(orders, transactions, products, currentPlan?.id);
  }, [orders, transactions, products, currentPlan?.id]);

  // Format currency
  const formatMoney = (amount: number) => {
    const val = amount || 0;
    if (businessProfile?.currency === 'USD') {
      return `$${val.toLocaleString('en-US')}`;
    }
    return `${val.toLocaleString('uz-UZ')} so'm`;
  };

  // 1. Plan Gate: Unauthorized View (Free or Pro users attempting direct URL access)
  if (!isAuthorized) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E6DCD1] shadow-card text-center max-w-2xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#493329] text-[#D0AE70] mx-auto flex items-center justify-center shadow-md">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#D0AE70]" />
              <span>Faqat Ultra tarifida</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#493329]">
              Aqlli biznes prognozi (Ultra Eksklyuziv)
            </h2>
            <p className="text-xs sm:text-sm text-[#795640] leading-relaxed max-w-lg mx-auto">
              Ushbu modul faqat Ultra tarifi foydalanuvchilari uchun maxsus ishlab chiqilgan.
              30 kunlik kassa tushumi bashorati, ombordagi tovarlar tugash xavfi va kutilayotgan
              pul oqimi (cash flow) tahliliga ega bo'lish uchun Ultra tarifiga o'ting.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {onOpenPricing && (
              <button
                onClick={onOpenPricing}
                className="w-full sm:w-auto px-6 py-3 bg-[#D0AE70] hover:bg-[#C39F60] text-[#34221A] text-xs font-bold rounded-xl transition-all shadow-sm btn-tactile flex items-center justify-center gap-2"
              >
                <span>Ultra tarifiga o'tish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {setActiveTab && (
              <button
                onClick={() => setActiveTab('home')}
                className="w-full sm:w-auto px-5 py-3 bg-[#FAF6F0] hover:bg-[#F2ECE1] text-[#6B5549] text-xs font-bold rounded-xl border border-[#E6DCD1] transition-all"
              >
                Bosh sahifaga qaytish
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-white p-5 rounded-2xl border border-[#E6DCD1] shadow-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#493329] text-[#D0AE70] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="h-5 w-48 bg-[#E6DCD1]/60 rounded-md animate-pulse" />
              <div className="h-3 w-64 bg-[#E6DCD1]/40 rounded-md animate-pulse" />
            </div>
          </div>
          <RefreshCw className="w-4 h-4 text-[#8D786D] animate-spin" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-[#E6DCD1] space-y-3">
              <div className="h-4 w-32 bg-[#E6DCD1]/60 rounded-md animate-pulse" />
              <div className="h-8 w-24 bg-[#E6DCD1]/80 rounded-md animate-pulse" />
              <div className="h-3 w-full bg-[#E6DCD1]/40 rounded-md animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Error State
  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-3 animate-fadeIn max-w-xl mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-sm font-bold text-rose-900">Ma'lumotlarni yuklashda xatolik</h3>
        <p className="text-xs text-rose-700">{error}</p>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Qayta urinish</span>
        </button>
      </div>
    );
  }

  const { revenue, warehouse, cashFlow } = forecast;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Module Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6DCD1] shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#493329] text-[#D0AE70] flex items-center justify-center font-bold shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#493329] tracking-tight">
                  Aqlli biznes prognozi
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-[#493329] text-[#D0AE70] text-[10px] font-bold">
                  ULTRA
                </span>
              </div>
              <p className="text-xs text-[#795640]">
                30 kunlik tushum sur'ati, ombor to'ldirish ehtiyoji va kassa oqimi tahlili
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            title="Yangilash"
            className="p-2.5 text-[#6B5549] hover:text-[#493329] bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#E6DCD1] rounded-xl transition-all btn-tactile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: 30-Day Revenue Projection */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6DCD1] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#493329]">30 kunlik kutilayotgan tushum</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Taxminiy
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-900 truncate">
              {revenue.hasSufficientData
                ? formatMoney(revenue.projected30DayPaidRevenue)
                : "Yetarli emas"}
            </div>
            <p className="text-[11px] text-[#795640] mt-1">
              {revenue.hasSufficientData
                ? `Kunlik run-rate: ${formatMoney(revenue.dailyRunRatePaidRevenue)}/kun`
                : `Kamida ${MIN_HISTORICAL_ORDERS} ta buyurtma va ${MIN_HISTORICAL_DAYS} kunlik tarix kerak`}
            </p>
          </div>
          {revenue.hasSufficientData && revenue.growthRatePercent !== null && (
            <div className="pt-2 border-t border-[#E6DCD1]/60 flex items-center justify-between text-xs">
              <span className="text-[#8D786D]">Savdo sur'ati:</span>
              <span
                className={`font-bold inline-flex items-center gap-1 ${
                  revenue.growthRatePercent >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {revenue.growthRatePercent >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {revenue.growthRatePercent >= 0 ? `+${revenue.growthRatePercent}%` : `${revenue.growthRatePercent}%`}
              </span>
            </div>
          )}
        </div>

        {/* Card 2: Warehouse Depletion Alert Count */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6DCD1] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#493329]">Tugash xavfi bor tovarlar</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                warehouse.itemsNeedingReorderCount > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {warehouse.itemsNeedingReorderCount > 0 ? "Diqqat talab" : "Qoldiq barqaror"}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-[#493329]">
              {warehouse.itemsNeedingReorderCount} ta mahsulot
            </div>
            <p className="text-[11px] text-[#795640] mt-1">
              Kritik: {warehouse.criticalStockCount} ta | Kam qolgan: {warehouse.warningStockCount} ta
            </p>
          </div>
          <div className="pt-2 border-t border-[#E6DCD1]/60 text-xs text-[#8D786D] flex items-center justify-between">
            <span>Jami tovarlar turlari:</span>
            <span className="font-bold text-[#493329]">{warehouse.totalProductsChecked} ta</span>
          </div>
        </div>

        {/* Card 3: 30-Day Net Cash Flow Projection */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6DCD1] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#493329]">30 kunlik sof kassa oqimi</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                cashFlow.cashDeficitWarning
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {cashFlow.cashDeficitWarning ? "Defitsit xavfi" : "Ijobiy balans"}
            </span>
          </div>
          <div>
            <div
              className={`text-2xl font-black truncate ${
                cashFlow.projectedNetCashFlow >= 0 ? 'text-emerald-900' : 'text-rose-700'
              }`}
            >
              {cashFlow.hasSufficientData
                ? formatMoney(cashFlow.projectedNetCashFlow)
                : "Yetarli emas"}
            </div>
            <p className="text-[11px] text-[#795640] mt-1">
              Kutilayotgan tushum - Ekstrapolyatsiya qilingan xarajatlar
            </p>
          </div>
          <div className="pt-2 border-t border-[#E6DCD1]/60 text-xs text-[#8D786D] flex items-center justify-between">
            <span>Kutilayotgan nasiya (kassadan tashqari):</span>
            <span className="font-bold text-amber-800">{formatMoney(cashFlow.unpaidDebtOutstanding)}</span>
          </div>
        </div>
      </div>

      {/* Deficit Alert Warning if applicable */}
      {cashFlow.cashDeficitWarning && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-900">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Kassa uzilishi (Cash gap) xavfi aniqlandi:</span>
            <p>
              Tarixiy o'rtacha kunlik operatsion xarajatlar tushayotgan haqiqiy kassa tushumidan yuqori.
              Kelgusi 30 kunda kassa uzilishining oldini olish uchun doimiy xarajatlarni qisqartirish
              yoki mijozlardan kutilayotgan nasiyalarni tezroq yig'ish tavsiya etiladi.
            </p>
          </div>
        </div>
      )}

      {/* 3. Detailed Section A: 30-Day Revenue Projection */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6DCD1] shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6DCD1]/60 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#493329]" />
            <div>
              <h2 className="text-sm font-bold text-[#493329]">
                A) 30 kunlik tushum prognozi va savdo tendensiyasi
              </h2>
              <p className="text-[11px] text-[#795640]">
                Faqat tasdiqlangan/yakunlangan buyurtmalar asosida. Bekor qilingan buyurtmalar hisobdan chiqarilgan.
              </p>
            </div>
          </div>
        </div>

        {!revenue.hasSufficientData ? (
          <div className="p-4 bg-[#FAF6F0] rounded-xl border border-[#E6DCD1] text-xs text-[#795640] space-y-2">
            <div className="flex items-center gap-2 text-[#493329] font-bold">
              <Info className="w-4 h-4 text-[#D0AE70]" />
              <span>Prognoz berilmadi: {revenue.insufficientDataReason}</span>
            </div>
            <p className="leading-relaxed">
              <strong>Talab qilinadigan shartlar:</strong> Kamida {MIN_HISTORICAL_ORDERS} ta bekor qilinmagan buyurtma
              va buyurtmalar orasida kamida {MIN_HISTORICAL_DAYS} kunlik savdo davri tarixi talab etiladi.
              Tizim noto'g'ri taxminlar yaratmaslik uchun tasdiqlanmagan ma'lumotlarni hisoblamaydi.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#E6DCD1]">
                <span className="text-[#8D786D] block">Tahlil davri</span>
                <span className="font-bold text-[#493329] text-sm mt-0.5 block">
                  {revenue.historicalDaysSpan} kun
                </span>
                <span className="text-[10px] text-[#795640]">Tarixiy namunalar oralig'i</span>
              </div>
              <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#E6DCD1]">
                <span className="text-[#8D786D] block">Tasdiqlangan buyurtmalar</span>
                <span className="font-bold text-[#493329] text-sm mt-0.5 block">
                  {revenue.sampleSizeOrders} ta
                </span>
                <span className="text-[10px] text-[#795640]">Bekor qilinganlar chetlatilgan</span>
              </div>
              <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#E6DCD1]">
                <span className="text-[#8D786D] block">O'rtacha kunlik naqd tushum</span>
                <span className="font-bold text-emerald-800 text-sm mt-0.5 block">
                  {formatMoney(revenue.dailyRunRatePaidRevenue)}
                </span>
                <span className="text-[10px] text-[#795640]">Haqiqiy to'langan pullar sur'ati</span>
              </div>
              <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#E6DCD1]">
                <span className="text-[#8D786D] block">O'rtacha kunlik buyurtmalar hajmi</span>
                <span className="font-bold text-[#493329] text-sm mt-0.5 block">
                  {formatMoney(revenue.dailyRunRateSalesVolume)}
                </span>
                <span className="text-[10px] text-[#795640]">Jami savdo miqdori sur'ati</span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Hisoblash uslubi: </span>
                {revenue.methodology}
                {revenue.growthRatePercent === null && (
                  <span className="block mt-1 text-[11px] text-emerald-800">
                    (Oldingi davr tushumi 0 bo'lgani sababli foizli o'sish ko'rsatkichi sun'iy hisoblanmadi).
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Detailed Section B: Warehouse Needs & Stock Depletion Forecast */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6DCD1] shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6DCD1]/60 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#493329]" />
            <div>
              <h2 className="text-sm font-bold text-[#493329]">
                B) Ombor ehtiyojlari va tovarlar tugash muddati prognozi
              </h2>
              <p className="text-[11px] text-[#795640]">
                Sotuv tezligi, joriy qoldiq va minimal zaxira buferi bo'yicha to'ldirish tavsiyalari
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#8D786D]">
            {warehouse.items.length} ta mahsulot
          </span>
        </div>

        {!warehouse.hasSufficientData ? (
          <div className="p-4 bg-[#FAF6F0] rounded-xl border border-[#E6DCD1] text-xs text-[#795640]">
            {warehouse.insufficientDataReason}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#E6DCD1] text-xs text-[#795640]">
              <span className="font-bold text-[#493329]">Metodologiya: </span>
              {warehouse.methodology}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF6F0] text-[#8D786D] font-bold border-b border-[#E6DCD1]">
                    <th className="p-3 rounded-l-xl">Mahsulot nomi</th>
                    <th className="p-3 text-right">Mavjud qoldiq</th>
                    <th className="p-3 text-right">Minimal chegara</th>
                    <th className="p-3 text-right">Sotuv tezligi</th>
                    <th className="p-3 text-right">Taxminiy tugash muddati</th>
                    <th className="p-3 text-right rounded-r-xl">Tavsiya (To'ldirish)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DCD1]/60">
                  {warehouse.items.map((it) => (
                    <tr key={it.productId} className="hover:bg-[#FAF6F0]/60 transition-colors">
                      <td className="p-3 font-semibold text-[#493329]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              it.urgencyStatus === 'critical'
                                ? 'bg-rose-500'
                                : it.urgencyStatus === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span>{it.productName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold text-[#493329]">
                        {it.currentStock} {it.unit}
                      </td>
                      <td className="p-3 text-right text-[#8D786D]">
                        {it.minStockAlert} {it.unit}
                      </td>
                      <td className="p-3 text-right text-[#6B5549]">
                        {it.hasSufficientVelocityHistory
                          ? `${it.dailySalesVelocity} ${it.unit}/kun`
                          : "Yetarli tarix yo'q"}
                      </td>
                      <td className="p-3 text-right">
                        {it.estimatedDaysUntilStockout !== null ? (
                          <span
                            className={`font-bold px-2 py-0.5 rounded-md ${
                              it.estimatedDaysUntilStockout <= 7
                                ? 'bg-rose-100 text-rose-800'
                                : it.estimatedDaysUntilStockout <= 14
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            ~{it.estimatedDaysUntilStockout} kun
                          </span>
                        ) : (
                          <span className="text-[#8D786D]">
                            {it.currentStock === 0 ? "Tugagan" : "Harakatsiz"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {it.recommendedReorderQuantity > 0 ? (
                          <span className="font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                            +{it.recommendedReorderQuantity} {it.unit}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Zaxira yetarli</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 5. Detailed Section C: Cash Flow & Operating Expense Extrapolation */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6DCD1] shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6DCD1]/60 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#493329]" />
            <div>
              <h2 className="text-sm font-bold text-[#493329]">
                C) 30 kunlik ehtiyotkor kassa oqimi (Cash Flow) tahlili
              </h2>
              <p className="text-[11px] text-[#795640]">
                Mijozlarning to'lanmagan qarzdorligi (nasiya) naqd pul deb hisoblanmaydi
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
            <span className="text-emerald-800 font-semibold block">Kutilayotgan naqd kassa kirimi</span>
            <span className="text-lg font-bold text-emerald-950 block">
              +{formatMoney(cashFlow.projected30DayCashInflow)}
            </span>
            <p className="text-[10px] text-emerald-700">
              Faqat amalda to'langan kunlik kassa tushumi sur'ati asosida
            </p>
          </div>

          <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-1">
            <span className="text-rose-800 font-semibold block">Ekstrapolyatsiya qilingan xarajatlar</span>
            <span className="text-lg font-bold text-rose-950 block">
              -{formatMoney(cashFlow.projected30DayExpenses)}
            </span>
            <p className="text-[10px] text-rose-700">
              Operatsion xarajatlar (kunlik burn-rate: {formatMoney(cashFlow.dailyExpenseBurnRate)}/kun)
            </p>
          </div>

          <div className="p-3.5 bg-[#FAF6F0] rounded-xl border border-[#E6DCD1] space-y-1">
            <span className="text-[#493329] font-semibold block">Sof prognoz qilingan kassa oqimi</span>
            <span
              className={`text-lg font-black block ${
                cashFlow.projectedNetCashFlow >= 0 ? 'text-emerald-800' : 'text-rose-700'
              }`}
            >
              {cashFlow.projectedNetCashFlow >= 0 ? '+' : ''}
              {formatMoney(cashFlow.projectedNetCashFlow)}
            </span>
            <p className="text-[10px] text-[#795640]">
              Kelgusi 30 kunlik taxminiy sof naqd pul saldosi
            </p>
          </div>
        </div>

        {/* Cautious assumptions disclosure */}
        <div className="p-3.5 bg-[#FAF6F0] rounded-xl border border-[#E6DCD1] text-xs text-[#795640] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[#493329] font-bold">
            <Info className="w-4 h-4 text-[#D0AE70]" />
            <span>Kassa oqimi shaffofligi va taxminlar:</span>
          </div>
          <p className="leading-relaxed">
            {cashFlow.expenseAssumptionsNote}
          </p>
          <div className="pt-1.5 border-t border-[#E6DCD1]/60 flex items-center justify-between text-[11px]">
            <span className="text-[#8D786D]">Kutilayotgan nasiyalar / qarzlar miqdori:</span>
            <span className="font-bold text-amber-900">{formatMoney(cashFlow.unpaidDebtOutstanding)}</span>
          </div>
          <p className="text-[10px] text-[#8D786D] italic">
            * Eslatma: Moliyaviy xavfsizlik nuqtayi nazaridan, ushbu nasiyalar kassa prognoziga naqd pul sifatida
            qo'shilmagan. Ular mijozlardan amalda undirilgandagina kassa oqimiga aylanadi.
          </p>
        </div>
      </div>
    </div>
  );
};
