/**
 * BiznesYordam - Main Application Root
 * Responsive, clean SaaS tool suite for Uzbek small businesses
 * Firebase Authentication & Account/Plan Entitlements Integration
 */

import React, { useState, useEffect } from 'react';
import { ToolType } from './types';
import { Navbar } from './components/Navbar';
import { HomeDashboard } from './components/HomeDashboard';
import { AdGenerator } from './components/AdGenerator';
import { ProfitCalculator } from './components/ProfitCalculator';
import { CustomerReplies } from './components/CustomerReplies';
import { Footer } from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SignInScreen } from './components/SignInScreen';
import { AccountStatusModal } from './components/AccountStatusModal';
import { PricingModal } from './components/PricingModal';

function AppContent() {
  const { user, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<ToolType>(() => {
    // Check URL hash or default to home
    const hash = window.location.hash.replace('#', '') as ToolType;
    if (['home', 'ad-generator', 'profit-calculator', 'reply-templates'].includes(hash)) {
      return hash;
    }
    return 'home';
  });

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const handleTabChange = (tab: ToolType) => {
    setActiveTab(tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ToolType;
      if (['home', 'ad-generator', 'profit-calculator', 'reply-templates'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Lightweight loading indicator when checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4ED] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#493329] border border-[#6B5041] text-[#D0AE70] font-serif text-xl font-bold flex items-center justify-center animate-pulse">
          B
        </div>
        <div className="text-xs font-semibold text-[#795640] tracking-wide">
          BiznesYordam yuklanmoqda...
        </div>
      </div>
    );
  }

  // PRODUCT RULE: All users must sign in with Google through Firebase Authentication before using the application
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F4ED] text-[#34221A] flex flex-col font-sans">
        <header className="border-b border-[#E6DCD1] bg-[#FAF6F0]/95 py-3.5 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#493329] border border-[#66493B] text-[#D0AE70] flex items-center justify-center font-bold text-sm shadow-xs font-serif">
                B
              </div>
              <span className="text-lg font-bold tracking-tight text-[#493329]">
                Biznes<span className="text-[#D0AE70]">Yordam</span>
              </span>
            </div>
            <span className="text-xs font-medium text-[#795640] bg-white px-2.5 py-1 rounded-lg border border-[#E6DCD1]">
              Xavfsiz kirish
            </span>
          </div>
        </header>

        <main className="flex-1">
          <SignInScreen />
        </main>

        <footer className="border-t border-[#E6DCD1] bg-[#FAF6F0] py-6 text-center text-xs text-[#8D786D]">
          BiznesYordam — O'zbekiston kichik biznes egalari uchun qulay asboblar
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4ED] text-[#34221A] flex flex-col font-sans">
      {/* Top Navbar & Mobile Bottom Tab Bar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl w-full mx-auto">
        {activeTab === 'home' && <HomeDashboard setActiveTab={handleTabChange} />}
        {activeTab === 'ad-generator' && <AdGenerator />}
        {activeTab === 'profit-calculator' && <ProfitCalculator />}
        {activeTab === 'reply-templates' && <CustomerReplies />}
      </main>

      {/* Account Status Modal */}
      <AccountStatusModal 
        isOpen={isAccountOpen} 
        onClose={() => setIsAccountOpen(false)}
        onOpenPricing={() => setIsPricingOpen(true)}
      />

      {/* Pricing & Entitlements Modal */}
      <PricingModal 
        isOpen={isPricingOpen} 
        onClose={() => setIsPricingOpen(false)} 
      />

      {/* Footer */}
      <Footer setActiveTab={handleTabChange} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
