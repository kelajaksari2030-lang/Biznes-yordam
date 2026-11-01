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
      const token = await user.getIdToken(true);
      const { paymentUrl, orderId } = await initiateClickPayment(plan, token, user);
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
        className="bg-white rounded-3xl max-w-3xl w-full shadow-modal border border-[#E0ECE8] flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden"
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
        <div className="shrink-0 px-6 sm:px-8 pt-6 pb-4 border-b border-[#E0ECE8] flex items-start justify-between gap-4 bg-white z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#52796F]">
              <Sparkles className="w-3.5 h-3.5 text-[#F5B85C]" />
              <span>Tarif rejalari va imkoniyatlar</span>
            </div>
            <h3 id="pricing-modal-title" className="text-xl font-bold text-[#173B35] mt-1">
              BESTO obuna shartlari
            </h3>
            <p className="text-xs text-[#52796F] mt-0.5">
              Biznesingiz hajmiga mos tarifni tanlang. Hozirda barcha tizimga kirgan foydalanuvchilar Bepul tarifda xizmat ko'radilar.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="text-[#52796F] hover:text-[#112521] p-2 rounded-xl hover:bg-[#F6F8F7] transition-colors btn-tactile shrink-0 cursor-pointer"
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
          <div className="p-3.5 bg-[#F6F8F7] border border-[#D7F0E5] rounded-2xl text-xs text-[#173B35] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#173B35] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>To'lov va xavfsizlik:</strong> Pro va Ultra tariflariga o'tish Click xavfsiz to'lov shlyuzi orqali amalga oshiriladi. To'lov tasdiqlangach, tarifingiz va kvotalaringiz avtomatik ravishda darhol faollashadi.
            </div>
          </div>

          {/* 3 Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Free Plan */}
            <div className="bg-white border-2 border-[#D7F0E5] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4 relative">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#173B35]">
                    {PLANS.free.name}
                  </span>
                  <span className="text-[10px] font-bold text-[#173B35] bg-[#D7F0E5] px-2 py-0.5 rounded-full">
                    Faol tarif
                  </span>
                </div>

                <div>
                  <div className="text-2xl font-extrabold text-[#173B35] font-mono">
                    {PLANS.free.priceLabel}
                  </div>
                  <p className="text-[11px] text-[#173B35]/70 mt-1">
                    {PLANS.free.description}
                  </p>
                </div>

                {/* Limits highlight */}
                <div className="p-3 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#173B35]/80">Kunlik reklama matnlari:</span>
                    <strong className="text-[#173B35] font-mono">{PLANS.free.dailyAdLimit} ta</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#173B35]/80">Shaxsiy shablonlar:</span>
                    <strong className="text-[#173B35] font-mono">{PLANS.free.customTemplateLimit} ta</strong>
                  </div>
                </div>

                {/* Feature list */}
                <div className="space-y-2 pt-2 border-t border-[#E0ECE8] text-xs text-[#173B35]/80">
                  {PLANS.free.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#173B35] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                disabled
                className="w-full py-2.5 px-4 text-xs font-bold text-[#173B35]/70 bg-[#F6F8F7] border border-[#D7F0E5] rounded-xl opacity-90 cursor-default"
              >
                Hozirgi faol tarifingiz
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-white border-2 border-[#F5B85C] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4 relative">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#173B35]">
                    {PLANS.pro.name}
                  </span>
                  <span className="text-[10px] font-bold text-[#173B35] bg-[#F5B85C]/30 border border-[#F5B85C] px-2 py-0.5 rounded-full">
                    {PLANS.pro.badge}
                  </span>
                </div>

                <div>
                  <div className="text-2xl font-extrabold text-[#173B35] font-mono">
                    {PLANS.pro.priceLabel}
                  </div>
                  <p className="text-[11px] text-[#173B35]/70 mt-1">
                    {PLANS.pro.description}
                  </p>
                </div>

                {/* Limits highlight */}
                <div className="p-3 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#173B35]/80">Kunlik reklama matnlari:</span>
                    <strong className="text-[#173B35] font-mono">{PLANS.pro.dailyAdLimit} ta</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#173B35]/80">Shaxsiy shablonlar:</span>
                    <strong className="text-[#173B35] font-mono">{PLANS.pro.customTemplateLimit} ta</strong>
                  </div>
                </div>

                {/* Feature list */}
                <div className="space-y-2 pt-2 border-t border-[#E0ECE8] text-xs text-[#173B35]/80">
                  {PLANS.pro.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#173B35] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={() => handlePayment('pro')}
                  disabled={loadingPlan === 'pro'}
                  className="w-full py-3 px-4 bg-[#173B35] hover:bg-[#112521] text-white rounded-xl font-bold transition-all btn-tactile disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {loadingPlan === 'pro' ? 'Kutilmoqda...' : 'Click orqali to\'lash'}
                </button>
                {errorPlan === 'pro' && <p className="text-xs text-red-600 mt-2 text-center">{errorPlan}</p>}
              </div>
            </div>

            {/* Ultra Plan */}
            <div className="bg-[#173B35] text-white rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4 relative border border-[#112521]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#D7F0E5]">
                    {PLANS.ultra.name}
                  </span>
                  <span className="text-[10px] font-bold text-[#173B35] bg-[#F5B85C] px-2 py-0.5 rounded-full shadow-xs">
                    {PLANS.ultra.badge}
                  </span>
                </div>

                <div>
                  <div className="text-2xl font-extrabold text-[#F5B85C] font-mono">
                    {PLANS.ultra.priceLabel}
                  </div>
                  <p className="text-[11px] text-[#D7F0E5]/80 mt-1">
                    {PLANS.ultra.description}
                  </p>
                </div>

                {/* Limits highlight */}
                <div className="p-3 bg-[#112521] rounded-xl border border-white/10 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#D7F0E5]/80">Kunlik reklama matnlari:</span>
                    <strong className="text-[#F5B85C] font-mono">{PLANS.ultra.dailyAdLimit} ta</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#D7F0E5]/80">Shaxsiy shablonlar:</span>
                    <strong className="text-[#F5B85C] font-mono">{PLANS.ultra.customTemplateLimit}+ ta</strong>
                  </div>
                </div>

                {/* Feature list */}
                <div className="space-y-2 pt-2 border-t border-white/15 text-xs text-[#D7F0E5]">
                  {PLANS.ultra.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#F5B85C] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-2 pt-1 font-bold text-[#F5B85C]">
                    <Sparkles className="w-3.5 h-3.5 text-[#F5B85C] shrink-0 mt-0.5" />
                    <span>Aqlli biznes prognozi (Ultra eksklyuziv)</span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => handlePayment('ultra')}
                  disabled={loadingPlan === 'ultra'}
                  className="w-full py-3 px-4 bg-[#F5B85C] hover:bg-[#E2A448] text-[#173B35] rounded-xl font-extrabold transition-all btn-tactile disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {loadingPlan === 'ultra' ? 'Kutilmoqda...' : 'Click orqali to\'lash'}
                </button>
                {errorPlan === 'ultra' && <p className="text-xs text-red-300 mt-2 text-center">{errorPlan}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
