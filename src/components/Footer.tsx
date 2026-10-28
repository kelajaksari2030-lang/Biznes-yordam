import React from 'react';
import { ToolType } from '../types';

interface FooterProps {
  setActiveTab: (tab: ToolType) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="mt-16 border-t border-[#E6DCD1] bg-[#FAF6F0] py-10 text-xs text-[#8D786D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="font-bold text-[#173B35] text-sm tracking-wide">BESTO</span>
            <span className="text-[#F5B85C]">·</span>
            <span className="text-[#2A5C52]">O'zbekiston kichik va o'rta biznes egalari uchun aqlli boshqaruv tizimi</span>
          </div>
          <p className="text-[#8D786D] max-w-lg text-[11px] leading-relaxed">
            Reklama matnlari tuzish, A/B strategiyalar sinovi, foydani aniq hisoblash, mijozlarga tezkor javoblar va kunlik biznes harakatlar rejasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[#6B5549]">
          <button
            onClick={() => setActiveTab('home')}
            className="hover:text-[#493329] transition-colors"
          >
            Bosh sahifa
          </button>
          <button
            onClick={() => setActiveTab('today-navigator')}
            className="hover:text-[#493329] transition-colors"
          >
            Bugun nima qilay?
          </button>
          <button
            onClick={() => setActiveTab('ad-lab')}
            className="hover:text-[#493329] transition-colors"
          >
            Reklama Lab
          </button>
          <button
            onClick={() => setActiveTab('profit-calculator')}
            className="hover:text-[#493329] transition-colors"
          >
            Foyda kalkulyatori
          </button>
          <button
            onClick={() => setActiveTab('business-diagnostics')}
            className="hover:text-[#493329] transition-colors"
          >
            AI Diagnostika
          </button>
        </div>
      </div>
    </footer>
  );
};
