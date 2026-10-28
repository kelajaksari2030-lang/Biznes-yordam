/**
 * BiznesYordam - Main Application Root
 * Responsive, clean SaaS tool suite for Uzbek small businesses
 * Firebase Authentication & Account/Plan Entitlements Integration
 * Professional S+ Architecture with Left Sidebar & Mobile Drawer
 */

import React, { useState, useEffect } from 'react';
import { ToolType } from './types';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { HomeDashboard } from './components/HomeDashboard';
import { AdGenerator } from './components/AdGenerator';
import { ProfitCalculator } from './components/ProfitCalculator';
import { CustomerReplies } from './components/CustomerReplies';
import { BusinessDiagnostics } from './components/BusinessDiagnostics';
import { AdLab } from './components/AdLab';
import { TodayNavigator } from './components/TodayNavigator';
import { Footer } from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DiagnosticProvider } from './context/DiagnosticContext';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { SignInScreen } from './components/SignInScreen';
import { AccountStatusModal } from './components/AccountStatusModal';
import { PricingModal } from './components/PricingModal';
import { BusinessProfileModal } from './components/BusinessProfileModal';
import { CrmModule } from './components/CrmModule';
import { InventoryModule } from './components/InventoryModule';
import { OrdersModule } from './components/OrdersModule';
import { FinanceModule } from './components/FinanceModule';
import { BusinessForecastModule } from './components/BusinessForecastModule';

const VALID_TABS: ToolType[] = [
  'home',
  'ad-generator',
  'ad-lab',
  'profit-calculator',
  'reply-templates',
  'business-diagnostics',
  'today-navigator',
  'crm',
  'inventory',
  'orders',
  'finance',
  'business-forecast',
];

function AppContent() {
  const { user, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<ToolType>(() => {
    // Check URL hash or default to home
    const hash = window.location.hash.replace('#', '') as ToolType;
    if (VALID_TABS.includes(hash)) {
      return hash;
    }
    return 'home';
  });

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isBusinessProfileOpen, setIsBusinessProfileOpen] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('biznes_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    try {
      localStorage.setItem('biznes_sidebar_collapsed', String(collapsed));
    } catch {
      // Ignore
    }
  };

  const handleTabChange = (tab: ToolType) => {
    setActiveTab(tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ToolType;
      if (VALID_TABS.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Lightweight loading indicator when checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] flex flex-col items-center justify-center space-y-4">
        <div className="h-12 px-5 rounded-2xl bg-[#173B35] border border-[#112521] text-[#F5B85C] font-extrabold text-xl flex items-center justify-center animate-pulse tracking-wider">
          BESTO
        </div>
        <div className="text-xs font-semibold text-[#173B35] tracking-wide">
          BESTO yuklanmoqda...
        </div>
      </div>
    );
  }

  // PRODUCT RULE: All users must sign in with Google through Firebase Authentication before using the application
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] text-[#112521] flex flex-col font-sans">
        <header className="border-b border-[#E0ECE8] bg-white/95 py-3.5 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="px-3 py-1 rounded-xl bg-[#173B35] text-[#F5B85C] font-extrabold text-sm shadow-xs tracking-wider">
                BESTO
              </div>
              <span className="text-lg font-extrabold tracking-tight text-[#173B35]">
                BESTO
              </span>
            </div>
            <span className="text-xs font-semibold text-[#173B35] bg-[#D7F0E5] px-2.5 py-1 rounded-lg border border-[#D7F0E5]">
              Xavfsiz kirish
            </span>
          </div>
        </header>

        <main className="flex-1">
          <SignInScreen />
        </main>

        <footer className="border-t border-[#E0ECE8] bg-[#F6F8F7] py-6 text-center text-xs text-[#173B35]/70">
          BESTO — Biznesingizni boshqaring. O‘sishni oldindan ko‘ring.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#112521] flex flex-col md:flex-row font-sans">
      <DiagnosticPanel />

      {/* 1. Left Sidebar for Desktop and Tablet */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={handleToggleSidebar}
      />

      {/* 2. Main Content Area & Top Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onOpenAccount={() => setIsAccountOpen(true)}
          onOpenPricing={() => setIsPricingOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => handleToggleSidebar(!isSidebarCollapsed)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
          {activeTab === 'home' && <HomeDashboard setActiveTab={handleTabChange} />}
          {activeTab === 'ad-generator' && <AdGenerator />}
          {activeTab === 'ad-lab' && <AdLab />}
          {activeTab === 'profit-calculator' && <ProfitCalculator />}
          {activeTab === 'reply-templates' && <CustomerReplies />}
          {activeTab === 'business-diagnostics' && (
            <BusinessDiagnostics onOpenBusinessProfile={() => setIsBusinessProfileOpen(true)} />
          )}
          {activeTab === 'today-navigator' && <TodayNavigator />}
          {activeTab === 'crm' && <CrmModule />}
          {activeTab === 'inventory' && <InventoryModule />}
          {activeTab === 'orders' && <OrdersModule />}
          {activeTab === 'finance' && <FinanceModule />}
          {activeTab === 'business-forecast' && (
            <BusinessForecastModule
              onOpenPricing={() => setIsPricingOpen(true)}
              setActiveTab={handleTabChange}
            />
          )}
        </main>

        <Footer setActiveTab={handleTabChange} />
      </div>

      {/* Account Status Modal */}
      <AccountStatusModal 
        isOpen={isAccountOpen} 
        onClose={() => setIsAccountOpen(false)}
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenBusinessProfile={() => setIsBusinessProfileOpen(true)}
      />

      {/* Pricing & Entitlements Modal */}
      <PricingModal 
        isOpen={isPricingOpen} 
        onClose={() => setIsPricingOpen(false)} 
      />

      {/* Unified Business Profile Modal */}
      <BusinessProfileModal
        isOpen={isBusinessProfileOpen}
        onClose={() => setIsBusinessProfileOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DiagnosticProvider>
        <AppContent />
      </DiagnosticProvider>
    </AuthProvider>
  );
}
