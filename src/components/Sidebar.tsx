import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  FileText, 
  Calculator, 
  MessageSquare, 
  Layers, 
  Sparkles, 
  FlaskConical, 
  Compass, 
  PanelLeftClose, 
  PanelLeft, 
  User as UserIcon,
  ChevronRight,
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
  ChevronsUpDown,
  ShieldCheck
} from 'lucide-react';
import { ToolType } from '../types';
import { useAuth } from '../context/AuthContext';
import { canAccessBusinessForecast } from '../config/plans';
import { getUserInitials } from '../utils/userInitials';

interface SidebarProps {
  activeTab: ToolType;
  setActiveTab: (tab: ToolType) => void;
  onOpenAccount: () => void;
  onOpenPricing: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface NavItem {
  id: ToolType;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isNew?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAccount,
  onOpenPricing,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { user, currentPlan, dailyUsage, signOutUser } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Close profile menu on outside click or Escape key
  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(target)
      ) {
        setIsProfileMenuOpen(false);
        setConfirmSignOut(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileMenuOpen(false);
        setConfirmSignOut(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileMenuOpen]);

  const navGroups: { groupTitle: string; items: NavItem[] }[] = [
    {
      groupTitle: "ASOSIY",
      items: [
        {
          id: 'home',
          label: "Bosh sahifa",
          shortLabel: "Asosiy",
          description: "Umumiy ko'rinish va barcha asboblar",
          icon: Home,
        },
        {
          id: 'today-navigator',
          label: "Bugun nima qilay?",
          shortLabel: "Reja",
          description: "Kunlik vazifalar va 0 so'mlik mijoz jalb qilish",
          icon: Compass,
          isNew: true,
        },
      ],
    },
    {
      groupTitle: "MARKETING & REKLAMA",
      items: [
        {
          id: 'ad-lab',
          label: "Reklama laboratoriyasi",
          shortLabel: "Lab",
          description: "3 ta strategiyani taqqoslash va A/B test",
          icon: FlaskConical,
          isNew: true,
        },
        {
          id: 'ad-generator',
          label: "Reklama matnlari",
          shortLabel: "Reklama",
          description: "Telegram va Instagram uchun sotuvchi postlar",
          icon: FileText,
        },
        {
          id: 'business-diagnostics',
          label: "AI Diagnostika",
          shortLabel: "Audit",
          description: "6 bosqichli biznes auditi va 7 kunlik reja",
          icon: Sparkles,
        },
      ],
    },
    {
      groupTitle: "MOLIYA & MULOQOT",
      items: [
        {
          id: 'profit-calculator',
          label: "Foyda kalkulyatori",
          shortLabel: "Hisob",
          description: "Tannarx, marja va sof foydani aniq hisoblash",
          icon: Calculator,
        },
        {
          id: 'reply-templates',
          label: "Mijozlarga javoblar",
          shortLabel: "Javoblar",
          description: "Narx, mahsulot va yetkazish shablonlari",
          icon: MessageSquare,
        },
      ],
    },
    {
      groupTitle: "BOSHQARUV & SAVDO",
      items: [
        {
          id: 'crm',
          label: "Mijozlar bazasi (CRM)",
          shortLabel: "CRM",
          description: "Mijozlar bilan aloqa va buyurtma holatlari",
          icon: Users,
          isNew: true,
        },
        {
          id: 'inventory',
          label: "Mahsulotlar ombori",
          shortLabel: "Ombor",
          description: "Tannarx, qoldiq va kam qolgan tovarlar nazorati",
          icon: Package,
          isNew: true,
        },
        {
          id: 'orders',
          label: "Savdo buyurtmalari",
          shortLabel: "Buyurtmalar",
          description: "Mijozlar buyurtmalari, holatlar va savdo hisobi",
          icon: ShoppingBag,
          isNew: true,
        },
        {
          id: 'finance',
          label: "Moliya & Xarajatlar",
          shortLabel: "Moliya",
          description: "Kassa tushumi, xarajatlar va taxminiy sof foyda",
          icon: ReceiptText,
          isNew: true,
        },
        {
          id: 'suppliers',
          label: "Ta'minotchilar & Xaridlar",
          shortLabel: "Xarid",
          description: "Xarid buyurtmalari, ta'minotchilar va qoldiqlar",
          icon: Truck,
          isNew: true,
        },
        {
          id: 'staff',
          label: "Xodimlar & Smenalar",
          shortLabel: "Xodimlar",
          description: "Smena Z-report, rollar va sotuv komissiyasi",
          icon: Users,
          isNew: true,
        },
        {
          id: 'loyalty',
          label: "Sadoqat & Keshbek",
          shortLabel: "Keshbek",
          description: "Keshbek ballari va mijozlar darajalari",
          icon: Gift,
          isNew: true,
        },
        {
          id: 'multi-branch',
          label: "Filiallar & Omborlar",
          shortLabel: "Filiallar",
          description: "Filiallar va omborlararo transferlar",
          icon: GitFork,
          isNew: true,
        },
        {
          id: 'barcode-print',
          label: "Shtrix-kod & Print",
          shortLabel: "Shtrix",
          description: "EAN-13 generatsiyasi va termoprinter",
          icon: Barcode,
          isNew: true,
        },
        ...(canAccessBusinessForecast(currentPlan?.id)
          ? [
              {
                id: 'business-forecast' as ToolType,
                label: "Aqlli biznes prognozi",
                shortLabel: "Prognoz",
                description: "Ultra: Tushum, talab va kassa oqimi prognozi",
                icon: TrendingUp,
                isNew: true,
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col justify-between shrink-0 sticky top-0 h-screen bg-white border-r border-[#E0ECE8] transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-64 lg:w-72'
      }`}
    >
      {/* Top Brand Header */}
      <div className="flex flex-col">
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E0ECE8]">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173B35] rounded-xl p-1 btn-tactile overflow-hidden cursor-pointer"
            title="Bosh sahifaga o'tish"
          >
            <div className="w-9 h-9 rounded-xl bg-[#173B35] border border-[#23584F] text-[#F5B85C] flex items-center justify-center font-bold shadow-xs shrink-0">
              <span className="text-base tracking-tight font-serif">B</span>
            </div>
            {!isCollapsed && (
              <div className="leading-tight truncate">
                <span className="text-lg font-bold tracking-tight text-[#173B35]">
                  BES<span className="text-[#F5B85C]">TO</span>
                </span>
                <span className="text-[10px] text-[#2A5C52] block font-medium tracking-wide">
                  Aqlli Boshqaruv
                </span>
              </div>
            )}
          </button>

          {/* Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-[#173B35]/60 hover:text-[#173B35] hover:bg-[#D7F0E5]/30 rounded-lg transition-colors btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C] cursor-pointer"
            title={isCollapsed ? "Sidebar'ni kengaytirish" : "Sidebar'ni ixchamlashtirish"}
            aria-label={isCollapsed ? "Kengaytirish" : "Ixchamlashtirish"}
          >
            {isCollapsed ? (
              <PanelLeft className="w-5 h-5 text-[#173B35]" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-[#173B35]" />
            )}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-170px)] no-scrollbar">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-extrabold tracking-wider text-[#173B35]/50 uppercase">
                  {group.groupTitle}
                </div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all btn-tactile group relative cursor-pointer ${
                      isActive
                        ? 'bg-[#173B35] text-white font-bold shadow-xs'
                        : 'text-[#173B35]/70 hover:text-[#173B35] hover:bg-[#D7F0E5]/30'
                    }`}
                    title={isCollapsed ? `${item.label} — ${item.description}` : undefined}
                  >
                    {/* Icon container */}
                    <div
                      className={`w-6 h-6 flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'text-[#F5B85C]' : 'text-[#173B35]/60 group-hover:text-[#173B35]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Text Details (when not collapsed) */}
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm truncate leading-tight">
                            {item.label}
                          </span>
                          {item.isNew && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                isActive
                                  ? 'bg-[#F5B85C] text-[#173B35]'
                                  : 'bg-[#D7F0E5] text-[#173B35] border border-[#B5E2D1]'
                              }`}
                            >
                              Yangi
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Active Indicator Bar (Left vertical edge on active) */}
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#F5B85C] rounded-r-full" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section: Plan, User Profile Row & Popover Menu */}
      <div className="relative p-3 border-t border-[#E0ECE8] bg-[#F6F8F7]/95 space-y-2">
        {/* Account Popover Menu */}
        {user && isProfileMenuOpen && (
          <div
            ref={profileMenuRef}
            role="menu"
            aria-label="Foydalanuvchi hisobi menyusi"
            className={`bg-white border border-[#E0ECE8] rounded-2xl shadow-xl z-50 p-2 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
              isCollapsed
                ? 'absolute bottom-2 left-full ml-3 w-72'
                : 'absolute bottom-full mb-2 left-3 right-3'
            }`}
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
                    setIsProfileMenuOpen(false);
                    onOpenPricing();
                  }}
                  className="text-[10px] font-bold text-[#173B35] hover:text-[#112521] underline underline-offset-2 cursor-pointer"
                >
                  Tariflar
                </button>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="space-y-0.5 py-1">
              {/* Profil va hisob */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenAccount();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#112521] hover:text-[#173B35] hover:bg-[#D7F0E5]/40 rounded-xl transition-colors btn-tactile text-left cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-[#173B35] shrink-0" />
                <span className="flex-1 truncate">Profil va hisob</span>
              </button>

              {/* Tizim sozlamalari */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setActiveTab('settings');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors btn-tactile text-left cursor-pointer ${
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
                  setIsProfileMenuOpen(false);
                  onOpenPricing();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#112521] hover:text-[#173B35] hover:bg-[#D7F0E5]/40 rounded-xl transition-colors btn-tactile text-left cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#173B35] shrink-0" />
                <span className="flex-1 truncate">Tariflar & Kvota</span>
              </button>

              <div className="my-1 border-t border-[#E0ECE8]" />

              {/* Chiqish (with confirmation state) */}
              {confirmSignOut ? (
                <div className="p-2.5 bg-red-50/80 border border-red-200 rounded-xl space-y-2 animate-in fade-in duration-100">
                  <p className="text-[11px] font-semibold text-red-800 leading-tight">
                    Tizimdan chiqishni tasdiqlaysizmi?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsProfileMenuOpen(false);
                        setConfirmSignOut(false);
                        await signOutUser();
                      }}
                      className="flex-1 py-1.5 px-2 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Ha, chiqish
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSignOut(false)}
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
                  onClick={() => setConfirmSignOut(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#DC2626] hover:text-[#B91C1C] hover:bg-red-50 rounded-xl transition-colors btn-tactile text-left cursor-pointer group"
                >
                  <LogOut className="w-4 h-4 text-[#DC2626] group-hover:text-[#B91C1C] shrink-0" />
                  <span className="flex-1 truncate">Chiqish</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Plan Entitlement Quick Card */}
        {!isCollapsed ? (
          <div className="p-2.5 bg-white border border-[#E0ECE8] rounded-2xl flex items-center justify-between shadow-2xs">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                <span className="text-xs font-bold text-[#173B35] truncate">
                  {currentPlan.badge} tarifi
                </span>
              </div>
              <span className="text-[10px] text-[#173B35]/70 block truncate">
                Kvota: {dailyUsage?.adCount || 0}/{currentPlan.dailyAdLimit} ishlatildi
              </span>
            </div>
            <button
              onClick={onOpenPricing}
              className="text-[10px] font-bold text-[#173B35] bg-[#D7F0E5] hover:bg-[#B5E2D1] border border-[#B5E2D1] px-2 py-1 rounded-lg transition-colors shrink-0 btn-tactile cursor-pointer"
            >
              Tariflar
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenPricing}
            className="w-full py-2 flex items-center justify-center text-[#173B35] hover:bg-[#D7F0E5]/30 rounded-xl transition-colors btn-tactile cursor-pointer"
            title="Tariflar va kvotalar"
          >
            <Layers className="w-5 h-5 text-[#173B35]" />
          </button>
        )}

        {/* Persistent Account / Profile Row with Circular Avatar */}
        {user && (
          <button
            ref={profileButtonRef}
            type="button"
            onClick={() => {
              setIsProfileMenuOpen(!isProfileMenuOpen);
              setConfirmSignOut(false);
            }}
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            className={`w-full flex items-center gap-2.5 p-2 rounded-2xl transition-all btn-tactile text-left cursor-pointer ${
              isProfileMenuOpen
                ? 'bg-[#D7F0E5]/60 border border-[#B5E2D1] shadow-2xs'
                : 'hover:bg-[#D7F0E5]/30 border border-transparent hover:border-[#E0ECE8]'
            } ${isCollapsed ? 'justify-center px-1' : ''}`}
            title={user.displayName || user.email || 'Profil menyusi'}
          >
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

            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="text-xs font-bold text-[#112521] truncate block">
                    {user.displayName || 'Foydalanuvchi'}
                  </span>
                  <span className="text-[10px] text-[#2A5C52] truncate block mt-0.5">
                    {currentPlan.badge} tarifi
                  </span>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-[#173B35]/50 shrink-0" />
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
