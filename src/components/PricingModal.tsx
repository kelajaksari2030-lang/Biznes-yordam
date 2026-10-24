import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, Sparkles, Clock, Info } from 'lucide-react';
import { PLANS } from '../config/plans';
import { useAuth } from '../context/AuthContext';
import { initiateClickPayment } from '../services/payment';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { currentPlan, user } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorPlan, setErrorPlan] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const interval = setInterval(async () => {
      try {
        const token = await user?.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/payment/click/status/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          if (data.status === 'paid') {
            setPaymentStatus('To\'lov muvaffaqiyatli amalga oshirildi!');
            setOrderId(null);
          } else if (data.status === 'cancelled') {
            setPaymentStatus('To\'lov bekor qilindi.');
            setOrderId(null);
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [orderId, user]);

  const handlePayment = async (plan: 'pro' | 'ultra') => {
    if (!user) {
      setErrorPlan('To\'lov qilish uchun tizimga kirishingiz kerak.');
      return;
    }
    setLoadingPlan(plan);
    setErrorPlan(null);
    try {
      const token = await user.getIdToken();
      const { paymentUrl, orderId } = await initiateClickPayment(plan, token);
      setOrderId(orderId);
      setPaymentStatus('To\'lov tizimiga yo\'naltirilmoqda...');
      window.location.href = paymentUrl;
    } catch (err: any) {
      setErrorPlan(err.message || 'To\'lovni boshlashda xatolik yuz berdi.');
      setLoadingPlan(null);
    }
  };

  // Prevent background body scroll chaining while modal is active
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#251A14]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden overscroll-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full shadow-modal border border-[#E6DCD1] flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {paymentStatus && (
           <div className="p-4 bg-green-50 text-green-800 text-center font-bold">
             {paymentStatus}
           </div>
        )}
        {/* Sticky/Fixed Header - Always stays at top, X close button always accessible */}
        <div className="shrink-0 px-6 sm:px-8 pt-6 pb-4 border-b border-[#EFE8DE] flex items-start justify-between gap-4 bg-white z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#795640]">
              <Sparkles className="w-3.5 h-3.5 text-[#D0AE70]" />
              <span>Tarif rejalari va imkoniyatlar</span>
            </div>
            <h3 id="pricing-modal-title" className="text-xl font-bold text-[#493329] mt-1">
              BiznesYordam obuna shartlari
            </h3>
            <p className="text-xs text-[#6B5549] mt-0.5">
              Biznesingiz hajmiga mos tarifni tanlang. Hozirda barcha tizimga kirgan foydalanuvchilar Bepul tarifda xizmat ko'radilar.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="text-[#8D786D] hover:text-[#493329] p-2 rounded-xl hover:bg-[#FAF6F0] transition-colors btn-tactile shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Container - Primary scroll target supporting bidirectional touch gestures */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-6 touch-pan-y"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
          }}
        >
          {/* Notice on payments & authoritative security */}
          <div className="p-3.5 bg-[#FAF6F0] border border-[#E6DCD1] rounded-2xl text-xs text-[#6B5549] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#D0AE70] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>To'lov tizimi haqida ma'lumot:</strong> Pro va Ultra tariflari uchun onlayn to'lov (Click va boshqa milliy to'lov tizimlari) keyingi bosqichda ulanadi. Tizim xavfsizlik qoidalariga rioya qiladi va brauzer orqali soxta to'lovlarni simulyatsiya qilmaydi.
            </div>
          </div>

          {/* 3 Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Free Plan */}
            <div className="bg-white border-2 border-[#D0AE70] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4 relative">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#795640]">
                    {PLANS.free.name}
                  </span>
                  <span className="text-[10px] font-bold text-[#34221A] bg-[#D0AE70] px-2 py-0.5 rounded-full">
                    Faol tarif
                  </span>
                </div>

                <div>
                  <div className="text-2xl font-extrabold text-[#493329] font-mono">
                    {PLANS.free.priceLabel}
                  </div>
                  <p className="text-[11px] text-[#8D786D] mt-1">
                    {PLANS.free.description}
                  </p>
                </div>

                {/* Limits highlight */}
                <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#EFE8DE] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B5549]">Kunlik reklama matnlari:</span>
                    <strong className="text-[#493329] font-mono">{PLANS.free.dailyAdLimit} ta</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B5549]">Shaxsiy shablonlar:</span>
                    <strong className="text-[#493329] font-mono">{PLANS.free.customTemplateLimit} ta</strong>
                  </div>
                </div>

                {/* Feature list */}
                <div className="space-y-2 pt-2 border-t border-[#EFE8DE] text-xs text-[#6B5549]">
                  {PLANS.free.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D0AE70] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                disabled
                className="w-full py-2.5 px-4 text-xs font-semibold text-[#493329] bg-[#F6EFE3] border border-[#E8D6B7] rounded-xl opacity-90 cursor-default"
              >
                Hozirgi faol tarifingiz
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-white border border-[#E6DCD1] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#795640]">
                    {PLANS.pro.name}
                  </span>
                  <span className="text-[10px] font-semibold text-[#795640] bg-[#FAF6F0] px-2 py-0.5 rounded-full border border-[#E6DCD1]">
                    Tez kunda
                  </span>
                </div>

                <div>
                  <div className="text-2xl font-extrabold text-[#493329] font-mono">
                    {PLANS.pro.priceLabel}
                  </div>
                  <p className="text-[11px] text-[#8D786D] mt-1">
                    {PLANS.pro.description}
                  </p>
                </div>

                {/* Limits highlight */}
                <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#EFE8DE] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B5549]">Kunlik reklama matnlari:</span>
                    <strong className="text-[#795640] font-mono">{PLANS.pro.dailyAdLimit} ta</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B5549]">Shaxsiy shablonlar:</span>
                    <strong className="text-[#795640] font-mono">{PLANS.pro.customTemplateLimit} ta</strong>
                  </div>
                </div>

                {/* Feature list */}
                <div className="space-y-2 pt-2 border-t border-[#EFE8DE] text-xs text-[#6B5549]">
                  {PLANS.pro.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#795640] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handlePayment('pro')}
                disabled={loadingPlan === 'pro'}
                className="w-full py-3 px-4 bg-[#D0AE70] hover:bg-[#B8985D] text-white rounded-xl font-bold transition-colors btn-tactile disabled:opacity-50"
              >
                {loadingPlan === 'pro' ? 'Kutilmoqda...' : 'Click orqali to\'lash'}
              </button>
              {errorPlan === 'pro' && <p className="text-xs text-red-600 mt-2">{errorPlan}</p>}
            </div>

            {/* Ultra Plan */}
            <div className="bg-white border border-[#E6DCD1] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#795640]">
                    {PLANS.ultra.name}
                  </span>
                  <span className="text-[10px] font-semibold text-[#795640] bg-[#FAF6F0] px-2 py-0.5 rounded-full border border-[#E6DCD1]">
                    Tez kunda
                  </span>
                </div>

                <div>
                  <div className="text-2xl font-extrabold text-[#493329] font-mono">
                    {PLANS.ultra.priceLabel}
                  </div>
                  <p className="text-[11px] text-[#8D786D] mt-1">
                    {PLANS.ultra.description}
                  </p>
                </div>

                {/* Limits highlight */}
                <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#EFE8DE] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B5549]">Kunlik reklama matnlari:</span>
                    <strong className="text-[#795640] font-mono">{PLANS.ultra.dailyAdLimit} ta</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B5549]">Shaxsiy shablonlar:</span>
                    <strong className="text-[#795640] font-mono">{PLANS.ultra.customTemplateLimit}+ ta</strong>
                  </div>
                </div>

                {/* Feature list */}
                <div className="space-y-2 pt-2 border-t border-[#EFE8DE] text-xs text-[#6B5549]">
                  {PLANS.ultra.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#795640] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handlePayment('ultra')}
                disabled={loadingPlan === 'ultra'}
                className="w-full py-3 px-4 bg-[#493329] hover:bg-[#3B2A22] text-white rounded-xl font-bold transition-colors btn-tactile disabled:opacity-50"
              >
                {loadingPlan === 'ultra' ? 'Kutilmoqda...' : 'Click orqali to\'lash'}
              </button>
              {errorPlan === 'ultra' && <p className="text-xs text-red-600 mt-2">{errorPlan}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
