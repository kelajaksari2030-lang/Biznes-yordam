import React from 'react';
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
  ReceiptText
} from 'lucide-react';
import { ToolType } from '../types';
import { useAuth } from '../context/AuthContext';
import { canAccessBusinessForecast } from '../config/plans';

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
  const { user, currentPlan, dailyUsage } = useAuth();

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
      className={`hidden md:flex flex-col justify-between shrink-0 sticky top-0 h-screen bg-[#FAF6F0] border-r border-[#E6DCD1] transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-64 lg:w-72'
      }`}
    >
      {/* Top Brand Header */}
      <div className="flex flex-col">
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E6DCD1]">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70] rounded-xl p-1 btn-tactile overflow-hidden"
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
            className="p-1.5 text-[#8D786D] hover:text-[#493329] hover:bg-[#F2ECE1] rounded-lg transition-colors btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
            title={isCollapsed ? "Sidebar'ni kengaytirish" : "Sidebar'ni ixchamlashtirish"}
            aria-label={isCollapsed ? "Kengaytirish" : "Ixchamlashtirish"}
          >
            {isCollapsed ? (
              <PanelLeft className="w-5 h-5 text-[#795640]" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-[#795640]" />
            )}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-170px)] no-scrollbar">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-[#8D786D] uppercase">
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all btn-tactile group relative ${
                      isActive
                        ? 'bg-[#493329] text-[#FAF6F0] font-semibold shadow-xs'
                        : 'text-[#6B5549] hover:text-[#493329] hover:bg-[#F2ECE1]'
                    }`}
                    title={isCollapsed ? `${item.label} — ${item.description}` : undefined}
                  >
                    {/* Icon container */}
                    <div
                      className={`w-6 h-6 flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'text-[#D0AE70]' : 'text-[#795640] group-hover:text-[#493329]'
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
                                  ? 'bg-[#D0AE70] text-[#34221A]'
                                  : 'bg-[#FAF6F0] text-[#795640] border border-[#D0AE70]/60'
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
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#D0AE70] rounded-r-full" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section: Plan, User Profile & Pricing */}
      <div className="p-3 border-t border-[#E6DCD1] bg-[#FAF6F0]/90 space-y-2">
        {/* Plan Entitlement Quick Card */}
        {!isCollapsed ? (
          <div className="p-2.5 bg-white border border-[#E6DCD1] rounded-2xl flex items-center justify-between shadow-2xs">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D0AE70]"></span>
                <span className="text-xs font-bold text-[#493329] truncate">
                  {currentPlan.badge} tarifi
                </span>
              </div>
              <span className="text-[10px] text-[#795640] block truncate">
                Kunlik kvota: {dailyUsage?.adCount || 0}/{currentPlan.dailyAdLimit} ishlatildi
              </span>
            </div>
            <button
              onClick={onOpenPricing}
              className="text-[10px] font-bold text-[#34221A] bg-[#FAF6F0] hover:bg-[#EFE8DE] border border-[#D0AE70] px-2 py-1 rounded-lg transition-colors shrink-0 btn-tactile"
            >
              Tariflar
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenPricing}
            className="w-full py-2 flex items-center justify-center text-[#795640] hover:text-[#493329] hover:bg-[#F2ECE1] rounded-xl transition-colors btn-tactile"
            title="Tariflar va kvotalar"
          >
            <Layers className="w-5 h-5 text-[#D0AE70]" />
          </button>
        )}

        {/* User Account Trigger */}
        {user && (
          <button
            onClick={onOpenAccount}
            className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#F2ECE1] transition-all btn-tactile text-left ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Hisob holati va sozlamalar"
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

            {!isCollapsed && (
              <div className="min-w-0 flex-1 leading-tight">
                <span className="text-xs font-bold text-[#493329] truncate block">
                  {user.displayName || 'Foydalanuvchi'}
                </span>
                <span className="text-[10px] text-[#8D786D] truncate block">
                  {user.email || 'Google hisobi'}
                </span>
              </div>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
