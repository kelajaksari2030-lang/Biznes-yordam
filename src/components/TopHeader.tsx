import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Home, 
  FileText, 
  Calculator, 
  MessageSquare, 
  Layers, 
  Sparkles, 
  FlaskConical, 
  Compass, 
  User as UserIcon,
  ArrowRight,
  TrendingUp,
  Package,
  Share2,
  Users,
  ShoppingBag,
  ReceiptText
} from 'lucide-react';
import { ToolType } from '../types';
import { useAuth } from '../context/AuthContext';
import { canAccessBusinessForecast } from '../config/plans';

interface TopHeaderProps {
  activeTab: ToolType;
  setActiveTab: (tab: ToolType) => void;
  onOpenAccount: () => void;
  onOpenPricing: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAccount,
  onOpenPricing,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const { user, currentPlan, dailyUsage } = useAuth();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
      }
    };
    if (isMobileDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileDrawerOpen]);

  const getPageTitleAndDesc = (tab: ToolType) => {
    switch (tab) {
      case 'home':
        return {
          title: "Boshqaruv paneli",
          subtitle: "BESTO — barcha asboblar to'plami",
          icon: Home,
        };
      case 'today-navigator':
        return {
          title: "Bugun nima qilay?",
          subtitle: "Kunlik eng muhim fokus va 0 so'mlik mijoz jalb qilish",
          icon: Compass,
        };
      case 'ad-lab':
        return {
          title: "Reklama laboratoriyasi",
          subtitle: "3 ta reklama strategiyasini taqqoslash va A/B sinov",
          icon: FlaskConical,
        };
      case 'ad-generator':
        return {
          title: "Reklama matnlari",
          subtitle: "Telegram va Instagram uchun sotuvchi post qoralamalari",
          icon: FileText,
        };
      case 'profit-calculator':
        return {
          title: "Foyda kalkulyatori",
          subtitle: "Tannarx, marja va sof foydani aniq hisoblash",
          icon: Calculator,
        };
      case 'reply-templates':
        return {
          title: "Mijozlarga javoblar",
          subtitle: "Narx, to'lov va yetkazib berish bo'yicha tayyor andozalar",
          icon: MessageSquare,
        };
      case 'business-diagnostics':
        return {
          title: "AI Biznes Diagnostikasi",
          subtitle: "6 bosqichli audit, xavflar va 7 kunlik amaliy reja",
          icon: Sparkles,
        };
      case 'crm':
        return {
          title: "Mijozlar bazasi (CRM)",
          subtitle: "Mijozlar bilan aloqa, telefon, Telegram va buyurtma holatlari",
          icon: Users,
        };
      case 'inventory':
        return {
          title: "Mahsulotlar ombori",
          subtitle: "Tannarx, sotish narxi, qoldiq va kam qolgan tovarlar nazorati",
          icon: Package,
        };
      case 'orders':
        return {
          title: "Savdo buyurtmalari",
          subtitle: "Mijozlar buyurtmalari, holatlar, to'lovlar va ombor integratsiyasi",
          icon: ShoppingBag,
        };
      case 'finance':
        return {
          title: "Moliya & Xarajatlar hisobi",
          subtitle: "Kassa tushumi, mahsulotlar tannarxi, operatsion xarajatlar va taxminiy sof foyda",
          icon: ReceiptText,
        };
      case 'business-forecast':
        return {
          title: "Aqlli biznes prognozi",
          subtitle: "Savdo tendensiyalari, ombor ehtiyojlari va kassa oqimi tahlili",
          icon: TrendingUp,
        };
      default:
        return {
          title: "BESTO",
          subtitle: "Kichik va o'rta biznes uchun aqlli boshqaruv tizimi",
          icon: Home,
        };
    }
  };

  const currentInfo = getPageTitleAndDesc(activeTab);
  const CurrentIcon = currentInfo.icon;

  const handleMobileNavClick = (tab: ToolType) => {
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
  };

  const navItems = [
    { id: 'home' as ToolType, label: "Bosh sahifa", icon: Home },
    { id: 'today-navigator' as ToolType, label: "Bugun nima qilay?", icon: Compass, isNew: true },
    { id: 'ad-lab' as ToolType, label: "Reklama laboratoriyasi", icon: FlaskConical, isNew: true },
    { id: 'ad-generator' as ToolType, label: "Reklama matnlari", icon: FileText },
    { id: 'profit-calculator' as ToolType, label: "Foyda kalkulyatori", icon: Calculator },
    { id: 'reply-templates' as ToolType, label: "Mijozlarga javoblar", icon: MessageSquare },
    { id: 'business-diagnostics' as ToolType, label: "AI Biznes Diagnostikasi", icon: Sparkles },
    { id: 'crm' as ToolType, label: "Mijozlar bazasi (CRM)", icon: Users, isNew: true },
    { id: 'inventory' as ToolType, label: "Mahsulotlar ombori", icon: Package, isNew: true },
    { id: 'orders' as ToolType, label: "Savdo buyurtmalari", icon: ShoppingBag, isNew: true },
    { id: 'finance' as ToolType, label: "Moliya & Xarajatlar", icon: ReceiptText, isNew: true },
    ...(canAccessBusinessForecast(currentPlan?.id)
      ? [{ id: 'business-forecast' as ToolType, label: "Aqlli biznes prognozi", icon: TrendingUp, isNew: true }]
      : []),
  ];

  return (
    <>
      {/* 1. DESKTOP CONTEXT BAR (hidden on mobile) */}
      <header className="hidden md:flex sticky top-0 z-20 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#E6DCD1] h-16 items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#493329] text-[#D0AE70] flex items-center justify-center shrink-0 shadow-2xs">
            <CurrentIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-[#493329] leading-tight truncate">
              {currentInfo.title}
            </h1>
            <p className="text-xs text-[#795640] truncate leading-tight mt-0.5">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenPricing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6B5549] hover:text-[#493329] bg-white hover:bg-[#FAF6F0] border border-[#E6DCD1] rounded-xl transition-all btn-tactile whitespace-nowrap shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-[#795640]" />
            <span>Tariflar & Kvota</span>
          </button>

          <button
            onClick={() => setActiveTab('profit-calculator')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl btn-tactile shadow-2xs whitespace-nowrap"
          >
            <Calculator className="w-3.5 h-3.5 text-[#34221A]" />
            <span>Foydani hisoblash</span>
          </button>

          {user && (
            <button
              onClick={onOpenAccount}
              className="flex items-center gap-2 p-1 pl-2 bg-white hover:bg-[#FAF6F0] border border-[#E6DCD1] rounded-xl transition-all btn-tactile"
              title="Hisob holati va sozlamalar"
            >
              <div className="text-left hidden lg:block pr-1">
                <span className="text-xs font-semibold text-[#493329] block leading-tight max-w-[120px] truncate">
                  {user.displayName?.split(' ')[0] || 'Hisob'}
                </span>
                <span className="text-[10px] text-[#795640] block leading-tight font-medium">
                  {currentPlan.badge}
                </span>
              </div>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profil'}
                  className="w-7 h-7 rounded-lg object-cover border border-[#D0AE70]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#493329] text-[#D0AE70] font-bold text-xs flex items-center justify-center font-serif">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </button>
          )}
        </div>
      </header>

      {/* 2. MOBILE TOP HEADER (shown on mobile, md:hidden) */}
      <header className="md:hidden sticky top-0 z-40 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#E6DCD1] h-16 flex items-center justify-between px-4">
        {/* Left: Hamburger Button + Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="min-h-[44px] min-w-[44px] -ml-2 p-2 rounded-xl text-[#493329] hover:bg-[#EFE8DE] transition-colors flex items-center justify-center btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
            aria-label="Menyuni ochish"
            aria-expanded={isMobileDrawerOpen}
          >
            <Menu className="w-6 h-6 text-[#493329]" />
          </button>

          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 text-left btn-tactile focus-visible:outline-none"
          >
            <div className="w-8 h-8 rounded-xl bg-[#173B35] border border-[#23584F] text-[#F5B85C] flex items-center justify-center font-bold text-sm shadow-xs font-serif">
              B
            </div>
            <span className="text-lg font-bold tracking-tight text-[#173B35]">
              BES<span className="text-[#F5B85C]">TO</span>
            </span>
          </button>
        </div>

        {/* Right: Quick Tariflar & Account Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPricing}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#6B5549] bg-white border border-[#E6DCD1] rounded-xl btn-tactile"
          >
            <Layers className="w-3.5 h-3.5 text-[#D0AE70]" />
            <span>Tariflar</span>
          </button>

          {user && (
            <button
              onClick={onOpenAccount}
              className="p-1 rounded-xl bg-white border border-[#E6DCD1] btn-tactile"
              aria-label="Hisob sozlamalari"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profil'}
                  className="w-7 h-7 rounded-lg object-cover border border-[#D0AE70]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#493329] text-[#D0AE70] font-bold text-xs flex items-center justify-center font-serif">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </button>
          )}
        </div>
      </header>

      {/* 3. MOBILE SLIDE-OUT DRAWER */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            className="relative w-[300px] max-w-[85vw] bg-[#FAF6F0] h-full shadow-2xl flex flex-col justify-between border-r border-[#E6DCD1] z-10 animate-slideInLeft"
            role="dialog"
            aria-modal="true"
            aria-label="Sayt navigatsiyasi"
          >
            {/* Drawer Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-[#E6DCD1] bg-[#FAF6F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#173B35] border border-[#23584F] text-[#F5B85C] flex items-center justify-center font-bold text-sm shadow-xs font-serif">
                  B
                </div>
                <div>
                  <span className="text-base font-bold text-[#173B35] leading-tight block">
                    BES<span className="text-[#F5B85C]">TO</span>
                  </span>
                  <span className="text-[10px] text-[#2A5C52] block font-medium">
                    Kichik va o'rta biznes tizimi
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="min-h-[44px] min-w-[44px] -mr-2 p-2 rounded-xl text-[#6B5549] hover:text-[#493329] hover:bg-[#EFE8DE] transition-colors flex items-center justify-center btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
                aria-label="Menyuni yopish"
              >
                <X className="w-6 h-6 text-[#493329]" />
              </button>
            </div>

            {/* Drawer Nav Items List */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar">
              <span className="px-3 pb-1 text-[10px] font-bold tracking-wider text-[#8D786D] uppercase block">
                Barcha xizmatlar
              </span>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNavClick(item.id)}
                    className={`w-full min-h-[48px] flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all btn-tactile ${
                      isActive
                        ? 'bg-[#493329] text-[#FAF6F0] font-semibold shadow-xs'
                        : 'text-[#493329] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 flex items-center justify-center shrink-0 ${
                          isActive ? 'text-[#D0AE70]' : 'text-[#795640]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.isNew && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isActive
                              ? 'bg-[#D0AE70] text-[#34221A]'
                              : 'bg-white text-[#795640] border border-[#D0AE70]/60'
                          }`}
                        >
                          Yangi
                        </span>
                      )}
                      <ArrowRight
                        className={`w-3.5 h-3.5 ${
                          isActive ? 'text-[#D0AE70]' : 'text-[#8D786D]'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E6DCD1] bg-[#FAF6F0] space-y-3">
              {/* Plan Card */}
              <div className="p-3 bg-white border border-[#E6DCD1] rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#493329] block">
                    {currentPlan.badge} tarifi
                  </span>
                  <span className="text-[10px] text-[#795640]">
                    Kunlik kvota: {dailyUsage?.adCount || 0}/{currentPlan.dailyAdLimit}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenPricing();
                  }}
                  className="text-xs font-bold text-[#34221A] bg-[#FAF6F0] border border-[#D0AE70] px-2.5 py-1 rounded-xl btn-tactile"
                >
                  Tariflar
                </button>
              </div>

              {/* User Account Trigger */}
              {user && (
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenAccount();
                  }}
                  className="w-full min-h-[48px] flex items-center gap-3 p-2 bg-white border border-[#E6DCD1] rounded-2xl text-left btn-tactile"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Profil'}
                      className="w-8 h-8 rounded-xl object-cover border border-[#D0AE70] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-[#493329] text-[#D0AE70] font-bold text-xs flex items-center justify-center font-serif shrink-0">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 leading-tight">
                    <span className="text-xs font-bold text-[#493329] truncate block">
                      {user.displayName || 'Hisob sozlamalari'}
                    </span>
                    <span className="text-[10px] text-[#8D786D] truncate block">
                      Sozlamalar va hisob holati
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
