import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  Send, 
  Instagram, 
  Sparkles, 
  Loader2,
  Bookmark, 
  Trash2, 
  AlertTriangle,
  AlertCircle,
  Info,
  Database,
  LogIn
} from 'lucide-react';
import { AdFormData, AdDraft, PlatformType, ToneType, AdStyleVariant } from '../types';
import { useAuth } from '../context/AuthContext';
import { getUserAdDrafts, saveAdDraft, deleteAdDraft } from '../services/firestore';
import { requestAdGenerationFromBackend } from '../services/adBackendService';
import { generateAdText } from '../data/adTemplates';
import { emitError } from '../utils/errorBus';
import { OperationType } from '../services/firebase';
import { readScopedCache, writeScopedCache } from '../utils/userCache';

const AUDIENCE_SUGGESTIONS = [
  'Barcha qiziquvchilar',
  'Ayollar va onalar',
  'Erkaklar va yoshlar',
  'Talabalar va o\'quvchilar',
  'Do\'kon va biznes egalari',
  'Oila a\'zolari',
];

const BENEFIT_SUGGESTIONS = [
  'O\'zbekiston bo\'ylab tezkor yetkazib berish',
  '1 yillik rasmiy kafolat',
  '100% asl va sifatli mahsulot',
  'Bozordagi eng hamyonbop narx',
  'Mahsulotni olgandan so\'ng to\'lov',
  'Qulay va oson ishlatish',
];

export const AdGenerator: React.FC = () => {
  const { user, currentPlan, dailyUsage, updateDailyUsageCount, signInWithGoogle, simulatedTier, isAdmin } = useAuth();

  const [formData, setFormData] = useState<AdFormData>({
    productName: 'Erkaklar klassik soati',
    targetAudience: 'Erkaklar va yoshlar',
    keyBenefits: 'O\'zbekiston bo\'ylab tezkor yetkazib berish\n1 yillik rasmiy kafolat\n100% suv o\'tkazmaydigan po\'lat korpus',
    platform: 'telegram',
    tone: 'friendly',
    variant: 'classic',
    specialOffer: 'Bugun buyurtma berganlarga 20% chegirma va sovg\'a qutisi!',
    contactInfo: '📞 Telefon: +998 (90) 123-45-67\n📩 Admin: @menejer_savdo',
  });

  const [generatedDraft, setGeneratedDraft] = useState<string>('');
  const [hasGenerated, setHasGenerated] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [canUseLocalFallback, setCanUseLocalFallback] = useState(false);
  const [generationSource, setGenerationSource] = useState<'gemini' | 'functions' | 'local_fallback' | null>(null);
  const [generationModel, setGenerationModel] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [savedDrafts, setSavedDrafts] = useState<AdDraft[]>(() => {
    return readScopedCache<AdDraft[]>('saved_drafts', user?.uid) || [];
  });

  // Check for presets (e.g. from Mahsulot tavsifi or Ijtimoiy tarmoq postlari cards)
  useEffect(() => {
    try {
      const preset = sessionStorage.getItem('ad_generator_preset');
      if (preset === 'product_desc') {
        setFormData((prev) => ({
          ...prev,
          variant: 'classic',
          productName: "Premium charm poyabzal",
          targetAudience: "Sifat va qulaylikni qadrlaydiganlar",
          keyBenefits: "100% tabiiy buzoq terisi\nOrtopedik yumshoq taglik\n1 yillik rasmiy kafolat",
          specialOffer: "Birinchi xarid uchun maxsus parvarish vositasi sovg'a!",
        }));
        sessionStorage.removeItem('ad_generator_preset');
      } else if (preset === 'social_post') {
        setFormData((prev) => ({
          ...prev,
          platform: 'instagram',
          variant: 'social_proof',
          productName: "Erkaklar qishki kurtkasi",
          targetAudience: "Erkaklar va yoshlar",
          keyBenefits: "Suv va sovuq o'tkazmaydigan membrana\n-25°C gacha issiq saqlaydi\n1,200 dan ortiq mamnun mijozlar bahosi",
          specialOffer: "Stories orqali buyurtma berganlarga bepul yetkazib berish!",
        }));
        sessionStorage.removeItem('ad_generator_preset');
      }
    } catch {
      // Ignore
    }
  }, []);

  // Synchronize drafts from Firestore on login
  useEffect(() => {
    if (!user) {
      setSavedDrafts([]);
      return;
    }

    const cached = readScopedCache<AdDraft[]>('saved_drafts', user.uid);
    if (cached) {
      setSavedDrafts(cached);
    }

    let isMounted = true;
    getUserAdDrafts(user.uid)
      .then((docs) => {
        if (isMounted) {
          const mapped: AdDraft[] = docs.map((d) => ({
            id: d.id,
            title: d.title,
            productName: d.productName,
            platform: d.platform,
            content: d.content,
            createdAt: d.createdAt,
          }));
          setSavedDrafts(mapped);
          writeScopedCache('saved_drafts', user.uid, mapped);
        }
      })
      .catch((err) => {
        console.warn('Could not load drafts from Firestore, using local cache:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const handleInputChange = (field: keyof AdFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear previous error on input change
    if (generationError) {
      setGenerationError(null);
    }
  };

  const handleAddBenefit = (benefit: string) => {
    const current = formData.keyBenefits.trim();
    if (current.includes(benefit)) return;
    const updated = current ? `${current}\n${benefit}` : benefit;
    handleInputChange('keyBenefits', updated);
  };

  const adCount = dailyUsage?.adCount || 0;
  const isLimitReached = adCount >= currentPlan.dailyAdLimit;

  // Authoritative server-side ad generation invocation
  const handleGenerateAd = async () => {
    if (!user) {
      setGenerationError("Reklama matnini yaratish uchun avval Google orqali tizimga kiring.");
      return;
    }

    if (isLimitReached) {
      setGenerationError(
        `Bugun uchun belgilangan kunlik ${currentPlan.dailyAdLimit} ta reklama limiti to'ldi (${currentPlan.name}). Yangi kvota ertaga Toshkent vaqti bilan 00:00 da beriladi.`
      );
      return;
    }

    setStatusMessage(null);
    setGenerationError(null);
    setCanUseLocalFallback(false);
    setIsGenerating(true);

    try {
      const payload = {
        ...formData,
        simulatedTier: isAdmin && simulatedTier !== 'admin' ? simulatedTier : undefined,
      };
      const result = await requestAdGenerationFromBackend(payload, (msg) => {
        setStatusMessage(msg);
      });

      if (result.error) {
        setGenerationError(result.error.message);
        const fallbackEligible = [
          'gemini_not_configured',
          'service_unavailable',
          'gemini_timeout',
          'gemini_upstream_error',
          'gemini_invalid_response',
        ].includes(result.error.code);
        setCanUseLocalFallback(fallbackEligible);
        emitError({
          error: `Backend Error (${result.error.code}): ${result.error.message}`,
          operationType: OperationType.WRITE,
          path: '/api/generate-ad',
          authInfo: { userId: user?.uid },
        });
      } else if (result.data) {
        setGeneratedDraft(result.data.adText);
        setHasGenerated(true);
        setGenerationSource(result.data.source || 'gemini');
        setGenerationModel(result.data.model || null);
        updateDailyUsageCount(result.data.adCount);
        setGenerationSuccess(true);
        setTimeout(() => setGenerationSuccess(false), 3000);
      }
    } catch (err: any) {
      setGenerationError(err?.message || "Server bilan bog'lanishda xatolik yuz berdi.");
      setCanUseLocalFallback(true);
    } finally {
      setIsGenerating(false);
      setStatusMessage(null);
    }
  };

  const handleUseLocalFallback = () => {
    if (!formData.productName.trim()) {
      setGenerationError("Mahsulot yoki xizmat nomi ko'rsatilishi shart.");
      return;
    }
    const fallbackText = generateAdText(formData);
    setGeneratedDraft(fallbackText);
    setHasGenerated(true);
    setGenerationSource('local_fallback');
    setGenerationModel(null);
    setGenerationError(null);
    setCanUseLocalFallback(false);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatedDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSaveDraft = async () => {
    const newDraft: AdDraft = {
      id: Date.now().toString(),
      title: `${formData.productName || 'Mahsulot'} (${formData.platform === 'telegram' ? 'Telegram' : 'Instagram'})`,
      productName: formData.productName,
      platform: formData.platform,
      content: generatedDraft,
      createdAt: new Date().toLocaleDateString('uz-UZ'),
    };

    const updated = [newDraft, ...savedDrafts];
    setSavedDrafts(updated);

    // Save to Firestore under user UID (does not consume generation quota)
    if (user) {
      await saveAdDraft(user.uid, newDraft);
      writeScopedCache('saved_drafts', user.uid, updated);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDeleteDraft = async (id: string) => {
    const updated = savedDrafts.filter((d) => d.id !== id);
    setSavedDrafts(updated);

    if (user) {
      await deleteAdDraft(user.uid, id);
      writeScopedCache('saved_drafts', user.uid, updated);
    }
  };

  const handleRestoreDraft = (draft: AdDraft) => {
    setGeneratedDraft(draft.content);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header with Plan Limit indicator */}
      <div 
        className="scroll-reveal flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#112521]">
            Reklama matnlari yaratuvchisi
          </h1>
          <p className="text-sm text-[#52796F] mt-1 max-w-2xl">
            Mahsulot yoki xizmat ma'lumotlarini kiriting, tizim sizga Telegram va Instagram uchun tayyor sotuvchi reklama qoralamasini server orqali tuzib beradi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto bg-white border border-[#E0ECE8] px-3.5 py-1.5 rounded-xl shadow-xs">
          <Database className="w-4 h-4 text-[#F5B85C]" />
          <span className="text-xs text-[#52796F]">
            Kunlik sarf: <strong className="text-[#112521] font-mono">{adCount} / {currentPlan.dailyAdLimit}</strong> ({currentPlan.name})
          </span>
        </div>
      </div>

      {/* Unauthenticated Alert Prompt */}
      {!user && (
        <div 
          className="scroll-reveal p-4 bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ '--reveal-delay': '40ms' } as React.CSSProperties}
        >
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-[#F5B85C] shrink-0" />
            <div className="text-xs sm:text-sm text-[#52796F]">
              <strong className="text-[#112521]">Tizimga kirmagansiz:</strong> Yangi reklama matnlarini server orqali generatsiya qilish uchun Google orqali kiring (Bepul tarifda kuniga 5 ta bepul matn beriladi).
            </div>
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="px-4 py-2 bg-[#F5B85C] hover:bg-[#E5A749] text-[#112521] text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 transition-all btn-tactile"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Kirish</span>
          </button>
        </div>
      )}

      {/* Daily limit advisory notice if reached */}
      {isLimitReached && (
        <div 
          className="scroll-reveal p-3.5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl text-xs text-[#52796F] flex items-start gap-2.5"
          style={{ '--reveal-delay': '40ms' } as React.CSSProperties}
        >
          <Info className="w-4 h-4 text-[#F5B85C] shrink-0 mt-0.5" />
          <div>
            <strong>Kunlik limit ko'rsatkichi:</strong> Bugun uchun belgilangan {currentPlan.dailyAdLimit} ta reklama yaratish ko'rsatkichiga yetdingiz ({currentPlan.name}). Yangi kvota ertaga Toshkent vaqti bilan 00:00 da beriladi.
          </div>
        </div>
      )}

      {/* Main Grid: Form on Left, Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Inputs (6 cols) */}
        <div 
          className="scroll-reveal lg:col-span-6 bg-white border border-[#E0ECE8] rounded-2xl p-5 sm:p-6 shadow-card space-y-5"
          style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
        >
          <h2 className="text-base font-semibold text-[#112521] border-b border-[#E0ECE8] pb-3">
            Reklama parametrlari
          </h2>

          {/* Platform selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#112521]">
              Qaysi platforma uchun yaratmoqchisiz?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleInputChange('platform', 'telegram')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C] ${
                  formData.platform === 'telegram'
                    ? 'border-[#173B35] bg-[#F6F8F7] text-[#112521] ring-1 ring-[#173B35]'
                    : 'border-[#E0ECE8] bg-white text-[#52796F] hover:bg-[#F6F8F7]'
                }`}
              >
                <Send className="w-4 h-4 text-sky-500" />
                <span>Telegram kanal/guruh</span>
              </button>

              <button
                type="button"
                onClick={() => handleInputChange('platform', 'instagram')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C] ${
                  formData.platform === 'instagram'
                    ? 'border-[#173B35] bg-[#F6F8F7] text-[#112521] ring-1 ring-[#173B35]'
                    : 'border-[#E0ECE8] bg-white text-[#52796F] hover:bg-[#F6F8F7]'
                }`}
              >
                <Instagram className="w-4 h-4 text-pink-600" />
                <span>Instagram post/reels</span>
              </button>
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#112521]">
              Mahsulot yoki xizmat nomi <span className="text-[#F5B85C]">*</span>
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => handleInputChange('productName', e.target.value)}
              placeholder="Masalan: Erkaklar charm sumkasi yoki Ingliz tili kursi"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl input-warm"
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#112521]">
              Maqsadli auditoriya (Mijoz kim?)
            </label>
            <input
              type="text"
              value={formData.targetAudience}
              onChange={(e) => handleInputChange('targetAudience', e.target.value)}
              placeholder="Masalan: Ayollar, yosh onalar, talabalar"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl input-warm"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {AUDIENCE_SUGGESTIONS.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => handleInputChange('targetAudience', item)}
                  className="px-2.5 py-1 text-[11px] bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] text-[#52796F] hover:text-[#112521] rounded-lg transition-all btn-tactile"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Key Benefits */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#112521]">
              Asosiy afzalliklari (Har bir qatorga bittadan)
            </label>
            <textarea
              rows={3}
              value={formData.keyBenefits}
              onChange={(e) => handleInputChange('keyBenefits', e.target.value)}
              placeholder="Masalan:&#10;Bepul yetkazib berish&#10;Kafolatlangan sifat&#10;Hamyonbop narx"
              className="w-full px-3.5 py-2 text-sm rounded-xl input-warm"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {BENEFIT_SUGGESTIONS.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => handleAddBenefit(b)}
                  className="px-2.5 py-1 text-[11px] bg-[#F6F8F7] hover:bg-[#D7F0E5] hover:text-[#173B35] border border-[#E0ECE8] text-[#52796F] rounded-lg transition-all btn-tactile"
                >
                  + {b}
                </button>
              ))}
            </div>
          </div>

          {/* Variant Style & Tone in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ad Format Variant */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#112521]">
                Matn uslubi (Formati)
              </label>
              <select
                value={formData.variant}
                onChange={(e) => handleInputChange('variant', e.target.value as AdStyleVariant)}
                className="w-full px-3 py-2 text-xs rounded-xl input-warm bg-white"
              >
                <option value="classic">Klassik sotuvchi matn</option>
                <option value="discount">Aksiya va chegirma</option>
                <option value="problem_solution">Muammo va yechim</option>
                <option value="social_proof">Xaridorlar tanlovi</option>
              </select>
            </div>

            {/* Tone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#112521]">
                Murojaat ohangi
              </label>
              <select
                value={formData.tone}
                onChange={(e) => handleInputChange('tone', e.target.value as ToneType)}
                className="w-full px-3 py-2 text-xs rounded-xl input-warm bg-white"
              >
                <option value="friendly">Samimiy va do'stona</option>
                <option value="formal">Rasmiy va ishonchli</option>
                <option value="short">Qisqa va londa</option>
                <option value="urgent">Shoshilinch / Talabgor</option>
              </select>
            </div>
          </div>

          {/* Special offer / Discount */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#112521]">
              Maxsus taklif yoki chegirma (ixtiyoriy)
            </label>
            <input
              type="text"
              value={formData.specialOffer}
              onChange={(e) => handleInputChange('specialOffer', e.target.value)}
              placeholder="Masalan: Faqat 3 kun 25% chegirma yoki 1+1 aksiyasi"
              className="w-full px-3.5 py-2 text-sm rounded-xl input-warm"
            />
          </div>

          {/* Contact details */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#112521]">
              Bog'lanish va buyurtma ma'lumotlari
            </label>
            <textarea
              rows={2}
              value={formData.contactInfo}
              onChange={(e) => handleInputChange('contactInfo', e.target.value)}
              placeholder="Telefon raqamingiz, Telegram profilingiz yoki do'kon manzili"
              className="w-full px-3.5 py-2 text-sm rounded-xl input-warm"
            />
          </div>

          {/* Generation Error Alert */}
          {generationError && (
            <div className="p-3.5 bg-[#FDF4F4] border border-rose-200 rounded-xl text-xs text-[#9E2A2B] space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#9E2A2B] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Xatolik:</strong> {generationError}
                </div>
              </div>
              {canUseLocalFallback && (
                <button
                  type="button"
                  onClick={handleUseLocalFallback}
                  className="w-full py-2 px-3 rounded-lg bg-white hover:bg-[#F6F8F7] text-[#112521] border border-[#E0ECE8] text-xs font-semibold transition-all btn-tactile"
                >
                  Mahalliy andoza asosida yaratish (AI siz / Offline rejim)
                </button>
              )}
            </div>
          )}

          {/* Primary Action Button: Authoritative Server-Side Generation */}
          <div className="pt-2 border-t border-[#E0ECE8]">
            <button
              type="button"
              onClick={handleGenerateAd}
              disabled={isGenerating || isLimitReached || !user}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C] ${
                isLimitReached || !user
                  ? 'bg-[#E0ECE8] text-[#52796F] cursor-not-allowed border border-[#E0ECE8]'
                  : isGenerating
                  ? 'bg-[#F5B85C]/80 text-[#112521] cursor-wait'
                  : 'bg-[#F5B85C] hover:bg-[#E5A749] text-[#112521] border border-[#F5B85C]/50'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#112521]" />
                  <span>Serverda matn yaratilmoqda...</span>
                </>
              ) : isLimitReached ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-[#173B35]" />
                  <span>Kunlik limit to'lgan ({adCount}/{currentPlan.dailyAdLimit})</span>
                </>
              ) : !user ? (
                <>
                  <LogIn className="w-4 h-4 text-[#173B35]" />
                  <span>Matn yaratish uchun Google orqali kiring</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#112521]" />
                  <span>Reklama matnini yaratish ({currentPlan.dailyAdLimit - adCount} ta qoldi)</span>
                </>
              )}
            </button>
            {statusMessage && (
              <div className="p-2.5 mt-2 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#173B35] flex items-center gap-2 animate-in fade-in">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5B85C] shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
            <p className="text-[11px] text-[#52796F] text-center mt-2">
              Kvota Firebase tranzaksiyasi orqali Toshkent vaqti bilan hisoblanadi
            </p>
          </div>
        </div>

        {/* Right Output Side (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div 
            className="scroll-reveal bg-white border border-[#E0ECE8] rounded-2xl p-5 sm:p-6 shadow-card space-y-4"
            style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#E0ECE8] pb-3">
              <div>
                <h3 className="text-base font-semibold text-[#112521] flex flex-wrap items-center gap-2">
                  <span>Tayyor reklama qoralamasi</span>
                  <span className="text-[11px] font-medium text-[#173B35] bg-[#D7F0E5] px-2 py-0.5 rounded-lg border border-[#E0ECE8]">
                    {formData.platform === 'telegram' ? 'Telegram format' : 'Instagram format'}
                  </span>
                  {generationSource === 'gemini' && (
                    <span className="text-[11px] font-semibold text-[#112521] bg-[#F5B85C]/25 px-2 py-0.5 rounded-lg border border-[#F5B85C]/50">
                      Gemini AI {generationModel ? `(${generationModel})` : ''}
                    </span>
                  )}
                  {generationSource === 'local_fallback' && (
                    <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">
                      Mahalliy andoza (AI siz)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-[#52796F] mt-0.5">
                  Matnni to'g'ridan-to'g'ri shu yerda tahrirlashingiz mumkin
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-3 py-1.5 text-xs font-medium text-[#112521] bg-[#F6F8F7] hover:bg-[#E0ECE8] border border-[#E0ECE8] rounded-xl transition-all btn-tactile flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C]"
                  title="Qoralamani saqlash"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#173B35]" />
                  <span className="hidden sm:inline">Saqlash</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-4 py-2 text-xs font-semibold text-[#112521] bg-[#F5B85C] hover:bg-[#E5A749] border border-[#F5B85C]/50 rounded-xl transition-all btn-tactile flex items-center gap-1.5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B85C]"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#112521]" />
                      <span>Nusxalandi!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#112521]" />
                      <span>Nusxa olish</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notification badge / generation success */}
            {generationSuccess && (
              <div className="p-2.5 bg-[#D7F0E5] border border-[#E0ECE8] rounded-xl text-xs text-[#173B35] font-medium flex items-center gap-2 animate-in fade-in duration-200">
                <Check className="w-4 h-4 text-[#F5B85C] shrink-0" />
                <span>Yangi reklama matni serverda muvaffaqiyatli yaratildi!</span>
              </div>
            )}

            {/* Notification badge / save success */}
            {saveSuccess && (
              <div className="p-2.5 bg-[#D7F0E5] border border-[#E0ECE8] rounded-xl text-xs text-[#173B35] font-medium flex items-center gap-2 animate-in fade-in duration-200">
                <Check className="w-4 h-4 text-[#F5B85C] shrink-0" />
                <span>Qoralama saqlandi! Pastdagi ro'yxatdan qayta yuklab olishingiz mumkin.</span>
              </div>
            )}

            {/* Draft Warning Banner */}
            {generationSource === 'local_fallback' ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Offline rejim:</strong> Bu matn Gemini AI orqali emas, mahalliy marketing andozasi asosida yaratildi (kunlik AI kvotasi sarflanmadi).
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#173B35] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#F5B85C] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Eslatma:</strong> {hasGenerated && generationSource === 'gemini' ? 'Matn Gemini AI yordamida yaratildi.' : 'Reklama qoralamasi.'} Chop etishdan oldin telefon raqamingiz, buyurtma shartlari va aniq narxlarni ko'rib chiqing.
                </div>
              </div>
            )}

            {/* Editable Output Box */}
            <div className="relative">
              <textarea
                rows={14}
                value={generatedDraft}
                onChange={(e) => setGeneratedDraft(e.target.value)}
                className="w-full p-4 text-sm font-sans text-[#112521] bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl focus:outline-none focus:border-[#173B35] focus:ring-2 focus:ring-[#F5B85C]/40 focus:bg-white transition-all leading-relaxed"
                spellCheck={false}
              />
              <div className="flex items-center justify-between text-[11px] text-[#52796F] mt-1 px-1">
                <span>Belgilar: {generatedDraft.length} ta</span>
                <span>Qatorlar: {generatedDraft.split('\n').length} ta</span>
              </div>
            </div>

            {/* Platform tips */}
            <div className="p-3.5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl text-xs text-[#52796F] space-y-1.5">
              <span className="font-semibold text-[#112521] block">
                {formData.platform === 'telegram'
                  ? '💡 Telegram uchun foydali maslahat:'
                  : '💡 Instagram uchun foydali maslahat:'}
              </span>
              {formData.platform === 'telegram' ? (
                <p>
                  Telegram postlarida rasmni birinchi yuklab, ostiga matnni joylashtirish tavsiya etiladi. Matn 1024 belgidan oshmasligi kerak.
                </p>
              ) : (
                <p>
                  Instagramda birinchi 2 ta qator eng muhim hisoblanadi (chunki mijoz "yana..." tugmasini bosishi kerak). Direktga yozishga chaqiriq qoldiring.
                </p>
              )}
            </div>
          </div>

          {/* Saved Drafts List */}
          {savedDrafts.length > 0 && (
            <div 
              className="scroll-reveal bg-white border border-[#E0ECE8] rounded-2xl p-5 shadow-card"
              style={{ '--reveal-delay': '160ms' } as React.CSSProperties}
            >
              <div className="flex items-center justify-between mb-3 border-b border-[#E0ECE8] pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#173B35]">
                  Saqlangan qoralamalar ({savedDrafts.length})
                </h3>
              </div>

              <div className="divide-y divide-[#E0ECE8] max-h-56 overflow-y-auto">
                {savedDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-[#F6F8F7] px-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#112521] truncate">
                        {draft.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#52796F] mt-0.5">
                        <span>{draft.createdAt}</span>
                        <span>·</span>
                        <span>{draft.content.length} belgi</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleRestoreDraft(draft)}
                        className="px-2.5 py-1 text-xs font-medium text-[#112521] hover:bg-white rounded-lg border border-[#E0ECE8] transition-all btn-tactile"
                      >
                        Tiklash
                      </button>
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="p-1 text-[#52796F] hover:text-[#9E2A2B] transition-colors btn-tactile"
                        title="O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
