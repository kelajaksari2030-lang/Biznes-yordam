import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  DollarSign,
  Calendar,
  Filter,
  Trash2,
  Edit2,
  Receipt,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Clock,
  Layers,
  ShoppingBag,
  CreditCard,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order, BusinessProfile, FinancialTransaction, ExpenseCategory, ExpenseTransactionInput } from '../types/business';
import {
  EXPENSE_CATEGORIES,
  getTransactions,
  createExpense,
  updateExpense,
  deleteExpense,
  calculateFinanceMetrics,
} from '../services/financeService';
import { getOrders } from '../services/orderService';
import { getBusinessProfile } from '../services/businessService';
import { buildFinanceReportCsv, downloadCsv } from '../utils/exportCsv';
import { canExportFinancialReports } from '../config/plans';

type DatePreset = 'all' | 'today' | 'this_week' | 'this_month' | 'custom';

export const FinanceModule: React.FC = () => {
  const { user, currentPlan } = useAuth();

  // Core Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Expense Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('ijara');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDescription, setFormDescription] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submittingForm, setSubmittingForm] = useState(false);

  // Fetch initial data
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setFeedbackMessage(null);
    try {
      const [fetchedOrders, fetchedTx, profile] = await Promise.all([
        getOrders(user.uid),
        getTransactions(user.uid),
        getBusinessProfile(user.uid),
      ]);
      setOrders(fetchedOrders);
      setTransactions(fetchedTx);
      setBusinessProfile(profile);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || "Moliyaviy ma'lumotlarni yuklashda xatolik yuz berdi",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Determine active date range boundaries based on preset
  const activeDateRange = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    if (datePreset === 'today') {
      return { startDate: todayStr, endDate: todayStr };
    }

    if (datePreset === 'this_week') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff)).toISOString().slice(0, 10);
      return { startDate: monday, endDate: todayStr };
    }

    if (datePreset === 'this_month') {
      const d = new Date();
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
      return { startDate: firstDay, endDate: todayStr };
    }

    if (datePreset === 'custom') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      };
    }

    // 'all'
    return { startDate: undefined, endDate: undefined };
  }, [datePreset, customStartDate, customEndDate]);

  // Derived financial summary metrics
  const metrics = useMemo(() => {
    return calculateFinanceMetrics(orders, transactions, activeDateRange);
  }, [orders, transactions, activeDateRange]);

  // Filtered list of expense transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
        return false;
      }

      // Date range filter
      if (activeDateRange.startDate && tx.date < activeDateRange.startDate) {
        return false;
      }
      if (activeDateRange.endDate && tx.date > activeDateRange.endDate) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim() !== '') {
        const queryLower = searchQuery.toLowerCase();
        const categoryLabel = EXPENSE_CATEGORIES.find((c) => c.id === tx.category)?.label.toLowerCase() || '';
        const descLower = (tx.description || '').toLowerCase();
        const amtStr = tx.amount.toString();
        const dateStr = tx.date;

        const matches =
          categoryLabel.includes(queryLower) ||
          descLower.includes(queryLower) ||
          amtStr.includes(queryLower) ||
          dateStr.includes(queryLower);

        if (!matches) return false;
      }

      return true;
    });
  }, [transactions, categoryFilter, activeDateRange, searchQuery]);

  // Format currency based on BusinessProfile
  const formatMoney = (amount: number) => {
    const val = amount || 0;
    if (businessProfile?.currency === 'USD') {
      return `$${val.toLocaleString('en-US')}`;
    }
    return `${val.toLocaleString('uz-UZ')} so'm`;
  };

  // Formatted date range label for UI and CSV export
  const dateRangeLabel = useMemo(() => {
    if (datePreset === 'today') {
      const todayStr = new Date().toISOString().slice(0, 10);
      return `Bugun (${todayStr})`;
    }
    if (datePreset === 'this_week') {
      return `Shu hafta (${activeDateRange.startDate || ''} - ${activeDateRange.endDate || ''})`;
    }
    if (datePreset === 'this_month') {
      return `Shu oy (${activeDateRange.startDate || ''} - ${activeDateRange.endDate || ''})`;
    }
    if (datePreset === 'custom' && (activeDateRange.startDate || activeDateRange.endDate)) {
      return `${activeDateRange.startDate || 'Boshidan'} - ${activeDateRange.endDate || 'Hozirgacha'}`;
    }
    return 'Barcha davr';
  }, [datePreset, activeDateRange]);

  // Orders matching active date filter (excluding cancelled orders)
  const filteredOrdersForReport = useMemo(() => {
    if (!activeDateRange.startDate && !activeDateRange.endDate) {
      return orders.filter((o) => o.status !== 'cancelled');
    }
    const start = activeDateRange.startDate || '1970-01-01';
    const end = activeDateRange.endDate || '2099-12-31';
    return orders.filter((o) => {
      if (o.status === 'cancelled') return false;
      const orderDate = o.createdAt ? o.createdAt.slice(0, 10) : '';
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, activeDateRange]);

  // Authoritative plan permission to export financial reports via CSV
  const canExportCsv = canExportFinancialReports(currentPlan?.id);

  // Export financial report handler
  const handleExportCsv = () => {
    // Defense-in-depth: Reject if effective plan tier is not entitled to CSV export
    if (!canExportCsv) {
      setFeedbackMessage({
        type: 'error',
        text: "Moliyaviy hisobotni CSV formatida yuklab olish faqat Pro va Ultra tariflarida mavjud. Iltimos, tarifingizni yangilang.",
      });
      return;
    }

    setIsExporting(true);
    try {
      const csvContent = buildFinanceReportCsv({
        dateRangeLabel,
        metrics,
        expenses: filteredTransactions.map((tx) => ({
          id: tx.id,
          date: tx.date,
          category: EXPENSE_CATEGORIES.find((c) => c.id === tx.category)?.label || tx.category,
          description: tx.description || '',
          amount: tx.amount,
        })),
        orders: filteredOrdersForReport,
      });

      const safeDateSuffix = activeDateRange.startDate && activeDateRange.endDate
        ? `_${activeDateRange.startDate}_${activeDateRange.endDate}`
        : '';
      const filename = `BESTO_moliyaviy_hisobot${safeDateSuffix}.csv`;

      downloadCsv(filename, csvContent);

      setFeedbackMessage({
        type: 'success',
        text: "Moliyaviy hisobot CSV formatida muvaffaqiyatli yuklab olindi!",
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || "Hisobotni eksport qilishda xatolik yuz berdi",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Open modal for new expense
  const handleOpenCreateModal = () => {
    setEditingTransaction(null);
    setFormCategory('ijara');
    setFormAmount('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormDescription('');
    setFormErrors([]);
    setIsModalOpen(true);
  };

  // Open modal for editing existing expense
  const handleOpenEditModal = (tx: FinancialTransaction) => {
    setEditingTransaction(tx);
    setFormCategory((tx.category as ExpenseCategory) || 'boshqa');
    setFormAmount(tx.amount.toString());
    setFormDate(tx.date || new Date().toISOString().slice(0, 10));
    setFormDescription(tx.description || '');
    setFormErrors([]);
    setIsModalOpen(true);
  };

  // Save expense handler
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const input: ExpenseTransactionInput = {
      type: 'expense',
      category: formCategory,
      amount: parseFloat(formAmount) || 0,
      date: formDate,
      description: formDescription,
    };

    setSubmittingForm(true);
    setFormErrors([]);

    try {
      if (editingTransaction) {
        const updated = await updateExpense(user.uid, editingTransaction.id, input);
        setTransactions((prev) =>
          prev.map((t) => (t.id === editingTransaction.id ? updated : t))
        );
        setFeedbackMessage({
          type: 'success',
          text: "Xarajat muvaffaqiyatli tahrirlandi!",
        });
      } else {
        const created = await createExpense(user.uid, input);
        setTransactions((prev) => [created, ...prev]);
        setFeedbackMessage({
          type: 'success',
          text: "Yangi xarajat muvaffaqiyatli kiritildi!",
        });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormErrors([err.message || "Xarajatni saqlashda xatolik yuz berdi"]);
    } finally {
      setSubmittingForm(false);
    }
  };

  // Delete expense handler
  const handleDeleteExpense = async (tx: FinancialTransaction) => {
    if (!user) return;
    const confirmChoice = window.confirm(
      `Ushbu xarajatni ("${tx.amount.toLocaleString()} so'm", ${tx.date}) o'chirmoqchimisiz?`
    );
    if (!confirmChoice) return;

    setActionLoadingId(tx.id);
    try {
      await deleteExpense(user.uid, tx.id);
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      setFeedbackMessage({
        type: 'success',
        text: "Xarajat muvaffaqiyatli o'chirildi",
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || "Xarajatni o'chirishda xatolik yuz berdi",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Module Banner Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E0ECE8] shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#173B35] text-[#D7F0E5] flex items-center justify-center font-bold shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#112521] tracking-tight">
                Moliya & Xarajatlar hisobi
              </h1>
              <p className="text-xs text-[#52796F]">
                Kassa tushumi, mahsulotlar tannarxi (COGS), xarajatlar va taxminiy sof foyda
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <button
            onClick={loadData}
            title="Yangilash"
            className="p-2.5 text-[#52796F] hover:text-[#112521] bg-[#F6F8F7] hover:bg-[#E0ECE8]/50 border border-[#E0ECE8] rounded-xl transition-all btn-tactile cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canExportCsv && (
            <button
              onClick={handleExportCsv}
              disabled={isExporting || loading}
              title="Moliyaviy hisobotni CSV formatida yuklab olish"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold text-[#173B35] bg-white hover:bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl transition-all btn-tactile disabled:opacity-50 shadow-subtle cursor-pointer"
            >
              {isExporting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#173B35]" />
              ) : (
                <Download className="w-4 h-4 text-[#173B35]" />
              )}
              <span>Hisobotni yuklash (CSV)</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#173B35] hover:bg-[#112521] border border-[#173B35] rounded-xl transition-all btn-tactile shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#F5B85C]" />
            <span>Yangi xarajat kiritish</span>
          </button>
        </div>
      </div>

      {/* 2. Feedback Notification */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Date Range Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-[#E0ECE8] shadow-subtle space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#55756E]" />
            <span className="text-xs font-bold text-[#112521]">Hisobot davri:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDatePreset('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                datePreset === 'all'
                  ? 'bg-[#173B35] text-white shadow-xs'
                  : 'bg-[#F6F8F7] text-[#2C4C45] hover:bg-[#E0ECE8]'
              }`}
            >
              Barcha davr
            </button>
            <button
              onClick={() => setDatePreset('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                datePreset === 'today'
                  ? 'bg-[#173B35] text-white shadow-xs'
                  : 'bg-[#F6F8F7] text-[#2C4C45] hover:bg-[#E0ECE8]'
              }`}
            >
              Bugun
            </button>
            <button
              onClick={() => setDatePreset('this_week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                datePreset === 'this_week'
                  ? 'bg-[#173B35] text-white shadow-xs'
                  : 'bg-[#F6F8F7] text-[#2C4C45] hover:bg-[#E0ECE8]'
              }`}
            >
              Shu hafta
            </button>
            <button
              onClick={() => setDatePreset('this_month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                datePreset === 'this_month'
                  ? 'bg-[#173B35] text-white shadow-xs'
                  : 'bg-[#F6F8F7] text-[#2C4C45] hover:bg-[#E0ECE8]'
              }`}
            >
              Shu oy
            </button>
            <button
              onClick={() => setDatePreset('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                datePreset === 'custom'
                  ? 'bg-[#173B35] text-white shadow-xs'
                  : 'bg-[#F6F8F7] text-[#2C4C45] hover:bg-[#E0ECE8]'
              }`}
            >
              Moslashtirilgan
            </button>
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-[#E0ECE8] animate-fadeIn">
            <div className="flex-1 w-full flex items-center gap-2">
              <span className="text-xs text-[#55756E] shrink-0">Boshlanish:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#112521] focus:outline-none focus:border-[#173B35]"
              />
            </div>
            <div className="flex-1 w-full flex items-center gap-2">
              <span className="text-xs text-[#55756E] shrink-0">Tugash:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#112521] focus:outline-none focus:border-[#173B35]"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Financial Summary Cards (5 Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Paid Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-[#E0ECE8] shadow-subtle">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-emerald-800">Haqiqiy tushum</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-base sm:text-lg font-bold text-emerald-900 truncate block font-mono">
            {formatMoney(metrics.paidRevenue)}
          </span>
          <span className="text-[10px] text-[#55756E] block mt-1">
            Muvaffaqiyatli qabul qilingan pullar ({metrics.orderCount} buyurtma)
          </span>
        </div>

        {/* Card 2: Remaining Debt */}
        <div className="bg-white p-4 rounded-2xl border border-[#E0ECE8] shadow-subtle">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-rose-800">Qolgan qarz</span>
            <Clock className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <span className="text-base sm:text-lg font-bold text-rose-900 truncate block font-mono">
            {formatMoney(metrics.unpaidDebt)}
          </span>
          <span className="text-[10px] text-[#55756E] block mt-1">
            Mijozlardan kutilayotgan nasiya
          </span>
        </div>

        {/* Card 3: COGS */}
        <div className="bg-white p-4 rounded-2xl border border-[#E0ECE8] shadow-subtle">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#55756E]">Mahsulot tannarxi</span>
            <ShoppingBag className="w-3.5 h-3.5 text-[#55756E]" />
          </div>
          <span className="text-base sm:text-lg font-bold text-[#112521] truncate block font-mono">
            {formatMoney(metrics.costOfGoodsSold)}
          </span>
          <span className="text-[10px] text-[#55756E] block mt-1">
            Sotilgan tovarlar tannarxi (COGS)
          </span>
        </div>

        {/* Card 4: Total Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-[#E0ECE8] shadow-subtle">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-amber-800">Operatsion xarajatlar</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-base sm:text-lg font-bold text-amber-900 truncate block font-mono">
            {formatMoney(metrics.totalExpenses)}
          </span>
          <span className="text-[10px] text-[#55756E] block mt-1">
            Qo'lda kiritilgan xarajatlar ({metrics.expenseCount} ta)
          </span>
        </div>

        {/* Card 5: Estimated Net Profit */}
        <div className="col-span-2 lg:col-span-1 bg-[#D7F0E5]/60 p-4 rounded-2xl border border-[#B5E2D1] shadow-subtle">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#173B35]">Taxminiy sof foyda</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-[#173B35] border border-[#B5E2D1]">
              {metrics.profitMarginPercent}% marja
            </span>
          </div>
          <span
            className={`text-base sm:text-lg font-extrabold truncate block font-mono ${
              metrics.estimatedNetProfit >= 0 ? 'text-[#173B35]' : 'text-rose-700'
            }`}
          >
            {formatMoney(metrics.estimatedNetProfit)}
          </span>
          <span className="text-[10px] text-[#2C4C45] block mt-1 font-medium">
            Tushum - COGS - Xarajatlar
          </span>
        </div>
      </div>

      {/* 5. Disclaimer Notice */}
      <div className="bg-[#F6F8F7] p-3.5 rounded-2xl border border-[#E0ECE8] flex items-start gap-2.5 text-xs text-[#2C4C45]">
        <HelpCircle className="w-4 h-4 text-[#173B35] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#112521]">Hisobiy izoh:</span> "Taxminiy sof foyda"
          mavjud kassa tushumidan amalda sotilgan tovarlar tannarxi va qo'lda kiritilgan operatsion
          xarajatlarni ayirish orqali hisoblangan. Davlat soliqlari va kiritilmagan qo'shimcha
          rasmiy xarajatlar bu hisobga o'zboshimchalik bilan qo'shilmagan.
        </div>
      </div>

      {/* 6. Expenses List Section */}
      <div className="bg-white p-5 rounded-2xl border border-[#E0ECE8] shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E0ECE8]">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#173B35]" />
            <h2 className="text-sm font-bold text-[#112521]">
              Xarajatlar daftari ({filteredTransactions.length} ta yozuv)
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
              className="px-3 py-1.5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#112521] focus:outline-none focus:border-[#173B35]"
            >
              <option value="all">Barcha kategoriyalar</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#55756E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Izoh yoki summa bo'yicha..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#112521] placeholder-[#55756E] focus:outline-none focus:border-[#173B35]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[#55756E] flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#173B35]" />
            <span>Xarajatlar yuklanmoqda...</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#55756E] space-y-2 border border-dashed border-[#E0ECE8] rounded-2xl bg-[#F6F8F7]/50">
            <Receipt className="w-8 h-8 text-[#173B35] mx-auto opacity-50" />
            <div className="font-bold text-[#112521]">Hech qanday xarajat yozuvi topilmadi</div>
            <p className="max-w-md mx-auto text-[11px] text-[#55756E]">
              {searchQuery || categoryFilter !== 'all' || datePreset !== 'all'
                ? "Filtr bo'yicha hech qanday xarajat mos kelmadi. Filtr va qidiruvni tozalab ko'ring."
                : "Biznesingizning ijara, reklama, ish haqi va boshqa xarajatlarini kiritib boring."}
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#173B35] hover:bg-[#112521] rounded-xl transition-all btn-tactile cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#F5B85C]" />
              <span>Yangi xarajat qo'shish</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F6F8F7] text-[#55756E] font-bold border-b border-[#E0ECE8]">
                  <th className="p-3 rounded-l-xl">Sana</th>
                  <th className="p-3">Kategoriya</th>
                  <th className="p-3">Izoh</th>
                  <th className="p-3 text-right">Summa</th>
                  <th className="p-3 text-right rounded-r-xl">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0ECE8]">
                {filteredTransactions.map((tx) => {
                  const catLabel =
                    EXPENSE_CATEGORIES.find((c) => c.id === tx.category)?.label || tx.category;
                  const isProcessing = actionLoadingId === tx.id;

                  return (
                    <tr key={tx.id} className="hover:bg-[#F6F8F7]/70 transition-colors">
                      <td className="p-3 font-semibold text-[#112521] shrink-0 font-mono">
                        {tx.date}
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-[#D7F0E5]/60 text-[#173B35] border border-[#B5E2D1] text-[11px] font-semibold">
                          {catLabel}
                        </span>
                      </td>
                      <td className="p-3 text-[#2C4C45] max-w-xs truncate">
                        {tx.description || '—'}
                      </td>
                      <td className="p-3 text-right font-extrabold text-rose-700 font-mono">
                        -{formatMoney(tx.amount)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(tx)}
                            disabled={isProcessing}
                            title="Tahrirlash"
                            className="p-1.5 text-gray-500 hover:text-[#173B35] hover:bg-[#D7F0E5]/30 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(tx)}
                            disabled={isProcessing}
                            title="O'chirish"
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Create/Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E0ECE8] shadow-modal w-full max-w-md overflow-hidden flex flex-col max-h-[90dvh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E0ECE8] bg-[#F6F8F7] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#173B35] text-[#F5B85C] flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#112521]">
                    {editingTransaction ? "Xarajatni tahrirlash" : "Yangi xarajat kiritish"}
                  </h3>
                  <p className="text-[11px] text-[#55756E]">
                    Biznes operatsion va ma'muriy xarajatlari
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#55756E] hover:text-[#112521] rounded-xl hover:bg-[#E0ECE8] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveExpense} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {formErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                  {formErrors.map((err, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block font-bold text-[#112521] mb-1">
                  Xarajat kategoriyasi *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#112521] font-medium focus:outline-none focus:border-[#173B35]"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block font-bold text-[#112521] mb-1">
                  Xarajat summasi * ({businessProfile?.currency || 'UZS'})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="Masalan: 1200000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E0ECE8] rounded-xl text-xs font-bold text-[#112521] focus:outline-none focus:border-[#173B35] font-mono"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block font-bold text-[#112521] mb-1">
                  Xarajat qilingan sana *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E0ECE8] rounded-xl text-xs text-[#112521] focus:outline-none focus:border-[#173B35]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-[#112521] mb-1">
                  Izoh / Tafsilot (ixtiyoriy)
                </label>
                <textarea
                  rows={2}
                  placeholder="Masalan: Avgust oyi uchun do'kon ijarasi..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E0ECE8] rounded-xl text-xs text-[#112521] focus:outline-none focus:border-[#173B35]"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-[#E0ECE8] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#2C4C45] bg-[#F6F8F7] hover:bg-[#E0ECE8] rounded-xl transition-all cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#173B35] hover:bg-[#112521] rounded-xl transition-all btn-tactile disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submittingForm && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTransaction ? "Saqlash" : "Xarajatni kiritish"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
