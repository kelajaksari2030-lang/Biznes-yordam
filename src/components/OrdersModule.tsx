import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Clock,
  ArrowRight,
  Trash2,
  PackageCheck,
  Ban,
  Layers,
  ChevronDown,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ReceiptText,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order, OrderItem, OrderStatus, OrderPaymentStatus } from '../types/business';
import { Customer } from '../types/crm';
import { Product } from '../types/inventory';
import { getCustomers } from '../services/crmService';
import { getProducts } from '../services/inventoryService';
import {
  getOrders,
  createOrder,
  confirmOrder,
  cancelOrder,
  deliverOrder,
  updateOrderPaymentStatus,
  deleteOrder,
  calculateOrderFinancials,
  calculateOrderStats,
  CreateOrderInput,
} from '../services/orderService';
import { ModuleHelpGuide, HelpGuideButton, HelpStep } from './ModuleHelpGuide';
import { QuickSaleModal } from './QuickSaleModal';

export const OrdersModule: React.FC = () => {
  const { user } = useAuth();

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Sale (POS) State
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<OrderPaymentStatus | 'all'>('all');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Form State for New Order
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState('');
  const [orderItems, setOrderItems] = useState<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    unit: string;
    stockAvailable: number;
  }[]>([]);
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState('');
  const [orderPaymentStatus, setOrderPaymentStatus] = useState<OrderPaymentStatus>('unpaid');
  const [orderPartialPaidAmount, setOrderPartialPaidAmount] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [autoConfirmOnCreate, setAutoConfirmOnCreate] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Help Guide state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem('besto_help_orders_seen');
      if (!seen) {
        setIsHelpOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const ordersHelpSteps: HelpStep[] = useMemo(() => [
    {
      title: "1. Buyurtma yaratish va mijoz tanlash",
      description: "Sariq 'Yangi buyurtma yaratish' tugmasini bosing. CRM doimiy mijozlaringiz ro'yxatidan birini tanlang yoki yangi mijoz ism va telefonini kiritib buyurtma oching.",
      tip: "Mavjud CRM mijozini tanlash uning xarid tarixini saqlab borish va bog'lanishni osonlashtiradi.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="20" y="20" width="460" height="40" rx="10" fill="#FFFFFF" stroke="#E0ECE8" strokeWidth="1" />
          <rect x="35" y="32" width="16" height="16" rx="4" fill="#D7F0E5" />
          <text x="60" y="44" fill="#173B35" fontSize="11" fontWeight="bold">Savdo Buyurtmalari</text>
          <rect x="310" y="26" width="155" height="28" rx="8" fill="#F5B85C" />
          <text x="322" y="44" fill="#173B35" fontSize="10" fontWeight="bold">+ Yangi buyurtma yaratish</text>

          <rect x="50" y="75" width="400" height="125" rx="12" fill="#FFFFFF" stroke="#173B35" strokeWidth="2" />
          <text x="70" y="96" fill="#173B35" fontSize="11" fontWeight="bold">1. Mijozni tanlang (CRM)</text>
          <rect x="70" y="108" width="360" height="28" rx="8" fill="#FAF8F5" stroke="#D7F0E5" strokeWidth="1" />
          <text x="85" y="126" fill="#173B35" fontSize="10" fontWeight="bold">Anvar Qodirov (+998901234567)</text>

          <text x="70" y="155" fill="#52796F" fontSize="9">Mijoz tanlanganda uning telefon raqami avtomatik ravishda birikadi.</text>
        </svg>
      ),
    },
    {
      title: "2. Ombor mahsulotlarini biriktirish",
      description: "Omboringizdagi tovarlar ro'yxatidan keraklisini tanlang. Buyurtma uchun miqdor va maxsus sotuv narxini belgilang.",
      tip: "Tizim real-vaqt rejimida ushbu buyurtmadan tushadigan umumiy summani va sof foydani hisoblab beradi.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="30" y="20" width="440" height="36" rx="10" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="45" y="42" fill="#173B35" fontSize="10" fontWeight="bold">+ Erkaklar klassik charm poyabzali — Qoldiq: 50 dona</text>

          <rect x="30" y="68" width="440" height="70" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1" />
          <text x="45" y="90" fill="#173B35" fontSize="11" fontWeight="bold">Erkaklar klassik charm poyabzali</text>
          <text x="45" y="115" fill="#52796F" fontSize="10">Soni: 2 dona × 210 000 so'm = 420 000 so'm</text>

          <rect x="30" y="148" width="440" height="52" rx="10" fill="#D7F0E5" stroke="#173B35" strokeWidth="1" />
          <text x="45" y="170" fill="#173B35" fontSize="11" fontWeight="bold">Jami sotuv: 420 000 so'm</text>
          <text x="260" y="170" fill="#047857" fontSize="11" fontWeight="bold">Kutilgan sof foyda: +180 000 so'm</text>
        </svg>
      ),
    },
    {
      title: "3. Buyurtma holatlari va Ombor qoldig'i mantiqi",
      description: "Buyurtma yaratilganda 'Kutilmoqda (Draft)' holatida bo'ladi. 'Tasdiqlash' tugmasi bosilgach, mahsulotlar ombordan ATOMIK ravishda yechiladi. Bekor qilinsa, ombor qoldig'i tiklanadi!",
      tip: "Ushbu xavfsiz mantiq omborda yo'q tovarni tasdiqlatmaydi hamda nohaq qaytarishlar ombor hisobini buza olmasligini ta'minlaydi.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="20" y="30" width="120" height="40" rx="8" fill="#FEF3C7" stroke="#FDE047" strokeWidth="1" />
          <text x="30" y="54" fill="#854D0E" fontSize="10" fontWeight="bold">Kutilmoqda (Draft)</text>

          <text x="148" y="54" fill="#52796F" fontSize="12">➔</text>

          <rect x="165" y="30" width="165" height="40" rx="8" fill="#2563EB" />
          <text x="175" y="54" fill="#FFFFFF" fontSize="10" fontWeight="bold">✓ Tasdiqlash (Ombor yechildi)</text>

          <text x="338" y="54" fill="#52796F" fontSize="12">➔</text>

          <rect x="355" y="30" width="125" height="40" rx="8" fill="#D1FAE5" stroke="#6EE7B7" strokeWidth="1" />
          <text x="375" y="54" fill="#065F46" fontSize="10" fontWeight="bold">Yetkazildi</text>

          <rect x="30" y="95" width="440" height="95" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="45" y="120" fill="#173B35" fontSize="11" fontWeight="bold">⚠️ Bekor qilish tugmasi amali:</text>
          <text x="45" y="142" fill="#A93C3E" fontSize="10" fontWeight="bold">Bekor qilinganda ombordan yechilgan tovarlar avtomatik orqaga qaytariladi!</text>
          <text x="45" y="162" fill="#52796F" fontSize="10">Kassa va omboringiz har doim aniq muvozanatda turadi.</text>
        </svg>
      ),
    },
    {
      title: "4. To'lov holati va Qarzlar nazorati",
      description: "Buyurtma to'lov holatini belgilang: To'lanmagan (Nasiya), Qisman to'langan yoki To'langan. Qarz va tushum kassa moliya statistikasida real-vaqtda aks etadi.",
      tip: "Qisman to'lov tanlanganda to'langan va qolgan nasiya summasi alohida ajratib ko'rsatiladi.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="30" y="25" width="130" height="40" rx="8" fill="#D1FAE5" stroke="#6EE7B7" strokeWidth="1" />
          <text x="50" y="50" fill="#065F46" fontSize="11" fontWeight="bold">✓ To'langan</text>

          <rect x="185" y="25" width="130" height="40" rx="8" fill="#FEF3C7" stroke="#FDE047" strokeWidth="1" />
          <text x="200" y="50" fill="#854D0E" fontSize="11" fontWeight="bold">Qisman to'langan</text>

          <rect x="340" y="25" width="130" height="40" rx="8" fill="#FFE4E6" stroke="#FECDD3" strokeWidth="1" />
          <text x="355" y="50" fill="#9F1239" fontSize="11" fontWeight="bold">To'lanmagan (Qarz)</text>

          <rect x="30" y="85" width="440" height="110" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="45" y="110" fill="#173B35" fontSize="11" fontWeight="bold">Buyurtma to'lov summasi ko'rinishi:</text>
          <text x="45" y="132" fill="#112521" fontSize="11">Jami: 420 000 so'm</text>
          <text x="180" y="132" fill="#047857" fontSize="11" fontWeight="bold">To'landi: 200 000 so'm</text>
          <text x="330" y="132" fill="#BE123C" fontSize="11" fontWeight="bold">Qarz: 220 000 so'm</text>
        </svg>
      ),
    },
  ], []);

  // Fetch data
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [fetchedOrders, fetchedCustomers, fetchedProducts] = await Promise.all([
        getOrders(user.uid),
        getCustomers(user.uid),
        getProducts(user.uid),
      ]);
      setOrders(fetchedOrders);
      setCustomers(fetchedCustomers);
      setProducts(fetchedProducts);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || "Ma'lumotlarni yuklashda xatolik yuz berdi" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Derived statistics
  const stats = useMemo(() => calculateOrderStats(orders), [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        searchQuery === '' ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.orderNumber && order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.customerPhone && order.customerPhone.includes(searchQuery)) ||
        order.items.some((item) => item.productName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, searchQuery, statusFilter, paymentFilter]);

  // New order calculation
  const newOrderCalculations = useMemo(() => {
    return calculateOrderFinancials(
      orderItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        unit: item.unit,
      }))
    );
  }, [orderItems]);

  // Add product to new order draft
  const handleAddProductToDraft = (productId: string) => {
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    // Check if already in draft
    const existingIndex = orderItems.findIndex((item) => item.productId === productId);
    if (existingIndex >= 0) {
      setOrderItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setOrderItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          unitPrice: prod.sellingPrice || 0,
          unitCost: prod.purchasePrice || 0,
          unit: prod.unit || 'dona',
          stockAvailable: prod.quantity || 0,
        },
      ]);
    }
    setSelectedProductIdToAdd('');
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setOrderItems((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, quantity: newQty } : item))
      );
    }
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    setOrderItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, unitPrice: Math.max(0, newPrice) } : item))
    );
  };

  // Submit create order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormErrors([]);

    let customerName = '';
    let customerPhone = '';
    let customerId = selectedCustomerId;

    if (selectedCustomerId === 'new' || !selectedCustomerId) {
      if (!customCustomerName.trim()) {
        setFormErrors(["Mijoz ismini kiriting yoki ro'yxatdan tanlang"]);
        return;
      }
      customerName = customCustomerName.trim();
      customerPhone = customCustomerPhone.trim();
      customerId = `cust_adhoc_${Date.now()}`;
    } else {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      if (cust) {
        customerName = cust.name;
        customerPhone = cust.phone;
      } else {
        setFormErrors(["Tanlangan mijoz topilmadi"]);
        return;
      }
    }

    if (orderItems.length === 0) {
      setFormErrors(["Buyurtmaga kamida 1 ta mahsulot qo'shing"]);
      return;
    }

    setSubmittingOrder(true);
    try {
      const input: CreateOrderInput = {
        customerId,
        customerName,
        customerPhone,
        items: orderItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost,
          unit: item.unit,
        })),
        paymentStatus: orderPaymentStatus,
        paidAmount: orderPaymentStatus === 'partially_paid' ? orderPartialPaidAmount : undefined,
        notes: orderNotes,
      };

      await createOrder(user.uid, input, { autoConfirm: autoConfirmOnCreate });

      setFeedbackMessage({
        type: 'success',
        text: autoConfirmOnCreate
          ? "Buyurtma yaratildi, tasdiqlandi va ombor qoldig'i kamaytirildi!"
          : "Buyurtma qoralama (draft) holatida muvaffaqiyatli saqlandi!",
      });

      // Reset form
      setIsCreateModalOpen(false);
      setSelectedCustomerId('');
      setCustomCustomerName('');
      setCustomCustomerPhone('');
      setOrderItems([]);
      setOrderPartialPaidAmount(0);
      setOrderNotes('');
      setAutoConfirmOnCreate(false);

      // Refresh all lists
      await loadData();
    } catch (err: any) {
      setFormErrors([err.message || "Buyurtma yaratishda xatolik yuz berdi"]);
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Confirm order action (Atomic transaction with stock deduction)
  const handleConfirmOrder = async (orderId: string) => {
    if (!user) return;
    setActionLoadingId(orderId);
    setFeedbackMessage(null);
    try {
      await confirmOrder(user.uid, orderId);
      setFeedbackMessage({
        type: 'success',
        text: "Buyurtma tasdiqlandi! Mahsulotlar ombor qoldig'idan atomik tarzda yechildi.",
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || "Buyurtmani tasdiqlashda xatolik yuz berdi",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel order action (Atomic transaction with stock restoration)
  const handleCancelOrder = async (orderId: string) => {
    if (!user) return;
    const confirmChoice = window.confirm(
      "Buyurtmani bekor qilmoqchimisiz? Agar tovarlar ombordan yechilgan bo'lsa, ular qayta omborga qo'shiladi."
    );
    if (!confirmChoice) return;

    setActionLoadingId(orderId);
    setFeedbackMessage(null);
    try {
      await cancelOrder(user.uid, orderId);
      setFeedbackMessage({
        type: 'success',
        text: "Buyurtma bekor qilindi. Agar tovarlar ombordan olingan bo'lsa, qoldiqlar qaytarildi.",
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || "Buyurtmani bekor qilishda xatolik yuz berdi",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mark delivered
  const handleDeliverOrder = async (orderId: string) => {
    if (!user) return;
    setActionLoadingId(orderId);
    try {
      await deliverOrder(user.uid, orderId);
      setFeedbackMessage({
        type: 'success',
        text: "Buyurtma 'Yetkazildi' holatiga o'tkazildi!",
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || "Yetkazish holatini o'zgartirishda xatolik",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Payment status change
  const handlePaymentChange = async (orderId: string, newPaymentStatus: OrderPaymentStatus) => {
    if (!user) return;
    let partialVal: number | undefined = undefined;

    if (newPaymentStatus === 'partially_paid') {
      const targetOrder = orders.find((o) => o.id === orderId);
      const defaultVal = targetOrder?.paidAmount ? String(targetOrder.paidAmount) : '0';
      const inputVal = window.prompt(
        `Qisman to'langan summani kiriting (so'mda):\nJami buyurtma summasi: ${targetOrder?.totalAmount.toLocaleString()} so'm`,
        defaultVal
      );
      if (inputVal === null) return; // Cancelled
      partialVal = Math.max(0, parseInt(inputVal) || 0);
    }

    try {
      await updateOrderPaymentStatus(user.uid, orderId, newPaymentStatus, partialVal);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            let pAmt = 0;
            if (newPaymentStatus === 'paid') pAmt = o.totalAmount;
            else if (newPaymentStatus === 'partially_paid') pAmt = partialVal ?? o.paidAmount ?? 0;
            else pAmt = 0;
            return { ...o, paymentStatus: newPaymentStatus, paidAmount: pAmt };
          }
          return o;
        })
      );
      setFeedbackMessage({
        type: 'success',
        text: "To'lov holati va to'langan summa yangilandi!",
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || "To'lov holati o'zgarmadi",
      });
    }
  };

  // Delete order
  const handleDeleteOrder = async (order: Order) => {
    if (!user) return;
    if (order.stockDeducted) {
      alert("Bu buyurtma ombor qoldig'ini kamaytirgan. Avval uni 'Bekor qilish' tugmasi bilan bekor qiling, shunda tovarlar omborga qaytadi.");
      return;
    }
    const confirmed = window.confirm("Rostdan ham ushbu buyurtmani o'chirmoqchimisiz?");
    if (!confirmed) return;

    setActionLoadingId(order.id);
    try {
      await deleteOrder(user.uid, order.id, order.stockDeducted);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setFeedbackMessage({
        type: 'success',
        text: "Buyurtma muvaffaqiyatli o'chirildi",
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || "Buyurtmani o'chirishda xatolik",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatPrice = (val: number) => {
    return (val || 0).toLocaleString('uz-UZ') + " so'm";
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E0ECE8] shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#112521] text-[#F5B85C] flex items-center justify-center font-bold shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[#112521] tracking-tight">
                  Savdo buyurtmalari
                </h1>
                <HelpGuideButton onClick={() => setIsHelpOpen(true)} />
              </div>
              <p className="text-xs text-[#2A5C52]">
                Mijozlar buyurtmalari, savdo hisobi va ombor bilan atomik bog'lanish
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadData}
            title="Yangilash"
            className="p-2.5 text-[#173B35] hover:text-[#112521] bg-white hover:bg-[#D7F0E5]/30 border border-[#E0ECE8] rounded-xl transition-all btn-tactile cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsQuickSaleOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#173B35] hover:bg-[#112521] border border-[#173B35] rounded-xl transition-all btn-tactile shadow-2xs cursor-pointer"
          >
            <Zap className="w-4 h-4 text-[#F5B85C]" />
            <span>⚡ Tezkor Savdo (Kassa)</span>
          </button>

          <button
            onClick={() => {
              setFormErrors([]);
              setIsCreateModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-[#173B35] bg-[#F5B85C] hover:bg-[#E5A74B] border border-[#F5B85C] rounded-xl transition-all btn-tactile shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi buyurtma yaratish</span>
          </button>
        </div>
      </div>

      {/* 2. Notification Feedback Banner */}
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

      {/* 3. Summary Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-[#E0ECE8] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#52796F] block mb-1">Jami buyurtmalar</span>
          <span className="text-xl font-bold text-[#112521]">{stats.totalOrders} ta</span>
          <span className="text-[10px] text-[#173B35] block mt-1">
            {stats.draftCount} ta kutilmoqda
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E0ECE8] shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-700 block mb-1">Tasdiqlangan</span>
          <span className="text-xl font-bold text-blue-900">{stats.confirmedCount} ta</span>
          <span className="text-[10px] text-blue-600 block mt-1">Ombordan yechilgan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E0ECE8] shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 block mb-1">Yetkazilgan</span>
          <span className="text-xl font-bold text-emerald-900">{stats.deliveredCount} ta</span>
          <span className="text-[10px] text-emerald-600 block mt-1">Muvaffaqiyatli savdo</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E0ECE8] shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 block mb-1">Haqiqiy tushum (To'langan)</span>
          <span className="text-base sm:text-lg font-bold text-emerald-700 truncate block">
            {formatPrice(stats.paidRevenue)}
          </span>
          <span className="text-[10px] text-[#173B35] block mt-1">
            Nasiya/kutilmoqda: {formatPrice(stats.unpaidRevenue)}
          </span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-[#F6F8F7] p-4 rounded-xl border border-[#F5B85C]/60 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#173B35] block mb-1">Kutilgan sof foyda</span>
          <span className="text-base sm:text-lg font-bold text-[#112521] truncate block">
            {formatPrice(stats.totalProfit)}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
            Real tushgan: {formatPrice(stats.realizedProfit)}
          </span>
        </div>
      </div>

      {/* 4. Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E0ECE8] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#52796F] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mijoz ismi, telefon, buyurtma raqami yoki mahsulot bo'yicha qidirish..."
              className="w-full pl-9 pr-4 py-2 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#112521] placeholder-[#52796F] focus:outline-hidden focus:border-[#F5B85C] focus:ring-1 focus:ring-[#F5B85C]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Barchasi' },
              { id: 'draft', label: 'Kutilmoqda (Draft)' },
              { id: 'confirmed', label: 'Tasdiqlangan' },
              { id: 'delivered', label: 'Yetkazilgan' },
              { id: 'cancelled', label: 'Bekor qilingan' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === st.id
                    ? 'bg-[#112521] text-[#F5B85C] shadow-xs'
                    : 'bg-[#F6F8F7] text-[#52796F] hover:bg-[#E0ECE8] border border-[#E0ECE8]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Orders Listing */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-[#E0ECE8] text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#F5B85C] animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#173B35]">Buyurtmalar yuklanmoqda...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#E0ECE8] text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F6F8F7] border border-[#E0ECE8] text-[#173B35] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#112521]">Hozircha buyurtmalar yo'q</h3>
            <p className="text-xs text-[#52796F] max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? "Qidiruv parametrlariga mos keladigan buyurtma topilmadi."
                : "Birinchi buyurtmangizni qo'shing. CRM mijozi va ombordagi mahsulotlarni tanlab, darhol hisob-kitob qiling."}
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#112521] bg-[#F5B85C] hover:bg-[#E5A749] rounded-xl transition-all btn-tactile shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi buyurtma yaratish</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => {
            const isProcessing = actionLoadingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white border border-[#E0ECE8] hover:border-[#F5B85C] rounded-2xl p-4 sm:p-5 shadow-card transition-all space-y-4"
              >
                {/* Header row: Order number, date, customer info, badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F6F8F7] pb-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F6F8F7] border border-[#E0ECE8] text-[#112521] flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                      {order.orderNumber ? order.orderNumber.slice(-4) : 'ORD'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#112521]">{order.customerName}</span>
                        {order.orderNumber && (
                          <span className="text-[10px] font-mono text-[#52796F] bg-[#F6F8F7] px-1.5 py-0.5 rounded border border-[#E0ECE8]">
                            {order.orderNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#173B35] mt-0.5">
                        {order.customerPhone && (
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="inline-flex items-center gap-1 hover:text-[#112521] hover:underline"
                          >
                            <Phone className="w-3 h-3 text-[#F5B85C]" />
                            <span>{order.customerPhone}</span>
                          </a>
                        )}
                        <span>·</span>
                        <span className="text-[11px] text-[#52796F]">
                          {new Date(order.createdAt).toLocaleDateString('uz-UZ', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Order Status Badge */}
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                        order.status === 'confirmed'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : order.status === 'delivered'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : order.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {order.status === 'draft' && "Kutilmoqda (Draft)"}
                      {order.status === 'confirmed' && "Tasdiqlangan (Ombordan yechildi)"}
                      {order.status === 'delivered' && "Yetkazildi"}
                      {order.status === 'cancelled' && "Bekor qilingan"}
                    </span>

                    {/* Payment Status Dropdown Selector */}
                    <select
                      value={order.paymentStatus}
                      onChange={(e) => handlePaymentChange(order.id, e.target.value as OrderPaymentStatus)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-hidden ${
                        order.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : order.paymentStatus === 'partially_paid'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      <option value="unpaid">To'lanmagan</option>
                      <option value="partially_paid">Qisman to'langan</option>
                      <option value="paid">To'langan</option>
                    </select>
                  </div>
                </div>

                {/* Items preview list */}
                <div className="bg-[#F6F8F7] p-3 rounded-xl border border-[#E0ECE8] space-y-2">
                  <div className="text-[11px] font-semibold text-[#52796F] uppercase tracking-wider">
                    Buyurtma tarkibi ({order.items.length} xil mahsulot)
                  </div>
                  <div className="divide-y divide-[#E0ECE8]/60">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#112521]">{item.productName}</span>
                          <span className="text-[#52796F]">
                            × {item.quantity} {item.unit || 'dona'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#112521]">
                            {formatPrice(item.totalPrice)}
                          </span>
                          <span className="text-[10px] text-[#52796F] block">
                            (tannarx: {formatPrice(item.totalCost)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="pt-2 border-t border-[#E0ECE8]/60 text-xs text-[#173B35] italic">
                      Izoh: {order.notes}
                    </div>
                  )}
                </div>

                {/* Totals & Action buttons bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <div>
                      <span className="text-[10px] font-semibold text-[#52796F] block">Jami summa:</span>
                      <span className="text-base font-extrabold text-[#112521]">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-[#52796F] block">
                        {order.paymentStatus === 'paid'
                          ? "To'langan:"
                          : order.paymentStatus === 'partially_paid'
                          ? "Qisman to'langan:"
                          : "To'lanmagan (Qarz):"}
                      </span>
                      <span className={`text-sm font-bold ${
                        order.paymentStatus === 'paid'
                          ? 'text-emerald-700'
                          : order.paymentStatus === 'partially_paid'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }`}>
                        {formatPrice(
                          order.paymentStatus === 'paid'
                            ? order.totalAmount
                            : typeof order.paidAmount === 'number'
                            ? order.paidAmount
                            : 0
                        )}
                      </span>
                    </div>

                    {order.paymentStatus === 'partially_paid' && (
                      <div>
                        <span className="text-[10px] font-semibold text-[#52796F] block">Qolgan qarz:</span>
                        <span className="text-sm font-bold text-rose-700">
                          {formatPrice(Math.max(0, order.totalAmount - (order.paidAmount || 0)))}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-semibold text-[#52796F] block">Sof foyda:</span>
                      <span className="text-sm font-bold text-emerald-700">
                        {formatPrice(order.totalProfit)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Draft actions */}
                    {order.status === 'draft' && (
                      <button
                        onClick={() => handleConfirmOrder(order.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all btn-tactile shadow-2xs disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PackageCheck className="w-3.5 h-3.5" />
                        )}
                        <span>Tasdiqlash & Ombor kamaytirish</span>
                      </button>
                    )}

                    {/* Confirmed actions */}
                    {order.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleDeliverOrder(order.id)}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all btn-tactile shadow-2xs disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Yetkazildi</span>
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all btn-tactile disabled:opacity-50"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Bekor qilish & Qaytarish</span>
                        </button>
                      </>
                    )}

                    {/* Cancelled state */}
                    {order.status === 'cancelled' && (
                      <span className="text-xs text-[#52796F] italic">
                        Ombor qoldig'i tiklangan
                      </span>
                    )}

                    {/* Delete button (Safe: rejected if stock is deducted) */}
                    <button
                      onClick={() => handleDeleteOrder(order)}
                      disabled={isProcessing}
                      title="O'chirish"
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Create Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div
            className="bg-white rounded-2xl border border-[#E0ECE8] shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden"
            style={{ maxHeight: 'calc(100dvh - 32px)' }}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E0ECE8] bg-[#F6F8F7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#112521] text-[#F5B85C] flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#112521]">Yangi buyurtma yaratish</h3>
                  <p className="text-[11px] text-[#173B35]">Mijoz va tovarlarni tanlang</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Scrollable Content */}
            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {formErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  {formErrors.map((err, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 1. Customer Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#112521]">
                  1. Mijozni tanlang (CRM)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#112521] focus:outline-hidden focus:border-[#F5B85C]"
                >
                  <option value="">-- Mavjud mijozlardan birini tanlang --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                  <option value="new">+ Yangi mijoz kiritish (bir martalik)</option>
                </select>

                {(selectedCustomerId === 'new' || (!selectedCustomerId && customers.length === 0)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Mijoz to'liq ismi *"
                        value={customCustomerName}
                        onChange={(e) => setCustomCustomerName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E0ECE8] rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        placeholder="Telefon raqami (masalan: +998901234567)"
                        value={customCustomerPhone}
                        onChange={(e) => setCustomCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E0ECE8] rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Product selection & items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#112521]">
                    2. Mahsulotlar (Ombor bilan integratsiya)
                  </label>
                  <span className="text-[11px] text-[#52796F]">
                    {products.length} ta tovar mavjud
                  </span>
                </div>

                {/* Add product dropdown */}
                <div className="flex gap-2">
                  <select
                    value={selectedProductIdToAdd}
                    onChange={(e) => handleAddProductToDraft(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#112521] focus:outline-hidden focus:border-[#F5B85C]"
                  >
                    <option value="">+ Mahsulot qo'shish uchun tanlang</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Qoldiq: {p.quantity} {p.unit} | Narx: {p.sellingPrice.toLocaleString()} so'm
                      </option>
                    ))}
                  </select>
                </div>

                {/* Added items list */}
                {orderItems.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-[#E0ECE8] rounded-xl text-center text-xs text-[#52796F]">
                    Yuqoridagi ro'yxatdan buyurtmaga kamida 1 ta mahsulot tanlang
                  </div>
                ) : (
                  <div className="space-y-2 border border-[#E0ECE8] rounded-xl p-3 bg-[#F6F8F7]">
                    {orderItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-lg border border-[#E0ECE8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[#112521] truncate">{item.productName}</div>
                          <div className="text-[10px] text-[#52796F]">
                            Ombordagi qoldiq: <span className="font-semibold">{item.stockAvailable}</span> {item.unit} · Tannarx: {item.unitCost.toLocaleString()} so'm
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Quantity */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[#52796F]">Soni:</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  setOrderItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, quantity: 0 } : it))
                                  );
                                } else {
                                  const parsed = parseFloat(val);
                                  if (!isNaN(parsed) && parsed >= 0) {
                                    setOrderItems((prev) =>
                                      prev.map((it, i) => (i === idx ? { ...it, quantity: parsed } : it))
                                    );
                                  }
                                }
                              }}
                              onBlur={() => {
                                if (!item.quantity || item.quantity < 1) {
                                  setOrderItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, quantity: 1 } : it))
                                  );
                                }
                              }}
                              className="w-16 px-2 py-1 bg-[#F6F8F7] border border-[#E0ECE8] rounded-lg text-center font-bold"
                            />
                            <span className="text-[10px] text-[#52796F]">{item.unit}</span>
                          </div>

                          {/* Unit selling price */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[#52796F]">Narx:</span>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItemPrice(idx, parseInt(e.target.value) || 0)}
                              className="w-24 px-2 py-1 bg-[#F6F8F7] border border-[#E0ECE8] rounded-lg text-right font-bold"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, 0)}
                            className="p-1 text-gray-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Live Financial Summary */}
              {orderItems.length > 0 && (
                <div className="bg-[#F6F8F7] p-4 rounded-xl border border-[#F5B85C]/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#52796F]">Jami sotuv qiymati:</span>
                    <span className="text-base font-extrabold text-[#112521]">
                      {formatPrice(newOrderCalculations.totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#52796F]">Jami tovarlar tannarxi:</span>
                    <span className="font-semibold text-[#173B35]">
                      {formatPrice(newOrderCalculations.totalCost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#E0ECE8]">
                    <span className="font-bold text-emerald-800">Kutilayotgan sof foyda:</span>
                    <span className="text-base font-bold text-emerald-700">
                      {formatPrice(newOrderCalculations.totalProfit)}
                    </span>
                  </div>
                </div>
              )}

              {/* 4. Payment status & options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#112521] mb-1">
                    To'lov holati
                  </label>
                  <select
                    value={orderPaymentStatus}
                    onChange={(e) => setOrderPaymentStatus(e.target.value as OrderPaymentStatus)}
                    className="w-full px-3 py-2 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#112521] focus:outline-hidden"
                  >
                    <option value="unpaid">To'lanmagan</option>
                    <option value="partially_paid">Qisman to'langan</option>
                    <option value="paid">To'langan</option>
                  </select>

                  {orderPaymentStatus === 'partially_paid' && (
                    <div className="mt-2.5 space-y-1">
                      <label className="block text-[11px] font-bold text-[#52796F]">
                        To'langan qisman summa (so'm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={newOrderCalculations.totalAmount}
                        value={orderPartialPaidAmount || ''}
                        onChange={(e) => setOrderPartialPaidAmount(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="Masalan: 300000"
                        className="w-full px-3 py-1.5 bg-white border border-[#F5B85C] rounded-lg text-xs font-bold text-[#112521]"
                      />
                      <span className="text-[10px] text-[#52796F] block">
                        Qolgan qarz: {formatPrice(Math.max(0, newOrderCalculations.totalAmount - orderPartialPaidAmount))}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#112521] mb-1">
                    Izoh (ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    placeholder="Yetkazish manzili yoki alohida talablar..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#112521] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 5. Auto Confirm Checkbox */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="autoConfirm"
                  checked={autoConfirmOnCreate}
                  onChange={(e) => setAutoConfirmOnCreate(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoConfirm" className="text-xs text-blue-900 cursor-pointer">
                  <span className="font-bold block">Darhol tasdiqlash va ombordagi qoldiqni yechish</span>
                  <span className="text-[11px] text-blue-700">
                    Belgilansa, mahsulotlar ombori qoldig'i avtomatik ravishda kamaytiriladi. Yetarli qoldiq bo'lmasa, xatolik beriladi.
                  </span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-[#E0ECE8] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#52796F] hover:bg-[#F6F8F7] rounded-xl border border-[#E0ECE8] transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder || orderItems.length === 0}
                  className="px-5 py-2 text-xs font-bold text-[#112521] bg-[#F5B85C] hover:bg-[#E5A749] border border-[#F5B85C]/50 rounded-xl transition-all btn-tactile shadow-2xs disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingOrder ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{autoConfirmOnCreate ? "Tasdiqlab saqlash" : "Qoralama sifatida saqlash"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Sale (POS) Modal */}
      <QuickSaleModal
        isOpen={isQuickSaleOpen}
        onClose={() => setIsQuickSaleOpen(false)}
        products={products}
        customers={customers}
        userId={user?.uid || ''}
        onSaleCompleted={() => {
          loadData();
          setFeedbackMessage({
            type: 'success',
            text: "Tezkor sotuv muvaffaqiyatli amalga oshirildi va ombor qoldig'i yangilandi!",
          });
        }}
      />

      {/* Module Help Guide */}
      <ModuleHelpGuide
        moduleKey="orders"
        moduleTitle="Savdo Buyurtmalari"
        steps={ordersHelpSteps}
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
};
