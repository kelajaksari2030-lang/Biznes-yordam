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
  Database
} from 'lucide-react';
import { ReplyTemplate, ReplyCategory, QuickVariables } from '../types';
import { INITIAL_REPLY_TEMPLATES, CATEGORY_LABELS } from '../data/replyTemplates';
import { useAuth } from '../context/AuthContext';
import { getUserCustomTemplates, saveCustomTemplate, deleteCustomTemplate } from '../services/firestore';

export const CustomerReplies: React.FC = () => {
  const { user, currentPlan } = useAuth();

  // Saved templates in localStorage or default
  const [templates, setTemplates] = useState<ReplyTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('biznes_reply_templates');
      return stored ? JSON.parse(stored) : INITIAL_REPLY_TEMPLATES;
    } catch {
      return INITIAL_REPLY_TEMPLATES;
    }
  });

  // Global quick variables that populate all templates
  const [variables, setVariables] = useState<QuickVariables>(() => {
    try {
      const stored = localStorage.getItem('biznes_quick_variables');
      return stored
        ? JSON.parse(stored)
        : {
            productName: 'Klassik soat',
            price: '240 000',
            deliveryTime: '2-3 soat',
            cardNumber: '8600 1234 5678 9012',
            discount: '15% bayram aksiyasi',
            shopName: 'Premium Savdo',
            phoneNumber: '+998 (90) 123-45-67',
          };
    } catch {
      return {
        productName: 'Klassik soat',
        price: '240 000',
        deliveryTime: '2-3 soat',
        cardNumber: '8600 1234 5678 9012',
        discount: '15% bayram aksiyasi',
        shopName: 'Premium Savdo',
        phoneNumber: '+998 (90) 123-45-67',
      };
    }
  });

  const [activeCategory, setActiveCategory] = useState<ReplyCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit / Add Modal State
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState<'product' | 'price' | 'delivery' | 'payment' | 'followup' | 'complaint'>('product');
  const [customText, setCustomText] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  const saveTemplatesToStorage = (data: ReplyTemplate[]) => {
    try {
      localStorage.setItem('biznes_reply_templates', JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  const customCount = useMemo(() => {
    return templates.filter((t) => t.isCustom).length;
  }, [templates]);

  // Synchronize custom templates from Firestore
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    getUserCustomTemplates(user.uid)
      .then((docs) => {
        if (isMounted && docs.length > 0) {
          const customMapped: ReplyTemplate[] = docs.map((d) => ({
            id: d.id,
            category: (d.category as any) || 'product',
            title: d.title,
            description: d.description || 'Shaxsiy shablon',
            template: d.template,
            usageTip: 'Sizning shaxsiy shabloningiz',
            isCustom: true,
          }));
          const builtins = INITIAL_REPLY_TEMPLATES;
          setTemplates([...customMapped, ...builtins]);
          saveTemplatesToStorage([...customMapped, ...builtins]);
        }
      })
      .catch((err) => {
        console.warn('Could not load custom templates from Firestore:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Update variables and save
  const handleVariableChange = (key: keyof QuickVariables, val: string) => {
    const updated = { ...variables, [key]: val };
    setVariables(updated);
    try {
      localStorage.setItem('biznes_quick_variables', JSON.stringify(updated));
    } catch {
      // ignore
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
        alert(`Sizning joriy ${currentPlan.name} tarifingizda shaxsiy shablonlar limiti (${currentPlan.customTemplateLimit} ta) to'lgan.`);
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
    if (window.confirm("Barcha shablonlarni dastlabki holatga qaytarmoqchimisiz?")) {
      setTemplates(INITIAL_REPLY_TEMPLATES);
      saveTemplatesToStorage(INITIAL_REPLY_TEMPLATES);
    }
  };

  const openEditModal = (tmpl: ReplyTemplate) => {
    setEditingTemplate(tmpl);
    setCustomTitle(tmpl.title);
    setCustomCategory(tmpl.category);
    setCustomText(tmpl.template);
    setCustomDescription(tmpl.description);
    setIsCreatingNew(false);
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setCustomTitle('');
    setCustomCategory('product');
    setCustomText('');
    setCustomDescription('');
    setIsCreatingNew(true);
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#493329]">
                Mijozlarga tayyor javoblar to'plami
              </h1>
              <span className="text-[11px] font-medium text-[#795640] bg-[#FAF6F0] px-2.5 py-0.5 rounded-full border border-[#E6DCD1] flex items-center gap-1.5">
                <Database className="w-3 h-3 text-[#D0AE70]" />
                <span>Shaxsiy limit: {customCount} / {currentPlan.customTemplateLimit} ta ({currentPlan.name})</span>
              </span>
            </div>
            <p className="text-sm text-[#6B5549] mt-1 max-w-2xl">
              Savollarga 1 daqiqada muloyim, aniq va sotuvga eltuvchi tayyor andozalar bilan javob bering. O'z ma'lumotlaringizni kiriting va bir tugma bilan nusxa oling.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefaults}
              className="px-3 py-2 text-xs font-medium text-[#6B5549] hover:text-[#493329] bg-white border border-[#E6DCD1] rounded-xl transition-all btn-tactile flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
              title="Dastlabki holatga qaytarish"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#795640]" />
              <span>Tiklash</span>
            </button>

            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 text-xs font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl transition-all btn-tactile flex items-center gap-1.5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
            >
              <Plus className="w-4 h-4 text-[#34221A]" />
              <span>Yangi shablon</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Quick Variables Toolbar */}
      <div className="bg-white border border-[#E6DCD1] rounded-2xl p-5 shadow-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE8DE] pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D0AE70] shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#493329]">
              Tezkor ma'lumotlar paneli (Barcha shablonlarga avtomatik joylanadi)
            </h3>
          </div>
          <span className="text-[11px] text-[#8D786D]">
            Kiritilgan ma'lumotlar avtomatik saqlanadi
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#6B5549] mb-1">
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
            <label className="block text-[11px] font-medium text-[#6B5549] mb-1">
              Narxi (so'm)
            </label>
            <input
              type="text"
              value={variables.price}
              onChange={(e) => handleVariableChange('price', e.target.value)}
              placeholder="240 000"
              className="w-full px-2.5 py-1.5 text-xs rounded-xl input-warm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#6B5549] mb-1">
              Yetkazish muddati
            </label>
            <input
              type="text"
              value={variables.deliveryTime}
              onChange={(e) => handleVariableChange('deliveryTime', e.target.value)}
              placeholder="2-3 soat"
              className="w-full px-2.5 py-1.5 text-xs rounded-xl input-warm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#6B5549] mb-1">
              Karta raqami
            </label>
            <input
              type="text"
              value={variables.cardNumber}
              onChange={(e) => handleVariableChange('cardNumber', e.target.value)}
              placeholder="8600 0000..."
              className="w-full px-2.5 py-1.5 text-xs rounded-xl input-warm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#6B5549] mb-1">
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
            <label className="block text-[11px] font-medium text-[#6B5549] mb-1">
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(Object.keys(CATEGORY_LABELS) as ReplyCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70] ${
                activeCategory === cat
                  ? 'bg-[#493329] text-[#FAF6F0] border border-[#3B2921] font-semibold shadow-xs'
                  : 'bg-white hover:bg-[#FAF6F0] text-[#6B5549] hover:text-[#493329] border border-[#E6DCD1]'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#8D786D] absolute left-3 top-1/2 -translate-y-1/2" />
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8D786D] hover:text-[#493329] btn-tactile"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Templates List Cards */}
      {filteredTemplates.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E6DCD1] rounded-2xl shadow-card">
          <MessageSquare className="w-8 h-8 text-[#8D786D] mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#493329]">Shablon topilmadi</h3>
          <p className="text-xs text-[#6B5549] mt-1">
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
                className="bg-white border border-[#E6DCD1] hover:border-[#D0AE70] rounded-2xl p-5 shadow-card card-elevation flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[11px] font-semibold text-[#795640] uppercase tracking-wider block mb-1">
                        {CATEGORY_LABELS[template.category] || template.category}
                      </span>
                      <h3 className="text-sm font-bold text-[#493329]">
                        {template.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(template)}
                        className="p-1.5 text-[#8D786D] hover:text-[#493329] hover:bg-[#FAF6F0] rounded-lg transition-colors btn-tactile"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {template.isCustom && (
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1.5 text-[#8D786D] hover:text-[#9E2A2B] hover:bg-[#FDF4F4] rounded-lg transition-colors btn-tactile"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#6B5549] mb-3 leading-relaxed">
                    {template.description}
                  </p>

                  {/* Populated Text preview */}
                  <div className="p-3.5 bg-[#FAF6F0] border border-[#EFE8DE] rounded-xl text-xs text-[#34221A] font-sans whitespace-pre-wrap leading-relaxed select-all">
                    {populated}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#EFE8DE] flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#8D786D] italic truncate">
                    {template.usageTip}
                  </span>

                  <button
                    onClick={() => handleCopy(template.id, template.template)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#34221A] bg-[#D0AE70] hover:bg-[#C39F60] border border-[#BF9E60]/50 rounded-xl transition-all btn-tactile flex items-center gap-1.5 shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0AE70]"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#34221A]" />
                        <span>Nusxalandi!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#34221A]" />
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
        <div className="fixed inset-0 z-50 bg-[#251A14]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-modal border border-[#E6DCD1] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#EFE8DE] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#493329]">
                {isCreatingNew ? 'Yangi javob shabloni yaratish' : 'Shablonni tahrirlash'}
              </h3>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setIsCreatingNew(false);
                }}
                className="text-[#8D786D] hover:text-[#493329] p-1 rounded-lg btn-tactile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#493329] mb-1">
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
                <label className="block text-xs font-semibold text-[#493329] mb-1">
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
                <label className="block text-xs font-semibold text-[#493329] mb-1">
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
                <label className="block text-xs font-semibold text-[#493329] mb-1">
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EFE8DE]">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-[#6B5549] hover:bg-[#FAF6F0] rounded-xl transition-colors btn-tactile"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#493329] hover:bg-[#3B2921] rounded-xl transition-all btn-tactile"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
