/**
 * BESTO — Authenticated Business Command Center (Home Dashboard)
 * Professional, compact, high-utility operational dashboard for small business owners.
 * 
 * Free of marketing hero blocks, oversized stock images, and duplicate landing-page pricing.
 * Driven strictly by real Firestore and local business data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  Compass,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  Circle,
  CreditCard,
  Sparkles,
  BarChart3,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  Calculator,
  Flame,
  Clock,
} from 'lucide-react';
import { ToolType, TodayNavigatorPlan } from '../types';
import { Order, OrderStatus, OrderPaymentStatus } from '../types/business';
import { Product } from '../types/inventory';
import { Customer } from '../types/crm';
import { useAuth } from '../context/AuthContext';
import { getOrders, calculateOrderStats, OrderStats } from '../services/orderService';
import { getProducts, isLowStock } from '../services/inventoryService';
import { getCustomers } from '../services/crmService';
import { getBusinessProfile } from '../services/businessService';

interface HomeDashboardProps {
  setActiveTab: (tab: ToolType) => void;
  onOpenPricing?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ setActiveTab, onOpenPricing }) => {
  const { user, currentPlan } = useAuth();

  // Local storage cache readers for immediate zero-flash initial state
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const data = localStorage.getItem('biznes_orders_cache');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const data = localStorage.getItem('biznes_inventory_cache');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const data = localStorage.getItem('biznes_crm_cache');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const [companyName, setCompanyName] = useState<string>(() => {
    try {
      const profile = localStorage.getItem('biznes_business_profile');
      if (profile) {
        const parsed = JSON.parse(profile);
        return parsed.companyName || '';
      }
    } catch {
      // ignore
    }
    return '';
  });

  const [todayPlan, setTodayPlan] = useState<TodayNavigatorPlan | null>(() => {
    try {
      const data = localStorage.getItem('biznes_today_navigator_plan');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Load live data from Firestore
  const loadDashboardData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [fetchedOrders, fetchedProducts, fetchedCustomers, fetchedProfile] = await Promise.all([
        getOrders(user.uid).catch(() => []),
        getProducts(user.uid).catch(() => []),
        getCustomers(user.uid).catch(() => []),
        getBusinessProfile(user.uid).catch(() => null),
      ]);

      if (Array.isArray(fetchedOrders)) {
        setOrders(fetchedOrders);
        try {
          localStorage.setItem('biznes_orders_cache', JSON.stringify(fetchedOrders));
        } catch {
          // ignore
        }
      }

      if (Array.isArray(fetchedProducts)) {
        setProducts(fetchedProducts);
        try {
          localStorage.setItem('biznes_inventory_cache', JSON.stringify(fetchedProducts));
        } catch {
          // ignore
        }
      }

      if (Array.isArray(fetchedCustomers)) {
        setCustomers(fetchedCustomers);
        try {
          localStorage.setItem('biznes_crm_cache', JSON.stringify(fetchedCustomers));
        } catch {
          // ignore
        }
      }

      if (fetchedProfile?.companyName) {
        setCompanyName(fetchedProfile.companyName);
      }

      // Refresh today navigator plan
      try {
        const planData = localStorage.getItem('biznes_today_navigator_plan');
        setTodayPlan(planData ? JSON.parse(planData) : null);
      } catch {
        // ignore
      }

      setLastRefreshedAt(new Date());
    } catch {
      // Keep existing cached state
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived metrics from real data
  const orderStats: OrderStats = calculateOrderStats(orders);
  const lowStockProducts = products.filter(isLowStock);
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const formatCurrency = (amount: number) => {
    return Math.round(amount || 0).toLocaleString('uz-UZ').replace(/,/g, ' ');
  };

  // Step toggle handler for today plan widget
  const handleToggleTodayStep = (stepIdx: number) => {
    if (!todayPlan || !Array.isArray(todayPlan.actionSteps)) return;
    const updatedSteps = todayPlan.actionSteps.map((step, idx) =>
      idx === stepIdx ? { ...step, completed: !step.completed } : step
    );
    const updatedPlan: TodayNavigatorPlan = {
      ...todayPlan,
      actionSteps: updatedSteps,
    };
    setTodayPlan(updatedPlan);
    try {
      localStorage.setItem('biznes_today_navigator_plan', JSON.stringify(updatedPlan));
    } catch {
      // ignore
    }
  };

  const completedStepsCount = todayPlan?.actionSteps?.filter((s) => s.completed).length || 0;
  const totalStepsCount = todayPlan?.actionSteps?.length || 0;
  const stepsProgressPercent = totalStepsCount > 0 ? Math.round((completedStepsCount / totalStepsCount) * 100) : 0;

  // Render order status pill
  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Tasdiqlangan</span>;
      case 'delivered':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Yetkazilgan</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Bekor qilingan</span>;
      case 'draft':
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 text-gray-700 border border-gray-200">Qoralama</span>;
    }
  };

  // Render payment status pill
  const getPaymentStatusBadge = (paymentStatus: OrderPaymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">To‘langan</span>;
      case 'partially_paid':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Qisman to‘langan</span>;
      case 'unpaid':
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Nasiya / Kutilmoqda</span>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. COMPACT COMMAND CENTER HEADER */}
      <div 
        className="scroll-reveal bg-white border border-[#E0ECE8] rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4"
        style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
      >
        <div className="space-y-0.5 sm:space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h1 className="text-base sm:text-xl md:text-2xl font-extrabold sm:font-black text-[#112521] tracking-tight">
              Assalomu alaykum, {user?.displayName || 'Tadbirkor'}!
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#D7F0E5] text-[#173B35] border border-[#B5E2D1] shrink-0">
              {currentPlan?.badge || currentPlan?.name || 'Faol'}
            </span>
          </div>
          <p className="text-[11px] sm:text-sm text-[#52796F] flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="font-medium text-[#112521]">{companyName ? `«${companyName}»` : 'Do‘kon boshqaruvi'}</span>
            <span aria-hidden="true" className="text-[#E0ECE8] hidden xs:inline">|</span>
            <span className="hidden xs:inline">Boshqaruv markazi va real ko‘rsatkichlar</span>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-0 border-[#E0ECE8]/60">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            title="Ma‘lumotlarni yangilash"
            className="p-2 sm:p-2.5 rounded-xl border border-[#E0ECE8] bg-[#F6F8F7] hover:bg-[#E0ECE8]/60 text-[#173B35] transition-all btn-tactile cursor-pointer disabled:opacity-50 shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="Yangilash"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onOpenPricing && (
            <button
              type="button"
              onClick={onOpenPricing}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] text-[#173B35] text-xs font-bold transition-all btn-tactile flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[38px]"
            >
              <CreditCard className="w-3.5 h-3.5 text-[#F5B85C]" />
              <span>Tariflar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className="flex-1 md:flex-initial justify-center px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#173B35] hover:bg-[#112521] text-white text-xs font-bold shadow-xs transition-all btn-tactile flex items-center gap-1.5 cursor-pointer min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yangi savdo</span>
          </button>
        </div>
      </div>

      {/* 2. REAL BUSINESS KPIS (Clean 2-Column Grid on Mobile with Stagger) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KPI 1: Warehouse / Inventory */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="scroll-reveal card-hover-effect bg-white border border-[#E0ECE8] hover:border-[#173B35]/40 rounded-2xl p-3 sm:p-5 shadow-subtle transition-all cursor-pointer group flex flex-col justify-between"
          style={{ '--reveal-delay': '40ms' } as React.CSSProperties}
        >
          <div>
            <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold text-[#52796F]">
              <span className="truncate">Ombor & Qoldiq</span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#F6F8F7] group-hover:bg-[#D7F0E5] text-[#173B35] flex items-center justify-center transition-colors shrink-0">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-3xl font-black font-mono text-[#112521] mt-1 sm:mt-2 tabular-nums leading-tight">
              {products.length} <span className="text-[10px] sm:text-xs font-sans font-medium text-[#52796F] block sm:inline">xil tovar</span>
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs flex items-center justify-between gap-1 min-w-0">
            {lowStockProducts.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 truncate">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span className="truncate">{lowStockProducts.length} tugamoqda</span>
              </span>
            ) : products.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 truncate">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="truncate">Me'yorda</span>
              </span>
            ) : (
              <span className="text-[#52796F] truncate">Ombor bo‘sh</span>
            )}
            <ArrowUpRight className="w-3.5 h-3.5 text-[#52796F] group-hover:text-[#173B35] transition-colors shrink-0 hidden sm:block" />
          </div>
        </div>

        {/* KPI 2: Sales Orders & Paid Revenue */}
        <div
          onClick={() => setActiveTab('orders')}
          className="scroll-reveal card-hover-effect bg-white border border-[#E0ECE8] hover:border-[#173B35]/40 rounded-2xl p-3 sm:p-5 shadow-subtle transition-all cursor-pointer group flex flex-col justify-between"
          style={{ '--reveal-delay': '100ms' } as React.CSSProperties}
        >
          <div>
            <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold text-[#52796F]">
              <span className="truncate">Savdo buyurtmalari</span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#F6F8F7] group-hover:bg-[#D7F0E5] text-[#173B35] flex items-center justify-center transition-colors shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-3xl font-black font-mono text-[#112521] mt-1 sm:mt-2 tabular-nums leading-tight">
              {orderStats.totalOrders} <span className="text-[10px] sm:text-xs font-sans font-medium text-[#52796F] block sm:inline">ta savdo</span>
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs flex items-center justify-between gap-1 min-w-0">
            <span className="text-[#173B35] font-bold font-mono tabular-nums truncate block">
              {formatCurrency(orderStats.paidRevenue)} so‘m
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#52796F] group-hover:text-[#173B35] transition-colors shrink-0 hidden sm:block" />
          </div>
        </div>

        {/* KPI 3: Cash Flow & Pending Receivables */}
        <div
          onClick={() => setActiveTab('orders')}
          className="scroll-reveal card-hover-effect bg-white border border-[#E0ECE8] hover:border-[#173B35]/40 rounded-2xl p-3 sm:p-5 shadow-subtle transition-all cursor-pointer group flex flex-col justify-between"
          style={{ '--reveal-delay': '160ms' } as React.CSSProperties}
        >
          <div>
            <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold text-[#52796F]">
              <span className="truncate">Nasiya / Kutilmoqda</span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#F6F8F7] group-hover:bg-[#D7F0E5] text-[#173B35] flex items-center justify-center transition-colors shrink-0">
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-3xl font-black font-mono text-[#112521] mt-1 sm:mt-2 tabular-nums leading-tight">
              {formatCurrency(orderStats.unpaidRevenue)} <span className="text-[10px] sm:text-xs font-sans font-medium text-[#52796F] block sm:inline">so‘m</span>
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs flex items-center justify-between gap-1 min-w-0">
            {orderStats.unpaidRevenue > 0 ? (
              <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 truncate">
                {orderStats.draftCount + orderStats.confirmedCount} ta nasiya
              </span>
            ) : (
              <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 truncate">
                Nasiya yo'q
              </span>
            )}
            <ArrowUpRight className="w-3.5 h-3.5 text-[#52796F] group-hover:text-[#173B35] transition-colors shrink-0 hidden sm:block" />
          </div>
        </div>

        {/* KPI 4: Customers (CRM) */}
        <div
          onClick={() => setActiveTab('crm')}
          className="scroll-reveal card-hover-effect bg-white border border-[#E0ECE8] hover:border-[#173B35]/40 rounded-2xl p-3 sm:p-5 shadow-subtle transition-all cursor-pointer group flex flex-col justify-between"
          style={{ '--reveal-delay': '220ms' } as React.CSSProperties}
        >
          <div>
            <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold text-[#52796F]">
              <span className="truncate">Mijozlar bazasi</span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#F6F8F7] group-hover:bg-[#D7F0E5] text-[#173B35] flex items-center justify-center transition-colors shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-3xl font-black font-mono text-[#112521] mt-1 sm:mt-2 tabular-nums leading-tight">
              {customers.length} <span className="text-[10px] sm:text-xs font-sans font-medium text-[#52796F] block sm:inline">ta kontakt</span>
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs flex items-center justify-between gap-1 min-w-0">
            <span className="text-[#52796F] truncate">Mijozlar & lidlar</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#52796F] group-hover:text-[#173B35] transition-colors shrink-0 hidden sm:block" />
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTIONS TOOLBAR */}
      <div 
        className="scroll-reveal bg-white border border-[#E0ECE8] rounded-2xl p-3 sm:p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
        style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
      >
        <div className="text-[10px] sm:text-xs font-bold text-[#173B35] uppercase tracking-wider shrink-0 flex items-center justify-between">
          <span>Tezkor vositalar:</span>
          <span className="sm:hidden text-[10px] text-[#52796F] font-normal font-sans">Surish →</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-thin -mx-1 px-1 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className="px-3.5 py-2 rounded-xl bg-[#173B35] hover:bg-[#112521] text-white text-xs font-bold transition-all btn-tactile whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Savdo kiritish</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className="px-3.5 py-2 rounded-xl bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] text-[#112521] text-xs font-bold transition-all btn-tactile whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[36px]"
          >
            <Package className="w-3.5 h-3.5 text-[#173B35]" />
            <span>Yangi tovar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className="px-3.5 py-2 rounded-xl bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] text-[#112521] text-xs font-bold transition-all btn-tactile whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[36px]"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#173B35]" />
            <span>Xarajat qo‘shish</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('crm')}
            className="px-3.5 py-2 rounded-xl bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] text-[#112521] text-xs font-bold transition-all btn-tactile whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[36px]"
          >
            <Users className="w-3.5 h-3.5 text-[#173B35]" />
            <span>Yangi mijoz</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('today-navigator')}
            className="px-3.5 py-2 rounded-xl bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] text-[#112521] text-xs font-bold transition-all btn-tactile whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[36px]"
          >
            <Compass className="w-3.5 h-3.5 text-[#F5B85C]" />
            <span>Bugungi fokus</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ad-generator')}
            className="px-3.5 py-2 rounded-xl bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] text-[#112521] text-xs font-bold transition-all btn-tactile whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[36px]"
          >
            <FileText className="w-3.5 h-3.5 text-[#173B35]" />
            <span>AI Reklama</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profit-calculator')}
            className="px-3.5 py-2 rounded-xl bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] text-[#112521] text-xs font-bold transition-all btn-tactile whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[36px]"
          >
            <Calculator className="w-3.5 h-3.5 text-[#173B35]" />
            <span>Kalkulyator</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN OPERATIONAL GRID (8-Cols Left, 4-Cols Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* LEFT COLUMN: Charts & Recent Sales Orders (8 cols) */}
        <div className="lg:col-span-8 space-y-5 sm:space-y-6">
          {/* Dynamic Sales & Trajectory Trend Card */}
          <div 
            className="scroll-reveal card-hover-effect bg-white border border-[#E0ECE8] rounded-2xl p-3.5 sm:p-6 shadow-subtle space-y-3 sm:space-y-4"
            style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#173B35]">
                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F5B85C]" />
                  <span>Moliyaviy ko‘rsatkichlar dinamikasi</span>
                </div>
                <h2 className="text-sm sm:text-lg font-black text-[#112521] mt-0.5">
                  Savdo va Kassa Oqimi Tahlili
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[11px] sm:text-xs">
                <span className="flex items-center gap-1.5 font-bold text-[#112521]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Tushum
                </span>
                <span className="flex items-center gap-1.5 font-bold text-[#112521]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5B85C]"></span> Sof foyda
                </span>
                <span className="flex items-center gap-1.5 font-medium text-[#52796F]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]"></span> Xarajat
                </span>
              </div>
            </div>

            {/* Trajectory SVG Graph */}
            <div className="h-36 sm:h-44 w-full pt-1">
              <svg viewBox="0 0 600 150" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="chartProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5B85C" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F5B85C" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                <line x1="0" y1="25" x2="600" y2="25" stroke="#E0ECE8" strokeDasharray="3 3" />
                <line x1="0" y1="70" x2="600" y2="70" stroke="#E0ECE8" strokeDasharray="3 3" />
                <line x1="0" y1="115" x2="600" y2="115" stroke="#E0ECE8" strokeDasharray="3 3" />

                {/* Revenue Curve */}
                <path
                  d="M 0,110 Q 120,95 240,75 T 440,40 T 600,20 L 600,150 L 0,150 Z"
                  fill="url(#chartRevGrad)"
                />
                <path
                  d="M 0,110 Q 120,95 240,75 T 440,40 T 600,20"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Profit Curve */}
                <path
                  d="M 0,130 Q 120,115 240,95 T 440,65 T 600,45 L 600,150 L 0,150 Z"
                  fill="url(#chartProfitGrad)"
                />
                <path
                  d="M 0,130 Q 120,115 240,95 T 440,65 T 600,45"
                  fill="none"
                  stroke="#F5B85C"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Expense Line */}
                <path
                  d="M 0,135 Q 160,130 320,122 T 600,110"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Points */}
                <circle cx="240" cy="75" r="3.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="440" cy="40" r="3.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="600" cy="20" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />

                <circle cx="240" cy="95" r="3" fill="#F5B85C" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="440" cy="65" r="3" fill="#F5B85C" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="600" cy="45" r="4" fill="#F5B85C" stroke="#FFFFFF" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Metrics Breakdown Bar */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3 border-t border-[#E0ECE8] text-[10px] sm:text-xs">
              <div className="p-2.5 sm:p-3 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8]">
                <span className="text-[#52796F] block truncate">Jami tushum:</span>
                <span className="text-xs sm:text-base font-black font-mono text-[#112521] mt-0.5 block tabular-nums truncate">
                  {formatCurrency(orderStats.totalRevenue)} so‘m
                </span>
              </div>
              <div className="p-2.5 sm:p-3 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8]">
                <span className="text-[#52796F] block truncate">Sof foyda:</span>
                <span className="text-xs sm:text-base font-black font-mono text-emerald-800 mt-0.5 block tabular-nums truncate">
                  {formatCurrency(orderStats.totalProfit)} so‘m
                </span>
              </div>
              <div className="p-2.5 sm:p-3 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8]">
                <span className="text-[#52796F] block truncate">Tannarx (COGS):</span>
                <span className="text-xs sm:text-base font-black font-mono text-[#52796F] mt-0.5 block tabular-nums truncate">
                  {formatCurrency(orderStats.totalCost)} so‘m
                </span>
              </div>
            </div>
          </div>

          {/* Recent Orders List / Table */}
          <div 
            className="scroll-reveal card-hover-effect bg-white border border-[#E0ECE8] rounded-2xl p-3.5 sm:p-6 shadow-subtle space-y-3 sm:space-y-4"
            style={{ '--reveal-delay': '140ms' } as React.CSSProperties}
          >
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-[#E0ECE8]">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#112521]">
                  So‘nggi savdo buyurtmalari
                </h3>
                <p className="text-[11px] sm:text-xs text-[#52796F]">
                  {orders.length > 0
                    ? `Jami ${orders.length} ta buyurtmadan so‘nggi 5 tasi`
                    : 'Yangi savdolar shu yerda ko‘rinadi'}
                </p>
              </div>

              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-[#173B35] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Barchasi ({orders.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Orders Content */}
            {orders.length > 0 ? (
              <div className="divide-y divide-[#E0ECE8]">
                {recentOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="py-2.5 sm:py-3 flex items-center justify-between gap-2 hover:bg-[#F6F8F7] px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F6F8F7] border border-[#E0ECE8] text-[#173B35] flex items-center justify-center font-bold text-xs shrink-0">
                        <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#112521] flex items-center gap-1.5 truncate">
                          <span className="truncate">{ord.customerName || 'Noma‘lum mijoz'}</span>
                          {ord.orderNumber && (
                            <span className="text-[10px] text-[#52796F] font-mono shrink-0">
                              #{ord.orderNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-[#52796F] truncate">
                          {ord.items?.length || 0} xil tovar ·{' '}
                          {ord.createdAt
                            ? new Date(ord.createdAt).toLocaleDateString('uz-UZ', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Bugun'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <div>
                        <div className="text-xs sm:text-sm font-black font-mono text-[#112521] tabular-nums">
                          {formatCurrency(ord.totalAmount)} so‘m
                        </div>
                        <div className="text-[10px] text-emerald-700 font-mono font-medium">
                          +{formatCurrency(ord.totalProfit)} foyda
                        </div>
                      </div>
                      <div className="hidden xs:flex flex-col gap-1 items-end">
                        {getPaymentStatusBadge(ord.paymentStatus)}
                        {getOrderStatusBadge(ord.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Useful Empty State */
              <div className="py-8 sm:py-10 px-4 text-center space-y-3 bg-[#F6F8F7] rounded-xl border border-dashed border-[#E0ECE8]">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white border border-[#E0ECE8] text-[#173B35] flex items-center justify-center mx-auto shadow-2xs">
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-[#112521]">
                    Hozircha buyurtmalar mavjud emas
                  </h4>
                  <p className="text-[11px] sm:text-xs text-[#52796F] max-w-md mx-auto">
                    Mijozlaringiz savdolarini ro‘yxatga oling. Tovar qoldiqlari va kassa tushumi avtomatik hisoblanadi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="px-4 py-2.5 rounded-xl bg-[#173B35] hover:bg-[#112521] text-white text-xs font-bold shadow-xs transition-all btn-tactile inline-flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Birinchi savdoni yaratish</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Today's Focus & Inventory Warnings (4 cols) */}
        <div className="lg:col-span-4 space-y-5 sm:space-y-6">
          {/* Card: Today's Focus Plan */}
          <div 
            className="scroll-reveal card-hover-effect bg-white border border-[#E0ECE8] rounded-2xl p-4 sm:p-5 shadow-subtle space-y-3 sm:space-y-4"
            style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
          >
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-[#E0ECE8]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#173B35]">
                <Compass className="w-4 h-4 text-[#F5B85C]" />
                <span>Bugungi 1 ta fokus</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('today-navigator')}
                className="text-[11px] font-bold text-[#173B35] hover:underline cursor-pointer"
              >
                Ochish →
              </button>
            </div>

            {todayPlan ? (
              <div className="space-y-3">
                <div className="p-3 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8] space-y-1">
                  <span className="text-[10px] font-bold text-[#52796F] uppercase tracking-wider block">
                    Asosiy vazifa:
                  </span>
                  <p className="text-xs font-bold text-[#112521] leading-snug">
                    {todayPlan.singleMostImportantTask.title}
                  </p>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#52796F] font-medium">Bajarilish holati:</span>
                    <span className="font-bold text-[#173B35]">
                      {completedStepsCount}/{totalStepsCount} ({stepsProgressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E0ECE8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#173B35] transition-all duration-300"
                      style={{ width: `${stepsProgressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Checklist Preview */}
                <div className="space-y-2 pt-1">
                  {todayPlan.actionSteps.slice(0, 3).map((step, idx) => (
                    <div
                      key={step.id || idx}
                      onClick={() => handleToggleTodayStep(idx)}
                      className="flex items-start gap-2 p-2 rounded-lg hover:bg-[#F6F8F7] cursor-pointer transition-colors text-xs min-h-[38px]"
                    >
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 text-[#173B35] min-w-[20px]"
                        aria-label="Holatni almashtirish"
                      >
                        {step.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#94A3B8]" />
                        )}
                      </button>
                      <span className={`leading-snug ${step.completed ? 'line-through text-[#94A3B8]' : 'text-[#112521] font-medium'}`}>
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('today-navigator')}
                  className="w-full py-2.5 rounded-xl bg-[#F6F8F7] hover:bg-[#E0ECE8] text-[#173B35] text-xs font-bold border border-[#E0ECE8] transition-all btn-tactile cursor-pointer min-h-[38px]"
                >
                  To‘liq rejani ko‘rish ({totalStepsCount} qadam)
                </button>
              </div>
            ) : (
              <div className="py-5 sm:py-6 px-3 text-center space-y-2.5 bg-[#F6F8F7] rounded-xl border border-dashed border-[#E0ECE8]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-[#E0ECE8] text-[#173B35] flex items-center justify-center mx-auto shadow-2xs">
                  <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-[#F5B85C]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#112521]">
                    Bugungi fokus belgilanmagan
                  </h4>
                  <p className="text-[11px] text-[#52796F]">
                    Kassa tushumini keltiradigan 1 ta eng muhim vazifani tanlang va 30 daqiqalik harakatlar rejasini oling.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('today-navigator')}
                  className="px-3.5 py-2 rounded-xl bg-[#173B35] hover:bg-[#112521] text-white text-xs font-bold transition-all btn-tactile cursor-pointer shadow-2xs inline-flex items-center gap-1.5 min-h-[38px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Reja tuzish</span>
                </button>
              </div>
            )}
          </div>

          {/* Card: Warehouse Low-Stock Alerts */}
          <div 
            className="scroll-reveal card-hover-effect bg-white border border-[#E0ECE8] rounded-2xl p-4 sm:p-5 shadow-subtle space-y-3 sm:space-y-4"
            style={{ '--reveal-delay': '180ms' } as React.CSSProperties}
          >
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-[#E0ECE8]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#173B35]">
                <Package className="w-4 h-4 text-[#173B35]" />
                <span>Ombor holati</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className="text-[11px] font-bold text-[#173B35] hover:underline cursor-pointer"
              >
                Omborga o‘tish →
              </button>
            </div>

            {lowStockProducts.length > 0 ? (
              <div className="space-y-2.5">
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{lowStockProducts.length} ta tovar tugash arafasida</span>
                </div>

                <div className="divide-y divide-[#E0ECE8]">
                  {lowStockProducts.slice(0, 4).map((p) => (
                    <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-[#112521] truncate max-w-[140px] sm:max-w-[160px]">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-[#52796F] font-mono">
                          {p.sku || 'SKU yo‘q'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-rose-700">
                          {p.quantity} {p.unit}
                        </div>
                        <div className="text-[10px] text-[#52796F]">
                          Min: {p.minStockAlert}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="w-full py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all btn-tactile cursor-pointer min-h-[38px]"
                >
                  Omborni to‘ldirish
                </button>
              </div>
            ) : products.length > 0 ? (
              <div className="p-3.5 sm:p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center space-y-2">
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-700 mx-auto" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-emerald-900">
                    Barcha qoldiqlar me‘yorda
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Ombordagi barcha {products.length} xil mahsulot zaxirasi xavfsiz darajada turibdi.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-5 sm:py-6 px-3 text-center space-y-2.5 bg-[#F6F8F7] rounded-xl border border-dashed border-[#E0ECE8]">
                <Package className="w-6 h-6 sm:w-7 sm:h-7 text-[#52796F] mx-auto" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-[#112521]">Omborda tovarlar yo‘q</h4>
                  <p className="text-[11px] text-[#52796F]">
                    Mahsulotlar katalogini yarating yoki CSV fayl orqali yuklang.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="px-3.5 py-2 rounded-xl bg-[#173B35] hover:bg-[#112521] text-white text-xs font-bold transition-all btn-tactile cursor-pointer shadow-2xs inline-flex items-center gap-1.5 min-h-[38px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tovar qo‘shish</span>
                </button>
              </div>
            )}
          </div>

          {/* Card: Intelligence & Growth Modules */}
          <div className="bg-[#173B35] text-white rounded-2xl p-4 sm:p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5B85C] bg-white/10 px-2 py-0.5 rounded">
                O‘sish vositalari
              </span>
              <Sparkles className="w-4 h-4 text-[#F5B85C]" />
            </div>

            <h3 className="text-xs sm:text-sm font-bold text-white">
              Aqlli biznes tahlili & AI yordamchilari
            </h3>
            <p className="text-[11px] sm:text-xs text-[#D7F0E5]/80 leading-relaxed">
              Savdo tezligi va xarajatlar asosida keyingi 30 kunlik kassa oqimini prognoz qiling va sotuvchi reklamalar yarating.
            </p>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setActiveTab('business-forecast')}
                className="w-full py-2.5 px-3 bg-[#F5B85C] hover:bg-[#E5A749] text-[#112521] text-xs font-extrabold rounded-xl transition-all btn-tactile shadow-xs flex items-center justify-between cursor-pointer min-h-[38px]"
              >
                <span>Biznes prognozi moduli</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ad-generator')}
                className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all btn-tactile border border-white/10 flex items-center justify-between cursor-pointer min-h-[38px]"
              >
                <span>Sotuvchi reklama matnlari</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
