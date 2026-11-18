import React, { useState, useEffect, useRef, useId } from 'react';
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Barcode,
  ShoppingBag,
  CreditCard,
  Banknote,
  Clock,
  Printer,
  Loader2,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Product } from '../types/inventory';
import { Customer } from '../types/crm';
import { Order, OrderPaymentStatus } from '../types/business';
import { createOrder, CreateOrderInput } from '../services/orderService';
import { formatUzbekSom } from '../utils/numberFormat';

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  userId: string;
  onSaleCompleted: (order: Order) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  isOpen,
  onClose,
  products,
  customers,
  userId,
  onSaleCompleted,
}) => {
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputId = useId();

  // Search & Scanner state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer state
  const [isAdhocCustomer, setIsAdhocCustomer] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Oddiy xaridor (Naqd savdo)');
  const [customerPhone, setCustomerPhone] = useState('');

  // Payment state
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'debt' | 'partial'>('cash');
  const [partialAmount, setPartialAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Submission & Receipt state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Focus barcode input whenever modal opens
  useEffect(() => {
    if (isOpen && !completedOrder) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, completedOrder]);

  if (!isOpen) return null;

  // Add product to cart helper
  const addProductToCart = (prod: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === prod.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product: prod,
          quantity: 1,
          unitPrice: Number(prod.sellingPrice) || 0,
          unitCost: Number(prod.purchasePrice) || 0,
        },
      ];
    });

    setFeedback({
      type: 'success',
      text: `"${prod.name}" savatga qo'shildi`,
    });
    setTimeout(() => setFeedback(null), 2500);
  };

  // Barcode / Enter keypress handler
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeInput.trim().toLowerCase();
      if (!code) return;

      // 1. Try exact SKU match
      let matched = products.find((p) => p.sku && p.sku.toLowerCase() === code);

      // 2. Try product name partial match if SKU not found
      if (!matched) {
        matched = products.find((p) => p.name.toLowerCase().includes(code));
      }

      if (matched) {
        addProductToCart(matched);
        setBarcodeInput('');
      } else {
        setFeedback({
          type: 'error',
          text: `"${barcodeInput}" bo'yicha hech qanday tovar topilmadi`,
        });
        setTimeout(() => setFeedback(null), 3000);
      }
    }
  };

  // Cart quantity controls
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Calculations
  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalCost = cart.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const totalProfit = totalAmount - totalCost;

  // Validation: check stock availability
  const stockErrors: string[] = [];
  cart.forEach((item) => {
    // If product has no recipe, check finished product quantity
    if (!item.product.recipe || item.product.recipe.length === 0) {
      if (item.quantity > Number(item.product.quantity)) {
        stockErrors.push(
          `"${item.product.name}": Omborda yetarli emas (Mavjud: ${item.product.quantity} ${item.product.unit}, so'ralgan: ${item.quantity})`
        );
      }
    }
  });

  // Handle final checkout
  const handleFinalizeSale = async () => {
    if (cart.length === 0 || !userId) return;
    if (stockErrors.length > 0) {
      setFeedback({ type: 'error', text: stockErrors[0] });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    let customerId = selectedCustomerId;
    let finalCustomerName = customerName;
    let finalCustomerPhone = customerPhone;

    if (!isAdhocCustomer && selectedCustomerId) {
      const c = customers.find((cust) => cust.id === selectedCustomerId);
      if (c) {
        finalCustomerName = c.name;
        finalCustomerPhone = c.phone || '';
      }
    } else {
      customerId = `cust_pos_${Date.now()}`;
    }

    let paymentStatus: OrderPaymentStatus = 'paid';
    let paidAmount = totalAmount;

    if (paymentType === 'debt') {
      paymentStatus = 'unpaid';
      paidAmount = 0;
    } else if (paymentType === 'partial') {
      paymentStatus = 'partially_paid';
      paidAmount = Number(partialAmount) || 0;
    }

    // Generate unique idempotency key to prevent duplicate sale submissions
    const idempotencyKey = `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const orderInput: CreateOrderInput = {
      customerId,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      idempotencyKey,
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        unit: item.product.unit,
        recipeSnapshot: item.product.recipe,
      })),
      paymentStatus,
      paidAmount,
      notes: `${paymentType === 'card' ? '[Plastik karta] ' : ''}${notes}`.trim(),
    };

    try {
      const created = await createOrder(userId, orderInput, { autoConfirm: true });
      setCompletedOrder(created);
      onSaleCompleted(created);
      setCart([]);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || "Sotuvni yakunlashda xatolik yuz berdi",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for next sale
  const handleStartNewSale = () => {
    setCompletedOrder(null);
    setCart([]);
    setBarcodeInput('');
    setCatalogSearch('');
    setFeedback(null);
    setNotes('');
    setPaymentType('cash');
    setPartialAmount('');
  };

  // Filtered catalog list for quick-add buttons
  const filteredCatalog = products.filter((p) => {
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-[#112521]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden overscroll-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="presentation"
    >
      <div
        className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-modal border border-[#E0ECE8] flex flex-col max-h-[calc(100vh-20px)] max-h-[calc(100dvh-20px)] my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Receipt View on Completion */}
        {completedOrder ? (
          <div className="flex-1 overflow-y-auto space-y-6 p-2 sm:p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#D7F0E5] text-[#173B35] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider">
                Sotuv Muvaffaqiyatli Bajarildi
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#112521]">
                {formatUzbekSom(completedOrder.totalAmount)}
              </h2>
              <p className="text-xs text-[#2A5C52]">
                Chek №: <strong>{completedOrder.orderNumber}</strong> · Ombor qoldig'i avtomatik kamaytirildi
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="max-w-md mx-auto bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl p-4 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#E0ECE8] pb-2">
                <span className="text-[#2A5C52]">Mijoz:</span>
                <span className="font-bold text-[#112521]">{completedOrder.customerName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E0ECE8] pb-2">
                <span className="text-[#2A5C52]">To'lov holati:</span>
                <span className="font-bold text-emerald-700">
                  {completedOrder.paymentStatus === 'paid' ? "✓ To'liq to'landi" : "Nasiya / Qisman"}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-[#112521] block">Sotilgan tovarlar:</span>
                {completedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="text-[#112521] truncate max-w-[240px]">
                      {it.quantity} {it.unit || 'dona'} × {it.productName}
                    </span>
                    <strong className="font-mono text-[#173B35]">
                      {formatUzbekSom(it.totalPrice)}
                    </strong>
                  </div>
                ))}
              </div>

              {/* Deducted raw materials notice if recipe was used */}
              {completedOrder.deductedStockItems &&
                completedOrder.deductedStockItems.some((d) => d.isIngredient) && (
                  <div className="pt-2 border-t border-[#E0ECE8] text-[10px] text-[#2A5C52]">
                    💡 Retsept bo'yicha sarflangan xomashyolar ombordan yechildi.
                  </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-white border border-[#E0ECE8] hover:bg-[#F6F8F7] text-[#173B35] rounded-xl text-xs font-bold flex items-center gap-2 btn-tactile"
              >
                <Printer className="w-4 h-4" />
                <span>Chekni chop etish</span>
              </button>
              <button
                type="button"
                onClick={handleStartNewSale}
                className="px-6 py-2.5 bg-[#173B35] hover:bg-[#112521] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm btn-tactile cursor-pointer"
              >
                <span>Yangi sotuv boshlash</span>
                <ArrowRight className="w-4 h-4 text-[#F5B85C]" />
              </button>
            </div>
          </div>
        ) : (
          /* Normal POS Checkout Flow */
          <>
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-[#E0ECE8] pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#173B35] text-[#F5B85C] flex items-center justify-center font-bold shadow-xs">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-[#112521]">
                      Tezkor Savdo & Kassa (POS)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D7F0E5] text-[#173B35] border border-[#23584F]/20">
                      Skaner faol
                    </span>
                  </div>
                  <p className="text-xs text-[#2A5C52]">
                    Shtrix-kod skaneri yoki nom bo'yicha tovarlarni savatga tezkor qo'shish
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-[#2A5C52] hover:text-[#112521] p-1.5 rounded-lg transition-colors"
                aria-label="Yopish"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barcode Scanner Input Bar */}
            <div className="shrink-0 pb-3">
              <div className="relative">
                <Barcode className="w-5 h-5 text-[#173B35] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={barcodeInputRef}
                  id={barcodeInputId}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="Shtrix-kodni skanerlang yoki tovar nomini yozib [Enter] bosing..."
                  className="w-full pl-11 pr-24 py-2.5 rounded-2xl border-2 border-[#173B35]/40 focus:border-[#173B35] outline-none text-sm text-[#112521] bg-[#F6F8F7] shadow-inner font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (barcodeInput.trim()) {
                      const code = barcodeInput.trim().toLowerCase();
                      const matched =
                        products.find((p) => p.sku && p.sku.toLowerCase() === code) ||
                        products.find((p) => p.name.toLowerCase().includes(code));
                      if (matched) {
                        addProductToCart(matched);
                        setBarcodeInput('');
                      }
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#173B35] text-white text-xs font-bold rounded-xl btn-tactile"
                >
                  Qo'shish
                </button>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-fadeIn ${
                    feedback.type === 'success'
                      ? 'bg-[#D7F0E5] text-[#173B35] border border-[#23584F]/20'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}
            </div>

            {/* Split View: Left (Catalog) + Right (Cart & Checkout) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden min-h-0">
              {/* Left Column: Quick Product Catalog (lg:col-span-7) */}
              <div className="lg:col-span-7 flex flex-col border border-[#E0ECE8] rounded-2xl overflow-hidden bg-[#F6F8F7]/40">
                {/* Search in catalog */}
                <div className="p-3 bg-white border-b border-[#E0ECE8] flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#2A5C52] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Tovarlarni filtrlash..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E0ECE8] text-xs outline-none bg-[#F6F8F7]"
                    />
                  </div>
                  <span className="text-[11px] text-[#2A5C52] whitespace-nowrap">
                    {filteredCatalog.length} ta tovar
                  </span>
                </div>

                {/* Catalog Grid */}
                <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 content-start">
                  {filteredCatalog.map((prod) => {
                    const isLow = Number(prod.quantity) <= Number(prod.minStockAlert);
                    const hasRecipe = prod.recipe && prod.recipe.length > 0;

                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => addProductToCart(prod)}
                        className="p-3 bg-white hover:bg-[#D7F0E5]/30 border border-[#E0ECE8] hover:border-[#173B35] rounded-xl text-left transition-all btn-tactile shadow-2xs flex flex-col justify-between group min-h-[96px] cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono text-[#2A5C52] truncate">
                              {prod.sku || 'SKU yo‘q'}
                            </span>
                            {hasRecipe ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                Retseptli
                              </span>
                            ) : isLow ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                {prod.quantity} {prod.unit}
                              </span>
                            ) : (
                              <span className="text-[9px] text-[#2A5C52]">
                                {prod.quantity} {prod.unit}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-[#112521] line-clamp-2 mt-1 leading-snug group-hover:text-[#173B35]">
                            {prod.name}
                          </span>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <strong className="text-xs font-mono font-bold text-[#173B35]">
                            {formatUzbekSom(prod.sellingPrice)}
                          </strong>
                          <span className="w-5 h-5 rounded-lg bg-[#D7F0E5] text-[#173B35] flex items-center justify-center text-xs font-bold group-hover:bg-[#173B35] group-hover:text-white transition-colors">
                            +
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Live Cart & Fast Checkout (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col bg-white border border-[#E0ECE8] rounded-2xl overflow-hidden shadow-sm">
                {/* Cart Header */}
                <div className="p-3 border-b border-[#E0ECE8] bg-[#F6F8F7] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#173B35]" />
                    <span className="text-xs font-bold text-[#112521]">
                      Savat ({cart.length} xil tovar)
                    </span>
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-[11px] text-rose-600 hover:underline"
                    >
                      Tozalash
                    </button>
                  )}
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[140px]">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#2A5C52]">
                      <ShoppingBag className="w-8 h-8 text-[#2A5C52]/40 mb-2" />
                      <span className="text-xs font-medium">Savat hali bo'sh</span>
                      <span className="text-[10px] text-[#2A5C52]/70 mt-0.5">
                        Skanerlang yoki chap paneldagi tovarlarni bosing
                      </span>
                    </div>
                  ) : (
                    cart.map((item) => {
                      const itemTotal = item.quantity * item.unitPrice;
                      const isStockExceeded =
                        (!item.product.recipe || item.product.recipe.length === 0) &&
                        item.quantity > Number(item.product.quantity);

                      return (
                        <div
                          key={item.product.id}
                          className={`p-2.5 rounded-xl border text-xs transition-colors ${
                            isStockExceeded
                              ? 'bg-rose-50/70 border-rose-300'
                              : 'bg-white border-[#E0ECE8]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-[#112521] block truncate">
                                {item.product.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-[#2A5C52] mt-0.5">
                                <span>{formatUzbekSom(item.unitPrice)}</span>
                                <span>·</span>
                                <span>Qoldiq: {item.product.quantity} {item.product.unit}</span>
                              </div>
                            </div>
                            <strong className="font-mono text-xs text-[#173B35]">
                              {formatUzbekSom(itemTotal)}
                            </strong>
                          </div>

                          {/* Stepper & Remove */}
                          <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#E0ECE8]/60">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] flex items-center justify-center font-bold text-sm text-[#173B35] btn-tactile"
                                aria-label="Kamaytirish"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="1"
                                value={item.quantity || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '') {
                                    setCart((prev) =>
                                      prev.map((it) =>
                                        it.product.id === item.product.id ? { ...it, quantity: 0 } : it
                                      )
                                    );
                                  } else {
                                    const parsed = parseFloat(val);
                                    if (!isNaN(parsed) && parsed >= 0) {
                                      setCart((prev) =>
                                        prev.map((it) =>
                                          it.product.id === item.product.id ? { ...it, quantity: parsed } : it
                                        )
                                      );
                                    }
                                  }
                                }}
                                onBlur={() => {
                                  if (!item.quantity || item.quantity < 1) {
                                    updateQuantity(item.product.id, 1);
                                  }
                                }}
                                className="w-14 text-center font-mono font-bold text-xs py-1.5 border border-[#E0ECE8] rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] flex items-center justify-center font-bold text-sm text-[#173B35] btn-tactile"
                                aria-label="Ko'paytirish"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="p-1 text-rose-500 hover:text-rose-700"
                              title="O'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {isStockExceeded && (
                            <span className="text-[10px] font-bold text-rose-600 block mt-1">
                              ⚠️ Ombordagi qoldiqdan oshib ketdi!
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Checkout Panel */}
                <div className="p-3 border-t border-[#E0ECE8] bg-[#F6F8F7] space-y-3 shrink-0">
                  {/* Customer selection toggle */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#2A5C52] font-semibold">Xaridor:</span>
                      <button
                        type="button"
                        onClick={() => setIsAdhocCustomer((prev) => !prev)}
                        className="text-[#173B35] font-bold hover:underline"
                      >
                        {isAdhocCustomer ? "CRM mijozini tanlash" : "Oddiy xaridor"}
                      </button>
                    </div>

                    {isAdhocCustomer ? (
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Xaridor nomi / do'kon"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[#E0ECE8] bg-white text-xs text-[#112521] outline-none"
                      />
                    ) : (
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[#E0ECE8] bg-white text-xs text-[#112521] outline-none"
                      >
                        <option value="">CRM mijozini tanlang...</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.phone ? `(${c.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Payment Type */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#2A5C52] font-semibold block">To'lov turi:</span>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setPaymentType('cash')}
                        className={`p-1.5 rounded-xl border font-bold flex items-center justify-center gap-1 transition-all ${
                          paymentType === 'cash'
                            ? 'bg-[#173B35] text-white border-[#173B35]'
                            : 'bg-white border-[#E0ECE8] text-[#173B35]'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Naqd</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('card')}
                        className={`p-1.5 rounded-xl border font-bold flex items-center justify-center gap-1 transition-all ${
                          paymentType === 'card'
                            ? 'bg-[#173B35] text-white border-[#173B35]'
                            : 'bg-white border-[#E0ECE8] text-[#173B35]'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Karta</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('debt')}
                        className={`p-1.5 rounded-xl border font-bold flex items-center justify-center gap-1 transition-all ${
                          paymentType === 'debt'
                            ? 'bg-rose-700 text-white border-rose-700'
                            : 'bg-white border-[#E0ECE8] text-rose-700'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Nasiya</span>
                      </button>
                    </div>
                  </div>

                  {/* Totals & Submit */}
                  <div className="pt-2 border-t border-[#E0ECE8] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#2A5C52]">Jami summa:</span>
                      <strong className="text-base font-extrabold font-mono text-[#112521]">
                        {formatUzbekSom(totalAmount)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={handleFinalizeSale}
                      disabled={isSubmitting || cart.length === 0 || stockErrors.length > 0}
                      className="w-full min-h-[44px] py-3 rounded-2xl bg-[#173B35] hover:bg-[#112521] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-tactile cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#F5B85C]" />
                          <span>Sotuv amalga oshirilmoqda...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#F5B85C]" />
                          <span>Sotuvni yakunlash (Chek)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
