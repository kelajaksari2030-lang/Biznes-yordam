import React from 'react';
import { ToolType } from '../types';

interface FooterProps {
  setActiveTab: (tab: ToolType) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="mt-16 border-t border-[#E6DCD1] bg-[#FAF6F0] py-10 pb-24 md:pb-10 text-xs text-[#8D786D]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="font-bold text-[#493329] text-sm">BiznesYordam</span>
            <span className="text-[#D0AE70]">·</span>
            <span className="text-[#6B5549]">Kichik biznes uchun amaliy asboblar</span>
          </div>
          <p className="text-[#8D786D] max-w-md text-[11px]">
            Reklama matnlari tuzish, foyda hisoblash va mijozlar bilan muloqotni tezlashtirish uchun qulay platforma.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-[#6B5549]">
          <button
            onClick={() => setActiveTab('home')}
            className="hover:text-[#493329] transition-colors"
          >
            Bosh sahifa
          </button>
          <button
            onClick={() => setActiveTab('ad-generator')}
            className="hover:text-[#493329] transition-colors"
          >
            Reklama matnlari
          </button>
          <button
            onClick={() => setActiveTab('profit-calculator')}
            className="hover:text-[#493329] transition-colors"
          >
            Foyda kalkulyatori
          </button>
          <button
            onClick={() => setActiveTab('reply-templates')}
            className="hover:text-[#493329] transition-colors"
          >
            Mijozlarga javoblar
          </button>
        </div>
      </div>
    </footer>
  );
};
