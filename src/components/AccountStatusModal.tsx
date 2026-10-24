import React from 'react';
import { 
  X, 
  ShieldCheck, 
  LogOut, 
  Layers,
  Database,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccountStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPricing: () => void;
}

export const AccountStatusModal: React.FC<AccountStatusModalProps> = ({
  isOpen,
  onClose,
  onOpenPricing,
}) => {
  const { user, userProfile, dailyUsage, signOutUser, currentPlan } = useAuth();

  if (!isOpen || !user) return null;

  const adCount = dailyUsage?.adCount || 0;
  const isNearLimit = adCount >= currentPlan.dailyAdLimit;

  return (
    <div className="fixed inset-0 z-50 bg-[#251A14]/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-[#E6DCD1] animate-in fade-in zoom-in-95 duration-150 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EFE8DE] pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#D0AE70]" />
            <h3 className="text-base font-bold text-[#493329]">
              Foydalanuvchi hisobi & Firestore
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#8D786D] hover:text-[#493329] p-1 rounded-lg btn-tactile"
            aria-label="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="flex items-center gap-3.5 p-4 bg-[#FAF6F0] rounded-2xl border border-[#E6DCD1]">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Foydalanuvchi'}
              className="w-12 h-12 rounded-xl object-cover border border-[#D0AE70]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#493329] text-[#D0AE70] font-bold text-lg flex items-center justify-center font-serif border border-[#6B5041]">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-[#493329] truncate">
              {user.displayName || 'Foydalanuvchi'}
            </h4>
            <p className="text-xs text-[#6B5549] truncate mt-0.5">
              {user.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#795640]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D0AE70]"></span>
                Google UID: {user.uid.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>

        {/* Firestore Subscription Status */}
        <div className="p-4 bg-white border border-[#E6DCD1] rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#8D786D]">
              <Database className="w-3.5 h-3.5 text-[#D0AE70]" />
              <span>Firestore obuna holati:</span>
            </div>
            <span className="text-xs font-bold text-[#34221A] bg-[#D0AE70] px-2.5 py-0.5 rounded-full shadow-xs">
              {currentPlan.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#EFE8DE] text-xs">
            <div className="p-2.5 bg-[#FAF6F0] rounded-xl border border-[#EFE8DE]">
              <span className="text-[10px] text-[#8D786D] block">Bugungi reklama sarfi</span>
              <span className={`font-bold font-mono text-sm tabular-nums mt-0.5 block ${isNearLimit ? 'text-[#9E2A2B]' : 'text-[#493329]'}`}>
                {adCount} / {currentPlan.dailyAdLimit} ta
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF6F0] rounded-xl border border-[#EFE8DE]">
              <span className="text-[10px] text-[#8D786D] block">Shaxsiy shablonlar</span>
              <span className="font-bold font-mono text-sm text-[#493329] tabular-nums mt-0.5 block">
                {currentPlan.customTemplateLimit} ta
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#795640]">
            <Calendar className="w-3.5 h-3.5 text-[#D0AE70] shrink-0" />
            <span>Hisob yaratilgan: {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('uz-UZ') : 'Bugun'}</span>
          </div>

          {/* Explicit note on authoritative backend enforcement and limits */}
          <div className="p-2.5 bg-[#FAF6F0] rounded-xl border border-[#EFE8DE] text-[11px] text-[#6B5549] leading-relaxed flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#D0AE70] shrink-0 mt-0.5" />
            <span>
              <strong>Xavfsizlik eslatmasi:</strong> Foydalanuvchi tarifi va ma'lumotlari Firestore bazasida UID orqali saqlanadi. Klient (brauzer) orqali tarifni oshirib bo'lmaydi. Kunlik kvotani server darajasida qat'iy cheklash ishonchli backend funksiyalari orqali to'liq kuchga kiradi.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-[#EFE8DE]">
          <button
            onClick={() => {
              onClose();
              onOpenPricing();
            }}
            className="w-full py-2.5 px-4 text-xs font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl transition-all btn-tactile shadow-xs flex items-center justify-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-[#34221A]" />
            <span>Tariflarni ko'rish va taqqoslash</span>
          </button>

          <button
            onClick={async () => {
              await signOutUser();
              onClose();
            }}
            className="w-full py-2.5 px-4 text-xs font-medium text-[#9E2A2B] hover:bg-[#FDF4F4] rounded-xl transition-colors btn-tactile flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Tizimdan chiqish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
