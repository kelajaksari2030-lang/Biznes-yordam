import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  BookOpen,
  RotateCcw
} from 'lucide-react';

export interface HelpStep {
  title: string;
  description: string;
  tip?: string;
  visual: React.ReactNode;
}

export interface ModuleHelpGuideProps {
  moduleKey: string;
  moduleTitle: string;
  steps: HelpStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const ModuleHelpGuide: React.FC<ModuleHelpGuideProps> = ({
  moduleKey,
  moduleTitle,
  steps,
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Reset to first step when guide opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation & body overflow lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, currentStepIndex, steps.length, onClose]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Completed all steps
      try {
        localStorage.setItem(`besto_help_${moduleKey}_seen`, 'true');
      } catch {
        // ignore
      }
      if (onComplete) onComplete();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#173B35]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden overscroll-none animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-guide-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#F6F8F7] border border-[#D7F0E5] rounded-3xl max-w-3xl w-full flex flex-col max-h-[calc(100vh-32px)] sm:max-h-[85vh] shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#173B35] text-white px-4 sm:px-7 py-3.5 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#D7F0E5]/20 border border-[#D7F0E5]/40 text-[#F5B85C] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#F5B85C]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="text-[10px] sm:text-xs font-semibold text-[#D7F0E5] tracking-wide uppercase truncate">
                  Qanday ishlaydi?
                </span>
                <span className="text-[#F5B85C] text-xs">·</span>
                <span className="text-[10px] sm:text-xs font-bold text-[#F5B85C] truncate">
                  {moduleTitle}
                </span>
              </div>
              <h2 id="help-guide-title" className="text-xs sm:text-base font-bold text-white leading-tight truncate">
                {currentStep.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[40px] min-w-[40px] rounded-xl text-[#D7F0E5]/80 hover:text-white hover:bg-[#D7F0E5]/10 transition-colors btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C] shrink-0 flex items-center justify-center"
            aria-label="Qo'llanmani yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-[#D7F0E5]/40 h-1.5 w-full shrink-0 relative">
          <div
            className="bg-[#F5B85C] h-full transition-all duration-300 ease-out"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-4 sm:space-y-6">
          {/* Step visual diagram */}
          <div className="bg-white border border-[#D7F0E5] rounded-2xl p-2 sm:p-6 shadow-sm flex items-center justify-center min-h-[160px] sm:min-h-[240px] overflow-hidden">
            {currentStep.visual}
          </div>

          {/* Description and Tip */}
          <div className="space-y-3">
            <p className="text-xs sm:text-base font-medium text-[#173B35] leading-relaxed">
              {currentStep.description}
            </p>

            {currentStep.tip && (
              <div className="p-3 sm:p-3.5 bg-[#D7F0E5]/30 border border-[#D7F0E5] rounded-2xl flex items-start gap-2.5 sm:gap-3">
                <Sparkles className="w-4 h-4 text-[#173B35] shrink-0 mt-0.5" />
                <div className="text-[11px] sm:text-xs text-[#173B35] leading-relaxed">
                  <strong className="font-bold text-[#173B35] block mb-0.5">Amaliy maslahat:</strong>
                  {currentStep.tip}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-white border-t border-[#D7F0E5] px-4 sm:px-7 py-3 sm:py-4 flex items-center justify-between shrink-0 gap-2 sm:gap-3">
          {/* Step Indicator */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className="py-2 px-0.5 focus-visible:outline-none"
                title={`${idx + 1}-bosqichga o'tish`}
                aria-label={`${idx + 1}-bosqich`}
              >
                <div
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? 'w-5 sm:w-6 bg-[#173B35]'
                      : 'w-2 bg-[#D7F0E5] hover:bg-[#173B35]/40'
                  }`}
                />
              </button>
            ))}
            <span className="text-[11px] sm:text-xs text-[#173B35]/70 font-mono ml-1 sm:ml-2 whitespace-nowrap">
              {currentStepIndex + 1}/{steps.length}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="min-h-[40px] px-2.5 sm:px-3.5 py-2 rounded-xl border border-[#D7F0E5] text-xs font-bold text-[#173B35] hover:bg-[#D7F0E5]/30 disabled:opacity-40 disabled:pointer-events-none transition-all btn-tactile flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">Oldingi</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className={`min-h-[40px] px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center gap-1.5 shadow-xs ${
                isLastStep
                  ? 'bg-[#173B35] hover:bg-[#102A26] text-white'
                  : 'bg-[#F5B85C] hover:bg-[#E0A243] text-[#173B35]'
              }`}
            >
              <span>{isLastStep ? "Tushundim" : "Keyingi"}</span>
              {isLastStep ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#173B35]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface HelpGuideButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

export const HelpGuideButton: React.FC<HelpGuideButtonProps> = ({
  onClick,
  className = '',
  label = "Qanday ishlaydi?",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D7F0E5]/60 hover:bg-[#D7F0E5] text-[#173B35] border border-[#D7F0E5] text-xs font-semibold transition-all btn-tactile ${className}`}
      title="Modul bo'yicha vizual qo'llanma va yo'riqnoma"
    >
      <HelpCircle className="w-3.5 h-3.5 text-[#173B35]" />
      <span>{label}</span>
    </button>
  );
};
