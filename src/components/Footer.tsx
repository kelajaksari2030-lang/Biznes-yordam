import React from 'react';
import { ToolType } from '../types';

interface FooterProps {
  setActiveTab: (tab: ToolType) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="mt-16 border-t border-[#E0ECE8] bg-white py-10 text-xs text-[#55756E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="font-extrabold text-[#112521] text-sm tracking-tight">BESTO</span>
            <span className="text-[#173B35]/40" aria-hidden="true">·</span>
            <span className="text-[#2C4C45] font-medium">Biznesingizni boshqaring. O‘sishni oldindan ko‘ring.</span>
          </div>
          <p className="text-[#55756E] max-w-lg text-[11px] leading-relaxed">
            Ombor nazorati, retsept bo‘yicha ingredientlar hisobi, savdo buyurtmalari, CRM va kassa tahlili tizimi.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[#2C4C45] font-medium">
          <button
            onClick={() => setActiveTab('home')}
            className="hover:text-[#173B35] transition-colors cursor-pointer"
          >
            Bosh sahifa
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className="hover:text-[#173B35] transition-colors cursor-pointer"
          >
            Ombor
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className="hover:text-[#173B35] transition-colors cursor-pointer"
          >
            Savdo
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className="hover:text-[#173B35] transition-colors cursor-pointer"
          >
            Moliya
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className="hover:text-[#173B35] transition-colors cursor-pointer"
          >
            CRM
          </button>
          <button
            onClick={() => setActiveTab('today-navigator')}
            className="hover:text-[#173B35] transition-colors cursor-pointer"
          >
            Bugun nima qilay?
          </button>
        </div>
      </div>
    </footer>
  );
};
