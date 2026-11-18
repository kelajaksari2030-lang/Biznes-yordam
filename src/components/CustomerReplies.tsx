import React, { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, 
  Copy, 
  Check, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Sparkles, 
  RotateCcw, 
  Tag, 
  CheckCircle2, 
  X,
  Database,
  AlertCircle,
  Loader2,
  Bookmark,
  LogIn
} from 'lucide-react';
import {
  ReplyTemplate,
  ReplyCategory,
  QuickVariables,
  CustomerReplyTone,
  CustomerReplySuggestion,
} from '../types';
import { INITIAL_REPLY_TEMPLATES, CATEGORY_LABELS } from '../data/replyTemplates';
import { useAuth } from '../context/AuthContext';
import { getUserCustomTemplates, saveCustomTemplate, deleteCustomTemplate } from '../services/firestore';
import { requestCustomerRepliesFromBackend } from '../services/customerRepliesService';
import { readScopedCache, writeScopedCache } from '../utils/userCache';

const DEFAULT_QUICK_VARIABLES: QuickVariables = {
  productName: 'Klassik soat',
  price: '240 000',
  deliveryTime: '2-3 soat',
  cardNumber: '8600 1234 5678 9012',
  discount: '15% bayram aksiyasi',
  shopName: 'Premium Savdo',
  phoneNumber: '+998 (90) 123-45-67',
};

export const CustomerReplies: React.FC = () => {
  const { user, currentPlan, dailyUsage, updateDailyUsageCount, signInWithGoogle, isAdmin, simulatedTier } = useAuth();

  // Saved templates in scoped cache or default
  const [templates, setTemplates] = useState<ReplyTemplate[]>(() => {
    const cached = readScopedCache<ReplyTemplate[]>('reply_templates', user?.uid);
    return cached && cached.length > 0 ? cached : INITIAL_REPLY_TEMPLATES;
  });

  // Global quick variables that populate all templates
  const [variables, setVariables] = useState<QuickVariables>(() => {
    const cached = readScopedCache<QuickVariables>('quick_variables', user?.uid);
    return cached || DEFAULT_QUICK_VARIABLES;
  });

  const [activeCategory, setActiveCategory] = useState<ReplyCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit / Add / Reset Modal State
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState<'product' | 'price' | 'delivery' | 'payment' | 'followup' | 'complaint'>('product');
  const [customText, setCustomText] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  // Gemini AI Reply Generator State
  const [aiCustomerMessage, setAiCustomerMessage] = useState('');
  const [aiTone, setAiTone] = useState<CustomerReplyTone>('friendly');
  const [aiContextNote, setAiContextNote] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<CustomerReplySuggestion[]>([]);
  const [aiModelUsed, setAiModelUsed] = useState<string | null>(null);
  const [copiedAiIndex, setCopiedAiIndex] = useState<number | null>(null);
  const [savedAiIndex, setSavedAiIndex] = useState<number | null>(null);

  const saveTemplatesToStorage = (data: ReplyTemplate[]) => {
    if (user?.uid) {
      writeScopedCache('reply_templates', user.uid, data);
    }
  };

  const customCount = useMemo(() => {
    return templates.filter((t) => t.isCustom).length;
  }, [templates]);

  // Synchronize custom templates from Firestore and scoped cache on user change
  useEffect(() => {
    if (!user) {
      setTemplates(INITIAL_REPLY_TEMPLATES);
      setVariables(DEFAULT_QUICK_VARIABLES);
      return;
    }

    const cachedVars = readScopedCache<QuickVariables>('quick_variables', user.uid);
    setVariables(cachedVars || DEFAULT_QUICK_VARIABLES);

    const cachedTpls = readScopedCache<ReplyTemplate[]>('reply_templates', user.uid);
    setTemplates(cachedTpls && cachedTpls.length > 0 ? cachedTpls : INITIAL_REPLY_TEMPLATES);

    let isMounted = true;
    getUserCustomTemplates(user.uid)
      .then((docs) => {
        if (isMounted) {
          const customMapped: ReplyTemplate[] = docs.map((d) => ({
            id: d.id,
            category: (d.category as any) || 'product',
            title: d.title,
            description: d.description || 'Shaxsiy shablon',
            template: d.template,
            usageTip: 'Sizning shaxsiy shabloningiz',
            isCustom: true,
          }));
          const combined = [...customMapped, ...INITIAL_REPLY_TEMPLATES];
          setTemplates(combined);
          writeScopedCache('reply_templates', user.uid, combined);
        }
      })
      .catch((err) => {
        console.warn('Could not load custom templates from Firestore:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Update variables and save
  const handleVariableChange = (key: keyof QuickVariables, val: string) => {
    const updated = { ...variables, [key]: val };
    setVariables(updated);
    if (user?.uid) {
      writeScopedCache('quick_variables', user.uid, updated);
    }
  };

  // Interpolate variables into template string
  const formatTemplateText = (raw: string): string => {
    return raw
      .replace(/{productName}/g, variables.productName || '[Mahsulot nomi]')
      .replace(/{price}/g, variables.price || '[Narx]')
      .replace(/{deliveryTime}/g, variables.deliveryTime || '[Yetkazish muddati]')
      .replace(/{cardNumber}/g, variables.cardNumber || '[Karta raqami]')
      .replace(/{discount}/g, variables.discount || '[Aksiya / Chegirma]')
      .replace(/{shopName}/g, variables.shopName || '[Do\'kon nomi]')
      .replace(/{phoneNumber}/g, variables.phoneNumber || '[Telefon raqami]');
  };

  // Copy template
  const handleCopy = async (id: string, text: string) => {
    const populated = formatTemplateText(text);
    try {
      await navigator.clipboard.writeText(populated);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback
    }
  };

  // Save edited or new template
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customText.trim()) return;

    setModalError(null);
    if (editingTemplate) {
      // update
      const updated = templates.map((t) =>
        t.id === editingTemplate.id
          ? {
              ...t,
              title: customTitle.trim(),
              category: customCategory,
              template: customText.trim(),
              description: customDescription.trim() || t.description,
            }
          : t
      );
      setTemplates(updated);
      saveTemplatesToStorage(updated);

      if (user && editingTemplate.isCustom) {
        await saveCustomTemplate(user.uid, {
          id: editingTemplate.id,
          title: customTitle.trim(),
          category: customCategory,
          template: customText.trim(),
          description: customDescription.trim() || editingTemplate.description,
          createdAt: new Date().toISOString(),
        });
      }
      setEditingTemplate(null);
    } else {
      // check plan limit
      if (customCount >= currentPlan.customTemplateLimit) {
        setModalError(
          `Sizning joriy ${currentPlan.name} tarifingizda shaxsiy shablonlar limiti (${currentPlan.customTemplateLimit} ta) to'lgan.`
        );
        return;
      }

      // create new
      const newTemplate: ReplyTemplate = {
        id: `tpl-${Date.now()}`,
        title: customTitle.trim(),
        category: customCategory,
        description: customDescription.trim() || 'Foydalanuvchi tomonidan kiritilgan shablon',
        template: customText.trim(),
        usageTip: 'Sizning shaxsiy shabloningiz',
        isCustom: true,
      };
      const updated = [newTemplate, ...templates];
      setTemplates(updated);
      saveTemplatesToStorage(updated);

      if (user) {
        await saveCustomTemplate(user.uid, {
          id: newTemplate.id,
          title: newTemplate.title,
          category: newTemplate.category,
          template: newTemplate.template,
          description: newTemplate.description,
          createdAt: new Date().toISOString(),
        });
      }

      setIsCreatingNew(false);
    }

    setCustomTitle('');
    setCustomText('');
    setCustomDescription('');
  };

  const handleDeleteTemplate = async (id: string) => {
    const tmpl = templates.find((t) => t.id === id);
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplatesToStorage(updated);

    if (user && tmpl?.isCustom) {
      await deleteCustomTemplate(user.uid, id);
    }
  };

  const handleResetToDefaults = () => {
    setIsResetConfirmOpen(true);
  };

  const executeResetToDefaults = () => {
    setTemplates(INITIAL_REPLY_TEMPLATES);
    saveTemplatesToStorage(INITIAL_REPLY_TEMPLATES);
    setIsResetConfirmOpen(false);
  };

  const openEditModal = (tmpl: ReplyTemplate) => {
    setModalError(null);
    setEditingTemplate(tmpl);
    setCustomTitle(tmpl.title);
    setCustomCategory(tmpl.category);
    setCustomText(tmpl.template);
    setCustomDescription(tmpl.description);
    setIsCreatingNew(false);
  };

  const openCreateModal = () => {
    setModalError(null);
    setEditingTemplate(null);
    setCustomTitle('');
    setCustomCategory('product');
    setCustomText('');
    setCustomDescription('');
    setIsCreatingNew(true);
  };

  const aiUsageCount = dailyUsage?.adCount || 0;
  const isAiLimitReached = aiUsageCount >= currentPlan.dailyAdLimit;

  const handleGenerateAiReplies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiCustomerMessage.trim()) return;

    if (!user) {
      setAiError("Gemini AI javoblarini yaratish uchun Google orqali tizimga kiring.");
      return;
    }

    if (isAiLimitReached) {
      setAiError(
        `Bugun uchun belgilangan kunlik ${currentPlan.dailyAdLimit} ta AI so'rov limiti to'ldi (${currentPlan.name}). Yangi kvota ertaga Toshkent vaqti bilan 00:00 da yangilanadi.`
      );
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiStatusMessage(null);

    try {
      const response = await requestCustomerRepliesFromBackend(
        {
          customerMessage: aiCustomerMessage.trim(),
          tone: aiTone,
          shopName: variables.shopName || undefined,
          productName: variables.productName || undefined,
          price: variables.price || undefined,
          deliveryTime: variables.deliveryTime || undefined,
          cardNumber: variables.cardNumber || undefined,
          discount: variables.discount || undefined,
          additionalContext: aiContextNote.trim() || undefined,
          simulatedTier: isAdmin && simulatedTier !== 'admin' ? simulatedTier : undefined,
        },
        (msg) => setAiStatusMessage(msg)
      );

      if (response.error) {
        setAiError(response.error.message);
      } else if (response.data?.data?.replies) {
        setAiSuggestions(response.data.data.replies);
        setAiModelUsed(response.data.model || null);
        updateDailyUsageCount(response.data.adCount);
      }
    } catch (err: any) {
      setAiError(err?.message || "Server bilan bog'lanishda xatolik yuz berdi.");
    } finally {
      setAiLoading(false);
      setAiStatusMessage(null);
    }
  };

  const handleCopyAiReply = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAiIndex(idx);
      setTimeout(() => setCopiedAiIndex(null), 2200);
    } catch {
      // ignore
    }
  };

  const handleSaveAiReplyAsTemplate = async (idx: number, suggestion: CustomerReplySuggestion) => {
    if (customCount >= currentPlan.customTemplateLimit) {
      setAiError(
        `Shaxsiy shablonlar limiti (${currentPlan.customTemplateLimit} ta) to'lgan. Avval eski shablonni o'chiring yoki tarifni yangilang.`
      );
      return;
    }

    const newTemplate: ReplyTemplate = {
      id: `tpl-ai-${Date.now()}-${idx}`,
      title: suggestion.title,
      category: suggestion.category,
      description: 'Gemini AI yordamida yaratilgan shablon',
      template: suggestion.replyText,
      usageTip: suggestion.usageTip,
      isCustom: true,
    };

    const updated = [newTemplate, ...templates];
    setTemplates(updated);
    saveTemplatesToStorage(updated);

    if (user) {
      await saveCustomTemplate(user.uid, {
        id: newTemplate.id,
        title: newTemplate.title,
        category: newTemplate.category,
        template: newTemplate.template,
        description: newTemplate.description,
        createdAt: new Date().toISOString(),
      });
    }

    setSavedAiIndex(idx);
    setTimeout(() => setSavedAiIndex(null), 2500);
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchCat = activeCategory === 'all' || t.category === activeCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.template.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });
  }, [templates, activeCategory, searchQuery]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#112521]">
                Mijozlarga tayyor javoblar to'plami
              </h1>
              <span className="text-[11px] font-medium text-[#173B35] bg-[#F6F8F7] px-2.5 py-0.5 rounded-full border border-[#E0ECE8] flex items-center gap-1.5">
                <Database className="w-3 h-3 text-[#F5B85C]" />
                <span>Shaxsiy limit: {customCount} / {currentPlan.customTemplateLimit} ta ({currentPlan.name})</span>
              </span>
            </div>
            <p className="text-sm text-[#52796F] mt-1 max-w-2xl">
              Savollarga 1 daqiqada muloyim, aniq va sotuvga eltuvchi tayyor andozalar bilan javob bering. O'z ma'lumotlaringizni kiriting va bir tugma bilan nusxa oling.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefaults}
              className="px-3 py-2 text-xs font-medium text-[#52796F] hover:text-[#112521] bg-white border border-[#E0ECE8] rounded-xl transition-all btn-tactile flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C]"
              title="Dastlabki holatga qaytarish"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#173B35]" />
              <span>Tiklash</span>
            </button>

            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 text-xs font-semibold text-[#112521] bg-[#F5B85C] hover:bg-[#E5A749] border border-[#F5B85C]/50 rounded-xl transition-all btn-tactile flex items-center gap-1.5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C]"
            >
              <Plus className="w-4 h-4 text-[#112521]" />
              <span>Yangi shablon</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Quick Variables Toolbar */}
      <div className="bg-white border border-[#E0ECE8] rounded-2xl p-5 shadow-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E0ECE8] pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F5B85C] shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#112521]">
              Tezkor ma'lumotlar paneli (Barcha shablonlarga avtomatik joylanadi)
            </h3>
          </div>
          <span className="text-[11px] text-[#52796F]">
            Kiritilgan ma'lumotlar avtomatik saqlanadi
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#52796F] mb-1">
              Mahsulot nomi
            </label>
            <input
              type="text"
              value={variables.productName}
              onChange={(e) => handleVariableChange('productName', e.target.value)}
              placeholder="Klassik soat"
              className="w-full px-2.5 py-1.5 text-xs rounded-xl input-warm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#52796F] mb-1">
              Narxi (so'm)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={variables.price}
              onChange={(e) => handleVariableChange('price', e.target.value)}
              placeholder="240 000"
              className="w-full px-2.5 py-2 text-xs rounded-xl input-warm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#52796F] mb-1">
              Yetkazish muddati
            </label>
            <input
              type="text"
              value={variables.deliveryTime}
              onChange={(e) => handleVariableChange('deliveryTime', e.target.value)}
              placeholder="2-3 soat"
              className="w-full px-2.5 py-2 text-xs rounded-xl input-warm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#52796F] mb-1">
              Karta raqami
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={variables.cardNumber}
              onChange={(e) => handleVariableChange('cardNumber', e.target.value)}
              placeholder="8600 0000..."
              className="w-full px-2.5 py-2 text-xs rounded-xl input-warm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#52796F] mb-1">
              Do'kon / Mas'ul shaxs
            </label>
            <input
              type="text"
              value={variables.shopName}
              onChange={(e) => handleVariableChange('shopName', e.target.value)}
              placeholder="Savdo do'koni"
              className="w-full px-2.5 py-1.5 text-xs rounded-xl input-warm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#52796F] mb-1">
              Chegirma / Aksiya
            </label>
            <input
              type="text"
              value={variables.discount}
              onChange={(e) => handleVariableChange('discount', e.target.value)}
              placeholder="15% chegirma"
              className="w-full px-2.5 py-1.5 text-xs rounded-xl input-warm"
            />
          </div>
        </div>
      </div>

      {/* Gemini AI Customer Reply Assistant */}
      <div className="bg-white border border-[#E0ECE8] rounded-2xl p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E0ECE8] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F5B85C]" />
              <h2 className="text-sm sm:text-base font-bold text-[#112521]">
                Mijoz xabariga Gemini AI javobi
              </h2>
              {aiModelUsed && (
                <span className="text-[10px] font-semibold text-[#173B35] bg-[#D7F0E5] px-2 py-0.5 rounded-md border border-[#E0ECE8]">
                  {aiModelUsed}
                </span>
              )}
            </div>
            <p className="text-xs text-[#52796F] mt-0.5">
              Mijoz yozgan savol yoki e'tirozni kiriting — tizim yuqoridagi tezkor ma'lumotlaringiz asosida 3 ta professional javob variantini tuzib beradi.
            </p>
          </div>

          <span className="text-[11px] font-medium text-[#173B35] bg-[#F6F8F7] px-3 py-1 rounded-xl border border-[#E0ECE8]">
            Kunlik AI sarf: <strong className="text-[#112521] font-mono">{aiUsageCount} / {currentPlan.dailyAdLimit}</strong>
          </span>
        </div>

        <form onSubmit={handleGenerateAiReplies} className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-8">
              <label className="block text-xs font-semibold text-[#112521] mb-1">
                Mijoz xabari / savoli <span className="text-[#A64B3D]">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={aiCustomerMessage}
                onChange={(e) => {
                  setAiCustomerMessage(e.target.value);
                  if (aiError) setAiError(null);
                }}
                placeholder="Masalan: Assalomu alaykum, bu soatning narxi biroz qimmat emasmi? Andijonga necha kunda yetib boradi?"
                className="w-full p-3 text-xs rounded-xl input-warm leading-relaxed"
              />
            </div>

            <div className="lg:col-span-4 space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-[#112521] mb-1">
                  Javob ohangi
                </label>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value as CustomerReplyTone)}
                  className="w-full px-3 py-2 text-xs rounded-xl input-warm bg-white"
                >
                  <option value="friendly">Samimiy va do'stona</option>
                  <option value="formal">Rasmiy va hurmatli</option>
                  <option value="persuasive">Sotuvga undovchi (Ishontiruvchi)</option>
                  <option value="empathetic">Tushunuvchi (E'tiroz/uzr uchun)</option>
                </select>
              </div>
              <div>
                <input
                  type="text"
                  value={aiContextNote}
                  onChange={(e) => setAiContextNote(e.target.value)}
                  placeholder="Qo'shimcha izoh (ixtiyoriy, masalan: faqat bugun bepul yetkazish)"
                  className="w-full px-3 py-1.5 text-xs rounded-xl input-warm"
                />
              </div>
            </div>
          </div>

          {aiStatusMessage && (
            <div className="p-2.5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#173B35] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5B85C] shrink-0" />
              <span>{aiStatusMessage}</span>
            </div>
          )}

          {aiError && (
            <div className="p-3 bg-[#FDF4F4] border border-rose-200 rounded-xl text-xs text-[#9E2A2B] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#9E2A2B] shrink-0 mt-0.5" />
                <span><strong>Xatolik:</strong> {aiError}</span>
              </div>
              {!user && (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="px-3 py-1.5 rounded-lg bg-[#F5B85C] hover:bg-[#E5A749] text-[#112521] font-semibold text-xs inline-flex items-center gap-1.5 btn-tactile"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Kirish</span>
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-[#52796F]">
              Yuqoridagi mahsulot, narx va yetkazish maydonlari AI javobiga kontekst sifatida yuboriladi.
            </span>
            <button
              type="submit"
              disabled={aiLoading || !aiCustomerMessage.trim() || !user || isAiLimitReached}
              className="px-4 py-2 text-xs font-semibold text-[#112521] bg-[#F5B85C] hover:bg-[#E5A749] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all btn-tactile inline-flex items-center gap-1.5 shadow-xs"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#112521]" />
                  <span>AI javoblar tuzilmoqda...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#112521]" />
                  <span>Gemini AI bilan javob yaratish</span>
                </>
              )}
            </button>
          </div>
        </form>

        {aiSuggestions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#E0ECE8]">
            {aiSuggestions.map((sug, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#F6F8F7] border border-[#E0ECE8] flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#173B35] bg-[#D7F0E5] px-2 py-0.5 rounded-md">
                      {CATEGORY_LABELS[sug.category] || sug.category}
                    </span>
                    <span className="text-[10px] font-semibold text-[#52796F]">Variant #{idx + 1}</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#112521]">{sug.title}</h4>
                  <div className="p-3 bg-white border border-[#E0ECE8] rounded-xl text-xs text-[#112521] whitespace-pre-wrap leading-relaxed">
                    {sug.replyText}
                  </div>
                  <p className="text-[11px] text-[#52796F] italic">{sug.usageTip}</p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E0ECE8]">
                  <button
                    type="button"
                    onClick={() => handleSaveAiReplyAsTemplate(idx, sug)}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-[#112521] bg-white hover:bg-[#E0ECE8] border border-[#E0ECE8] rounded-lg transition-all flex items-center gap-1 btn-tactile"
                  >
                    {savedAiIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Saqlandi</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3 h-3 text-[#173B35]" />
                        <span>Shablonga saqlash</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyAiReply(idx, sug.replyText)}
                    className="px-3 py-1.5 text-[11px] font-semibold text-[#112521] bg-[#F5B85C] hover:bg-[#E5A749] rounded-lg transition-all flex items-center gap-1 btn-tactile"
                  >
                    {copiedAiIndex === idx ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Nusxalandi!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Nusxa olish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(Object.keys(CATEGORY_LABELS) as ReplyCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C] ${
                activeCategory === cat
                  ? 'bg-[#112521] text-[#F6F8F7] border border-[#173B35] font-semibold shadow-xs'
                  : 'bg-white hover:bg-[#F6F8F7] text-[#52796F] hover:text-[#112521] border border-[#E0ECE8]'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#52796F] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Shablonlardan qidirish..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl input-warm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#52796F] hover:text-[#112521] btn-tactile"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Templates List Cards */}
      {filteredTemplates.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E0ECE8] rounded-2xl shadow-card">
          <MessageSquare className="w-8 h-8 text-[#52796F] mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#112521]">Shablon topilmadi</h3>
          <p className="text-xs text-[#52796F] mt-1">
            Qidiruv so'zini o'zgartirib ko'ring yoki yangi shablon qo'shing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTemplates.map((template) => {
            const populated = formatTemplateText(template.template);
            const isCopied = copiedId === template.id;

            return (
              <div
                key={template.id}
                className="bg-white border border-[#E0ECE8] hover:border-[#F5B85C] rounded-2xl p-5 shadow-card card-elevation flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[11px] font-semibold text-[#173B35] uppercase tracking-wider block mb-1">
                        {CATEGORY_LABELS[template.category] || template.category}
                      </span>
                      <h3 className="text-sm font-bold text-[#112521]">
                        {template.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(template)}
                        className="p-1.5 text-[#52796F] hover:text-[#112521] hover:bg-[#F6F8F7] rounded-lg transition-colors btn-tactile"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {template.isCustom && (
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1.5 text-[#52796F] hover:text-[#9E2A2B] hover:bg-[#FDF4F4] rounded-lg transition-colors btn-tactile"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#52796F] mb-3 leading-relaxed">
                    {template.description}
                  </p>

                  {/* Populated Text preview */}
                  <div className="p-3.5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#112521] font-sans whitespace-pre-wrap leading-relaxed select-all">
                    {populated}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E0ECE8] flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#52796F] italic truncate">
                    {template.usageTip}
                  </span>

                  <button
                    onClick={() => handleCopy(template.id, template.template)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#112521] bg-[#F5B85C] hover:bg-[#E5A749] border border-[#F5B85C]/50 rounded-xl transition-all btn-tactile flex items-center gap-1.5 shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C]"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#112521]" />
                        <span>Nusxalandi!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#112521]" />
                        <span>Nusxa olish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Modal */}
      {(editingTemplate || isCreatingNew) && (
        <div
          className="fixed inset-0 z-50 bg-[#251A14]/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingTemplate(null);
              setIsCreatingNew(false);
            }
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-modal border border-[#E0ECE8] animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between border-b border-[#E0ECE8] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#112521]">
                {isCreatingNew ? 'Yangi javob shabloni yaratish' : 'Shablonni tahrirlash'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(null);
                  setIsCreatingNew(false);
                }}
                className="text-[#52796F] hover:text-[#112521] p-1.5 rounded-lg btn-tactile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#112521] mb-1">
                  Shablon sarlavhasi
                </label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Masalan: Maxsus kafolat haqida javob"
                  className="w-full px-3 py-2 text-xs rounded-xl input-warm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#112521] mb-1">
                  Kategoriya
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl input-warm bg-white"
                >
                  <option value="product">Mahsulot haqida</option>
                  <option value="price">Narx so'rovlari</option>
                  <option value="delivery">Yetkazib berish</option>
                  <option value="payment">To'lov rekviziti</option>
                  <option value="followup">Qayta aloqa (Follow-up)</option>
                  <option value="complaint">E'tiroz va uzr</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#112521] mb-1">
                  Shablon matni (O'zgaruvchilar: {'{productName}'}, {'{price}'}, {'{deliveryTime}'}, {'{cardNumber}'})
                </label>
                <textarea
                  required
                  rows={6}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Assalomu alaykum! {productName} narxi {price} so'm..."
                  className="w-full p-3 text-xs rounded-xl input-warm leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#112521] mb-1">
                  Qisqa izoh / Foydalanish bo'yicha maslahat
                </label>
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Mijozlar ikkilanganda yuborish tavsiya etiladi"
                  className="w-full px-3 py-2 text-xs rounded-xl input-warm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E0ECE8]">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsCreatingNew(false);
                  }}
                  className="min-h-[44px] px-4 py-2 text-xs font-medium text-[#52796F] hover:bg-[#F6F8F7] rounded-xl transition-colors btn-tactile"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 text-xs font-semibold text-white bg-[#112521] hover:bg-[#173B35] rounded-xl transition-all btn-tactile"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset to Defaults Confirmation Modal */}
      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#251A14]/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsResetConfirmOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-[#E0ECE8] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#112521]">Shablonlarni tiklash</h3>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="p-1.5 rounded-lg text-[#52796F] hover:text-[#112521]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-[#52796F] leading-relaxed">
              Barcha shablonlarni dastlabki holatga qaytarmoqchimisiz? Tahrirlangan mahalliy andozalar asl holatiga qaytadi.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="min-h-[44px] px-4 py-2 text-xs font-medium text-[#52796F] border border-[#E0ECE8] hover:bg-[#F6F8F7] rounded-xl transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={executeResetToDefaults}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#112521] hover:bg-[#173B35] rounded-xl transition-colors"
              >
                Tiklash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
