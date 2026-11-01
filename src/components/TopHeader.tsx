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
  ReceiptText,
  Truck,
  Gift,
  GitFork,
  Barcode,
  Settings,
  LogOut,
  ChevronsUpDown
} from 'lucide-react';
import { ToolType } from '../types';
import { useAuth } from '../context/AuthContext';
import { canAccessBusinessForecast } from '../config/plans';
import { getUserInitials } from '../utils/userInitials';

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
  const { user, currentPlan, dailyUsage, signOutUser } = useAuth();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobileProfileMenuOpen, setIsMobileProfileMenuOpen] = useState(false);
  const [confirmMobileSignOut, setConfirmMobileSignOut] = useState(false);

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
        setIsMobileProfileMenuOpen(false);
        setConfirmMobileSignOut(false);
      }
    };
    if (isMobileDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsMobileProfileMenuOpen(false);
      setConfirmMobileSignOut(false);
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
      case 'suppliers':
        return {
          title: "Ta'minotchilar & Xaridlar",
          subtitle: "Xomashyo ta'minotchilari, xarid buyurtmalari (PO) va qoldiqlarni to'ldirish",
          icon: Truck,
        };
      case 'staff':
        return {
          title: "Xodimlar & Smenalar (Staff & KPI)",
          subtitle: "Xodimlar rollari (RBAC), kassa smenalari (Z-report) va sotuv komissiyasi",
          icon: Users,
        };
      case 'loyalty':
        return {
          title: "Sadoqat Dasturi & Keshbek",
          subtitle: "Keshbek ballari, mijoz darajalari va keshbek balansi",
          icon: Gift,
        };
      case 'multi-branch':
        return {
          title: "Filiallar & Omborlar",
          subtitle: "Filiallar, omborlar tarmog'i va omborlararo tovarlar transferi",
          icon: GitFork,
        };
      case 'barcode-print':
        return {
          title: "Shtrix-kod & Print Lab",
          subtitle: "EAN-13 generatsiyasi, mahsulot etiketkasi va termoprinter sozlamalari",
          icon: Barcode,
        };
      case 'settings':
        return {
          title: "Tizim Sozlamalari (Settings)",
          subtitle: "Profil, Telegram bot, kassa parametrlari va ma'lumotlar eksporti",
          icon: Settings,
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
    { id: 'suppliers' as ToolType, label: "Ta'minotchilar & Xaridlar", icon: Truck, isNew: true },
    { id: 'staff' as ToolType, label: "Xodimlar & Smenalar", icon: Users, isNew: true },
    { id: 'loyalty' as ToolType, label: "Sadoqat & Keshbek", icon: Gift, isNew: true },
    { id: 'multi-branch' as ToolType, label: "Filiallar & Omborlar", icon: GitFork, isNew: true },
    { id: 'barcode-print' as ToolType, label: "Shtrix-kod & Print", icon: Barcode, isNew: true },
    ...(canAccessBusinessForecast(currentPlan?.id)
      ? [{ id: 'business-forecast' as ToolType, label: "Aqlli biznes prognozi", icon: TrendingUp, isNew: true }]
      : []),
  ];

  return (
    <>
      {/* 1. DESKTOP CONTEXT BAR (hidden on mobile) */}
      <header className="hidden lg:flex sticky top-0 z-20 bg-[#F6F8F7]/95 backdrop-blur-md border-b border-[#E0ECE8] h-16 items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#173B35] text-[#F5B85C] flex items-center justify-center shrink-0 shadow-2xs">
            <CurrentIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-[#112521] leading-tight truncate">
              {currentInfo.title}
            </h1>
            <p className="text-xs text-[#2A5C52] truncate leading-tight mt-0.5">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenPricing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#173B35] hover:text-[#112521] bg-white hover:bg-[#D7F0E5]/30 border border-[#E0ECE8] rounded-xl transition-all btn-tactile whitespace-nowrap shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-[#173B35]" />
            <span>Tariflar & Kvota</span>
          </button>

          <button
            onClick={() => setActiveTab('profit-calculator')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#173B35] bg-[#F5B85C] hover:bg-[#E5A74B] border border-[#F5B85C] rounded-xl btn-tactile shadow-2xs whitespace-nowrap"
          >
            <Calculator className="w-3.5 h-3.5 text-[#173B35]" />
            <span>Foydani hisoblash</span>
          </button>

          {user && (
            <button
              onClick={onOpenAccount}
              className="flex items-center gap-2 p-1 pl-2 bg-white hover:bg-[#D7F0E5]/30 border border-[#E0ECE8] rounded-xl transition-all btn-tactile"
              title="Hisob holati va sozlamalar"
            >
              <div className="text-left hidden lg:block pr-1">
                <span className="text-xs font-bold text-[#112521] block leading-tight max-w-[120px] truncate">
                  {user.displayName?.split(' ')[0] || 'Hisob'}
                </span>
                <span className="text-[10px] text-[#2A5C52] block leading-tight font-medium">
                  {currentPlan.badge}
                </span>
              </div>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profil'}
                  className="w-7 h-7 rounded-full object-cover border border-[#E0ECE8]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#173B35] text-[#F5B85C] font-bold text-[10px] flex items-center justify-center">
                  {getUserInitials(user.displayName, user.email)}
                </div>
              )}
            </button>
          )}
        </div>
      </header>

      {/* 2. MOBILE TOP HEADER (shown on mobile, lg:hidden) */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#F6F8F7]/95 backdrop-blur-md border-b border-[#E0ECE8] h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4">
        {/* Left: Hamburger Button + Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="min-h-[40px] min-w-[40px] p-2 rounded-xl text-[#173B35] hover:bg-[#D7F0E5]/40 transition-colors flex items-center justify-center btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173B35]"
            aria-label="Menyuni ochish"
            aria-expanded={isMobileDrawerOpen}
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-[#173B35]" />
          </button>

          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 text-left btn-tactile focus-visible:outline-none"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#173B35] border border-[#23584F] text-[#F5B85C] flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs font-serif">
              B
            </div>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#112521]">
              BESTO
            </span>
          </button>
        </div>

        {/* Right: Quick Tariflar & Account Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenPricing}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#173B35] bg-white border border-[#E0ECE8] rounded-xl btn-tactile min-h-[36px]"
          >
            <Layers className="w-3.5 h-3.5 text-[#173B35]" />
            <span className="hidden xs:inline">Tariflar</span>
          </button>

          {user && (
            <button
              onClick={onOpenAccount}
              className="p-1 rounded-full bg-white border border-[#E0ECE8] btn-tactile min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Hisob sozlamalari"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profil'}
                  className="w-7 h-7 rounded-full object-cover border border-[#E0ECE8]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#173B35] text-[#F5B85C] font-bold text-[10px] flex items-center justify-center">
                  {getUserInitials(user.displayName, user.email)}
                </div>
              )}
            </button>
          )}
        </div>
      </header>

      {/* 3. MOBILE SLIDE-OUT DRAWER */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            className="relative w-[300px] max-w-[85vw] bg-[#F6F8F7] h-full shadow-2xl flex flex-col justify-between border-r border-[#E0ECE8] z-10 animate-slideInLeft"
            role="dialog"
            aria-modal="true"
            aria-label="Sayt navigatsiyasi"
          >
            {/* Drawer Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-[#E0ECE8] bg-[#F6F8F7]">
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
                className="min-h-[44px] min-w-[44px] -mr-2 p-2 rounded-xl text-[#173B35] hover:bg-[#D7F0E5]/40 transition-colors flex items-center justify-center btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173B35]"
                aria-label="Menyuni yopish"
              >
                <X className="w-6 h-6 text-[#173B35]" />
              </button>
            </div>

            {/* Drawer Nav Items List */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar">
              <span className="px-3 pb-1 text-[10px] font-bold tracking-wider text-[#2A5C52] uppercase block">
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
                        ? 'bg-[#173B35] text-white font-semibold shadow-xs'
                        : 'text-[#112521] hover:bg-[#D7F0E5]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 flex items-center justify-center shrink-0 ${
                          isActive ? 'text-[#F5B85C]' : 'text-[#2A5C52]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.isNew && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isActive
                              ? 'bg-[#F5B85C] text-[#173B35]'
                              : 'bg-[#D7F0E5] text-[#173B35] border border-[#23584F]/20'
                          }`}
                        >
                          Yangi
                        </span>
                      )}
                      <ArrowRight
                        className={`w-3.5 h-3.5 ${
                          isActive ? 'text-[#F5B85C]' : 'text-[#2A5C52]/60'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="relative p-4 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] border-t border-[#E0ECE8] bg-[#F6F8F7] space-y-2.5">
              {/* Account Popover Menu for Mobile */}
              {user && isMobileProfileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Foydalanuvchi hisobi menyusi"
                  className="absolute bottom-full mb-2 left-3 right-3 bg-white border border-[#E0ECE8] rounded-2xl shadow-2xl p-2 z-50 max-h-[60vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Header: User Info Card */}
                  <div className="p-2.5 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8] mb-1.5">
                    <div className="flex items-center gap-2.5">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'Profil'}
                          className="w-9 h-9 rounded-full object-cover border border-[#D7F0E5] shrink-0 shadow-2xs"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#173B35] text-[#F5B85C] font-extrabold text-xs flex items-center justify-center shrink-0 border border-[#23584F] shadow-2xs tracking-wider">
                          {getUserInitials(user.displayName, user.email)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-[#112521] truncate block leading-tight">
                          {user.displayName || 'Foydalanuvchi'}
                        </span>
                        <span className="text-[10px] text-[#2A5C52] truncate block leading-tight mt-0.5">
                          {user.email || 'Google hisobi'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#E0ECE8] flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D7F0E5] text-[#173B35] border border-[#B5E2D1]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        {currentPlan.badge} tarifi
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileProfileMenuOpen(false);
                          setIsMobileDrawerOpen(false);
                          onOpenPricing();
                        }}
                        className="text-[10px] font-bold text-[#173B35] hover:text-[#112521] underline underline-offset-2 cursor-pointer"
                      >
                        Tariflar
                      </button>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="space-y-0.5 py-1">
                    {/* Profil va hisob */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMobileProfileMenuOpen(false);
                        setIsMobileDrawerOpen(false);
                        onOpenAccount();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#112521] hover:text-[#173B35] hover:bg-[#D7F0E5]/40 rounded-xl transition-colors btn-tactile text-left cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-[#173B35] shrink-0" />
                      <span className="flex-1 truncate">Profil va hisob</span>
                    </button>

                    {/* Tizim sozlamalari */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMobileProfileMenuOpen(false);
                        setIsMobileDrawerOpen(false);
                        setActiveTab('settings');
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-xl transition-colors btn-tactile text-left cursor-pointer ${
                        activeTab === 'settings'
                          ? 'bg-[#173B35] text-white font-bold'
                          : 'text-[#112521] hover:text-[#173B35] hover:bg-[#D7F0E5]/40'
                      }`}
                    >
                      <Settings
                        className={`w-4 h-4 shrink-0 ${
                          activeTab === 'settings' ? 'text-[#F5B85C]' : 'text-[#173B35]'
                        }`}
                      />
                      <span className="flex-1 truncate">Tizim sozlamalari</span>
                      {activeTab === 'settings' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F5B85C] text-[#173B35]">
                          Faol
                        </span>
                      )}
                    </button>

                    {/* Tariflar & Kvota */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMobileProfileMenuOpen(false);
                        setIsMobileDrawerOpen(false);
                        onOpenPricing();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#112521] hover:text-[#173B35] hover:bg-[#D7F0E5]/40 rounded-xl transition-colors btn-tactile text-left cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-[#173B35] shrink-0" />
                      <span className="flex-1 truncate">Tariflar & Kvota</span>
                    </button>

                    <div className="my-1 border-t border-[#E0ECE8]" />

                    {/* Chiqish (with confirmation state) */}
                    {confirmMobileSignOut ? (
                      <div className="p-2.5 bg-red-50/80 border border-red-200 rounded-xl space-y-2 animate-in fade-in duration-100">
                        <p className="text-[11px] font-semibold text-red-800 leading-tight">
                          Tizimdan chiqishni tasdiqlaysizmi?
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              setIsMobileProfileMenuOpen(false);
                              setIsMobileDrawerOpen(false);
                              setConfirmMobileSignOut(false);
                              await signOutUser();
                            }}
                            className="flex-1 py-1.5 px-2 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer text-center"
                          >
                            Ha, chiqish
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmMobileSignOut(false)}
                            className="py-1.5 px-2 text-[11px] font-medium text-[#173B35] bg-white border border-[#E0ECE8] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Bekor
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => setConfirmMobileSignOut(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#DC2626] hover:text-[#B91C1C] hover:bg-red-50 rounded-xl transition-colors btn-tactile text-left cursor-pointer group"
                      >
                        <LogOut className="w-4 h-4 text-[#DC2626] group-hover:text-[#B91C1C] shrink-0" />
                        <span className="flex-1 truncate">Chiqish</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Plan Card */}
              <div className="p-3 bg-white border border-[#E0ECE8] rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-[#112521] block">
                    {currentPlan.badge} tarifi
                  </span>
                  <span className="text-[10px] text-[#2A5C52]">
                    Kunlik kvota: {dailyUsage?.adCount || 0}/{currentPlan.dailyAdLimit}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenPricing();
                  }}
                  className="text-xs font-bold text-[#173B35] bg-[#D7F0E5] hover:bg-[#C4E8DA] border border-[#23584F]/20 px-2.5 py-1 rounded-xl btn-tactile transition-colors"
                >
                  Tariflar
                </button>
              </div>

              {/* User Account Trigger Row */}
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileProfileMenuOpen(!isMobileProfileMenuOpen);
                    setConfirmMobileSignOut(false);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={isMobileProfileMenuOpen}
                  className={`w-full min-h-[48px] flex items-center justify-between gap-3 p-2 rounded-2xl border transition-all btn-tactile cursor-pointer ${
                    isMobileProfileMenuOpen
                      ? 'bg-[#D7F0E5]/60 border-[#B5E2D1] shadow-2xs'
                      : 'bg-white border-[#E0ECE8] hover:bg-[#D7F0E5]/30'
                  }`}
                  aria-label="Hisob sozlamalari va profil menyusi"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Profil'}
                        className="w-9 h-9 rounded-full object-cover border border-[#D7F0E5] shrink-0 shadow-2xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#173B35] text-[#F5B85C] font-extrabold text-xs flex items-center justify-center shrink-0 border border-[#23584F] shadow-2xs tracking-wider">
                        {getUserInitials(user.displayName, user.email)}
                      </div>
                    )}
                    <div className="min-w-0 text-left leading-tight">
                      <span className="text-xs font-bold text-[#112521] truncate block">
                        {user.displayName || 'Foydalanuvchi'}
                      </span>
                      <span className="text-[10px] text-[#2A5C52] truncate block mt-0.5">
                        {user.email || `${currentPlan.badge} tarifi`}
                      </span>
                    </div>
                  </div>
                  <ChevronsUpDown className="w-4 h-4 text-[#173B35]/60 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
