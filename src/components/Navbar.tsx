import React from 'react';
import { Home, FileText, Calculator, MessageSquare, Layers, ShieldCheck, User as UserIcon } from 'lucide-react';
import { ToolType } from '../types';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: ToolType;
  setActiveTab: (tab: ToolType) => void;
  onOpenAccount: () => void;
  onOpenPricing: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab,
  onOpenAccount,
  onOpenPricing,
}) => {
  const { user, currentPlan } = useAuth();

  return (
    <>
      {/* Top Bar for Desktop and Tablet - Strict 3-zone contract with warm-luxury palette */}
      <header className="sticky top-0 z-40 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#E6DCD1] transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6 sm:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70] rounded-xl p-1 btn-tactile"
          >
            <div className="w-9 h-9 rounded-xl bg-[#493329] border border-[#66493B] text-[#D0AE70] flex items-center justify-center font-bold shadow-xs">
              <span className="text-base tracking-tight font-serif">B</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#493329] whitespace-nowrap shrink-0">
              Biznes<span className="text-[#D0AE70]">Yordam</span>
            </span>
          </button>

          {/* Zone 2: Single-line Nav Links with subtle transitions */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-[#6B5549]">
            <button
              onClick={() => setActiveTab('home')}
              className={`hover:text-[#493329] transition-all whitespace-nowrap shrink-0 py-1.5 ${
                activeTab === 'home'
                  ? 'text-[#493329] font-semibold border-b-2 border-[#D0AE70]'
                  : 'hover:border-b-2 hover:border-[#E6DCD1]'
              }`}
            >
              Bosh sahifa
            </button>
            <button
              onClick={() => setActiveTab('ad-generator')}
              className={`hover:text-[#493329] transition-all whitespace-nowrap shrink-0 py-1.5 ${
                activeTab === 'ad-generator'
                  ? 'text-[#493329] font-semibold border-b-2 border-[#D0AE70]'
                  : 'hover:border-b-2 hover:border-[#E6DCD1]'
              }`}
            >
              Reklama matnlari
            </button>
            <button
              onClick={() => setActiveTab('profit-calculator')}
              className={`hover:text-[#493329] transition-all whitespace-nowrap shrink-0 py-1.5 ${
                activeTab === 'profit-calculator'
                  ? 'text-[#493329] font-semibold border-b-2 border-[#D0AE70]'
                  : 'hover:border-b-2 hover:border-[#E6DCD1]'
              }`}
            >
              Foyda kalkulyatori
            </button>
            <button
              onClick={() => setActiveTab('reply-templates')}
              className={`hover:text-[#493329] transition-all whitespace-nowrap shrink-0 py-1.5 ${
                activeTab === 'reply-templates'
                  ? 'text-[#493329] font-semibold border-b-2 border-[#D0AE70]'
                  : 'hover:border-b-2 hover:border-[#E6DCD1]'
              }`}
            >
              Mijozlarga javoblar
            </button>
          </nav>

          {/* Zone 3: Account & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Pricing Button */}
            <button
              onClick={onOpenPricing}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B5549] hover:text-[#493329] bg-white hover:bg-[#FAF6F0] border border-[#E6DCD1] rounded-xl transition-all btn-tactile whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 text-[#795640]" />
              <span>Tariflar</span>
            </button>

            {/* User Account Trigger */}
            {user && (
              <button
                onClick={onOpenAccount}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 bg-white hover:bg-[#FAF6F0] border border-[#E6DCD1] rounded-xl transition-all btn-tactile text-left"
                title="Hisob holati va sozlamalar"
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
                <div className="hidden lg:block text-left">
                  <span className="text-xs font-semibold text-[#493329] block leading-tight max-w-[100px] truncate">
                    {user.displayName?.split(' ')[0] || 'Hisob'}
                  </span>
                  <span className="text-[10px] text-[#795640] block leading-tight font-medium">
                    {currentPlan.badge}
                  </span>
                </div>
              </button>
            )}

            {/* Quick Action Button */}
            <button
              onClick={() => setActiveTab('profit-calculator')}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl btn-tactile shadow-xs whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
            >
              <Calculator className="w-3.5 h-3.5 text-[#34221A]" />
              <span>Hisoblash</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar - Ergonomic Thumb Zone (Height 60px) */}
      <nav
        aria-label="Mobil menyu"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF6F0]/95 backdrop-blur-md border-t border-[#E6DCD1] shadow-lg px-2"
      >
        <div className="grid grid-cols-4 items-center h-16">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors btn-tactile ${
              activeTab === 'home'
                ? 'text-[#493329] font-semibold'
                : 'text-[#8D786D] hover:text-[#493329]'
            }`}
          >
            <Home className={`w-5 h-5 ${activeTab === 'home' ? 'text-[#D0AE70]' : ''}`} />
            <span className="text-[11px] mt-1 tracking-tight">Asosiy</span>
          </button>

          <button
            onClick={() => setActiveTab('ad-generator')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors btn-tactile ${
              activeTab === 'ad-generator'
                ? 'text-[#493329] font-semibold'
                : 'text-[#8D786D] hover:text-[#493329]'
            }`}
          >
            <FileText className={`w-5 h-5 ${activeTab === 'ad-generator' ? 'text-[#D0AE70]' : ''}`} />
            <span className="text-[11px] mt-1 tracking-tight">Reklama</span>
          </button>

          <button
            onClick={() => setActiveTab('profit-calculator')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors btn-tactile ${
              activeTab === 'profit-calculator'
                ? 'text-[#493329] font-semibold'
                : 'text-[#8D786D] hover:text-[#493329]'
            }`}
          >
            <Calculator className={`w-5 h-5 ${activeTab === 'profit-calculator' ? 'text-[#D0AE70]' : ''}`} />
            <span className="text-[11px] mt-1 tracking-tight">Kalkulyator</span>
          </button>

          <button
            onClick={() => setActiveTab('reply-templates')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors btn-tactile ${
              activeTab === 'reply-templates'
                ? 'text-[#493329] font-semibold'
                : 'text-[#8D786D] hover:text-[#493329]'
            }`}
          >
            <MessageSquare className={`w-5 h-5 ${activeTab === 'reply-templates' ? 'text-[#D0AE70]' : ''}`} />
            <span className="text-[11px] mt-1 tracking-tight">Javoblar</span>
          </button>
        </div>
      </nav>
    </>
  );
};
