import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  Building2,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Globe,
  DollarSign,
  Users,
  MapPin,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BusinessProfile, SalesChannel, BusinessCurrency } from '../types/business';
import { getBusinessProfile, saveBusinessProfile, validateBusinessProfileInput } from '../services/businessService';

interface BusinessProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (profile: BusinessProfile) => void;
}

const CATEGORY_PRESETS = [
  "Kiyim va poyabzal do'koni",
  "O'quv markazi / Onlayn kurslar",
  "Kafe / Fast-food / Restoran",
  "Go'zallik saloni / Kosmetika",
  "Onlayn Telegram / Instagram do'kon",
  "Maishiy xizmatlar va ta'mirlash",
  "Ishlab chiqarish va hunarmandchilik",
  "Qurilish mollari va xo'jalik",
  "Boshqa faoliyat turi"
];

const SALES_CHANNEL_OPTIONS: { id: SalesChannel; label: string }[] = [
  { id: 'telegram', label: 'Telegram (Kanal/Guruh/Bot)' },
  { id: 'instagram', label: 'Instagram (Reels/Post)' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'offline', label: 'Oflayn do‘kon / Filial' },
  { id: 'website', label: 'Veb-sayt / Onlayn vitrina' },
  { id: 'other', label: 'Boshqa kanallar' },
];

export const BusinessProfileModal: React.FC<BusinessProfileModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState("Kiyim va poyabzal do'koni");
  const [targetAudience, setTargetAudience] = useState('');
  const [mainSalesChannels, setMainSalesChannels] = useState<SalesChannel[]>(['telegram', 'instagram']);
  const [currency, setCurrency] = useState<BusinessCurrency>('UZS');
  const [cityOrRegion, setCityOrRegion] = useState('');
  const [description, setDescription] = useState('');

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Fetch current profile when modal opens
  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    getBusinessProfile(user.uid)
      .then((profile) => {
        if (!isMounted) return;
        if (profile) {
          setCompanyName(profile.companyName || '');
          setCategory(profile.category || "Kiyim va poyabzal do'koni");
          setTargetAudience(profile.targetAudience || '');
          setMainSalesChannels(profile.mainSalesChannels && profile.mainSalesChannels.length > 0 ? profile.mainSalesChannels : ['telegram', 'instagram']);
          setCurrency(profile.currency || 'UZS');
          setCityOrRegion(profile.cityOrRegion || '');
          setDescription(profile.description || '');
        } else {
          // Defaults if no profile exists yet
          setCompanyName(user.displayName ? `${user.displayName} do'koni` : '');
          setCategory("Kiyim va poyabzal do'koni");
          setTargetAudience("O'zbekistondagi 18-35 yoshli faol ijtimoiy tarmoq foydalanuvchilari");
          setMainSalesChannels(['telegram', 'instagram']);
          setCurrency('UZS');
          setCityOrRegion('Toshkent');
          setDescription('');
        }
      })
      .catch((err) => {
        if (isMounted) setErrorMsg("Profil ma'lumotlarini yuklashda xatolik yuz berdi");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleToggleChannel = (channelId: SalesChannel) => {
    setMainSalesChannels((prev) => {
      if (prev.includes(channelId)) {
        if (prev.length === 1) return prev; // At least one channel
        return prev.filter((c) => c !== channelId);
      } else {
        return [...prev, channelId];
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = validateBusinessProfileInput({
      companyName,
      category,
      targetAudience,
      currency,
    });

    if (!validation.isValid) {
      setErrorMsg(validation.errors.join('. '));
      return;
    }

    setSaving(true);
    try {
      const saved = await saveBusinessProfile(user.uid, {
        companyName,
        category,
        targetAudience,
        mainSalesChannels,
        currency,
        cityOrRegion,
        description,
      });

      setSuccessMsg("Biznes profilingiz muvaffaqiyatli saqlandi!");
      onSaved?.(saved);

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || "Profilni saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#251A14]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden overscroll-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div 
        className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-7 shadow-modal border border-[#E6DCD1] flex flex-col max-h-[calc(100vh-24px)] max-h-[calc(100dvh-24px)] my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="business-profile-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[#EFE8DE] pb-3 mb-4 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FAF6F0] border border-[#E6DCD1] flex items-center justify-center text-[#795640] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="business-profile-modal-title" className="text-base sm:text-lg font-bold text-[#493329]">
                Yagona Biznes Profili
              </h3>
              <p className="text-xs text-[#8D786D]">
                Diagnostika, reklama va kunlik vazifalar uchun yagona ma'lumot manbai
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8D786D] hover:text-[#493329] p-1.5 rounded-lg transition-colors shrink-0"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 flex-1">
            <Loader2 className="w-7 h-7 text-[#D0AE70] animate-spin" />
            <span className="text-xs text-[#795640] font-medium">
              Biznes profilingiz yuklanmoqda...
            </span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2 overscroll-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Feedback messages */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* 1. Company Name */}
            <div>
              <label className="block text-xs font-bold text-[#493329] mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#D0AE70]" />
                Kompaniya yoki Do'kon nomi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Masalan: Rayhon Fashion, Tezkor Kuryer, Oshxona.uz"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C7B8] focus:border-[#493329] focus:ring-1 focus:ring-[#493329] outline-none text-sm text-[#34221A] bg-[#FAF8F5]"
                required
              />
            </div>

            {/* 2. Category & Region in Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#493329] mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#D0AE70]" />
                  Faoliyat sohasi <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C7B8] focus:border-[#493329] outline-none text-sm text-[#34221A] bg-[#FAF8F5]"
                >
                  {CATEGORY_PRESETS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493329] mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D0AE70]" />
                  Shahar / Hudud (Ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={cityOrRegion}
                  onChange={(e) => setCityOrRegion(e.target.value)}
                  placeholder="Masalan: Toshkent shahri / Butun O'zbekiston"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C7B8] focus:border-[#493329] outline-none text-sm text-[#34221A] bg-[#FAF8F5]"
                />
              </div>
            </div>

            {/* 3. Target Audience */}
            <div>
              <label className="block text-xs font-bold text-[#493329] mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#D0AE70]" />
                Maqsadli mijozlar (Auditoriya) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Masalan: Toshkent va viloyatlardagi 20-40 yoshli ayollar, yosh onalar, sifatli kiyimlarni qidiruvchilar"
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-[#D5C7B8] focus:border-[#493329] outline-none text-sm text-[#34221A] bg-[#FAF8F5]"
                required
              />
            </div>

            {/* 4. Sales Channels */}
            <div>
              <label className="block text-xs font-bold text-[#493329] mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#D0AE70]" />
                Asosiy savdo va reklama kanallari
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SALES_CHANNEL_OPTIONS.map((opt) => {
                  const isChecked = mainSalesChannels.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleToggleChannel(opt.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all flex items-center gap-2 ${
                        isChecked
                          ? 'bg-[#493329] text-[#FAF6F0] border-[#493329]'
                          : 'bg-[#FAF6F0] text-[#634839] border-[#E6DCD1] hover:border-[#D0AE70]'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                          isChecked ? 'border-[#FAF6F0] bg-white/20' : 'border-[#8D786D]'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-3 h-3 text-[#D0AE70]" />}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Currency & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#493329] mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#D0AE70]" />
                  Asosiy valyuta
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrency('UZS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                      currency === 'UZS'
                        ? 'bg-[#493329] text-white border-[#493329]'
                        : 'bg-[#FAF6F0] text-[#795640] border-[#E6DCD1]'
                    }`}
                  >
                    UZS (So'm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                      currency === 'USD'
                        ? 'bg-[#493329] text-white border-[#493329]'
                        : 'bg-[#FAF6F0] text-[#795640] border-[#E6DCD1]'
                    }`}
                  >
                    USD ($)
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#493329] mb-1.5">
                  Qo'shimcha biznes tavsifi (Ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Masalan: Turkiyadan to'g'ridan-to'g'ri olib kelinadi"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D5C7B8] focus:border-[#493329] outline-none text-sm text-[#34221A] bg-[#FAF8F5]"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#EFE8DE] flex items-center justify-end gap-3 sticky bottom-0 bg-white pt-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#D5C7B8] text-xs font-bold text-[#634839] hover:bg-[#FAF6F0] transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#493329] hover:bg-[#34221A] text-[#FAF6F0] text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saqlanmoqda...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-[#D0AE70]" />
                    Profilni saqlash
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
