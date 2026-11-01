import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Send,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader2,
  UserCheck,
  PhoneCall,
  Clock,
  Sparkles,
  Copy,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Customer, CustomerInput, CustomerStatus, CUSTOMER_STATUS_CONFIG } from '../types/crm';
import {
  getCustomers,
  saveCustomer,
  deleteCustomer,
  filterCustomers,
  validateCustomerInput,
} from '../services/crmService';
import { ModuleHelpGuide, HelpGuideButton, HelpStep } from './ModuleHelpGuide';

export const CrmModule: React.FC = () => {
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<CustomerStatus>('yangi');

  // Help Guide state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem('besto_help_crm_seen');
      if (!seen) {
        setIsHelpOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const crmHelpSteps: HelpStep[] = useMemo(() => [
    {
      title: "1. Yangi mijoz (Lid) qo'shish",
      description: "Sariq 'Yangi mijoz qo'shish' tugmasini bosing. Mijoz ismi, telefon raqami (+998...) va Telegram username (@...) ni kiriting.",
      tip: "Mijozning Telegram nikini saqlab qo'ysangiz, bir bosishda Telegram dasturida muloqotni boshlashingiz mumkin.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="20" y="20" width="460" height="40" rx="10" fill="#FFFFFF" stroke="#E0ECE8" strokeWidth="1" />
          <rect x="35" y="32" width="16" height="16" rx="4" fill="#D7F0E5" />
          <text x="60" y="44" fill="#173B35" fontSize="11" fontWeight="bold">Mijozlar Boshqaruvi (CRM)</text>
          <rect x="330" y="26" width="135" height="28" rx="8" fill="#F5B85C" />
          <text x="345" y="44" fill="#173B35" fontSize="10" fontWeight="bold">+ Yangi mijoz qo'shish</text>

          <rect x="50" y="75" width="400" height="125" rx="12" fill="#FFFFFF" stroke="#173B35" strokeWidth="2" />
          <text x="70" y="96" fill="#173B35" fontSize="11" fontWeight="bold">Yangi mijoz qo'shish</text>

          <text x="70" y="118" fill="#52796F" fontSize="9" fontWeight="bold">Mijoz ismi *</text>
          <rect x="70" y="123" width="170" height="22" rx="6" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="1" />
          <text x="80" y="137" fill="#173B35" fontSize="10">Anvar Qodirov</text>

          <text x="260" y="118" fill="#52796F" fontSize="9" fontWeight="bold">Telefon raqami *</text>
          <rect x="260" y="123" width="170" height="22" rx="6" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="1" />
          <text x="270" y="137" fill="#173B35" fontSize="10" fontFamily="monospace">+998 90 123 45 67</text>

          <text x="70" y="158" fill="#52796F" fontSize="9" fontWeight="bold">Telegram Username</text>
          <rect x="70" y="163" width="360" height="22" rx="6" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="1" />
          <text x="80" y="177" fill="#173B35" fontSize="10" fontFamily="monospace">@anvar_qodirov</text>
        </svg>
      ),
    },
    {
      title: "2. Mijoz statuslari va sotuv bosqichlari",
      description: "Har bir mijoz uchun mos statusni belgilang: Yangi lid ➔ Bog'lanildi ➔ Muzokarada ➔ Xarid qildi ➔ Yo'qotildi.",
      tip: "Statuslar filtratsiyasi orqali aynan muzokara jarayonidagi yoki xarid qilgan doimiy mijozlarni guruhlab ko'rish imkoni bor.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="20" y="30" width="80" height="35" rx="8" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
          <text x="32" y="52" fill="#1E40AF" fontSize="10" fontWeight="bold">Yangi lid</text>

          <text x="108" y="52" fill="#52796F" fontSize="12">➔</text>

          <rect x="125" y="30" width="90" height="35" rx="8" fill="#F3E8FF" stroke="#D8B4FE" strokeWidth="1" />
          <text x="135" y="52" fill="#6B21A8" fontSize="10" fontWeight="bold">Bog'lanildi</text>

          <text x="222" y="52" fill="#52796F" fontSize="12">➔</text>

          <rect x="240" y="30" width="95" height="35" rx="8" fill="#FEF3C7" stroke="#FDE047" strokeWidth="1" />
          <text x="250" y="52" fill="#854D0E" fontSize="10" fontWeight="bold">Muzokarada</text>

          <text x="342" y="52" fill="#52796F" fontSize="12">➔</text>

          <rect x="360" y="30" width="115" height="35" rx="8" fill="#D1FAE5" stroke="#6EE7B7" strokeWidth="1" />
          <text x="372" y="52" fill="#065F46" fontSize="10" fontWeight="bold">✓ Xarid qildi</text>

          <rect x="30" y="90" width="440" height="100" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="45" y="115" fill="#173B35" fontSize="11" fontWeight="bold">Status bo'yicha tezkor filterlar:</text>
          <rect x="45" y="128" width="85" height="28" rx="6" fill="#173B35" />
          <text x="58" y="145" fill="#FFFFFF" fontSize="10">Barchasi (12)</text>
          <rect x="140" y="128" width="95" height="28" rx="6" fill="#F6F8F7" stroke="#E0ECE8" strokeWidth="1" />
          <text x="150" y="145" fill="#52796F" fontSize="10">Yangi lid (3)</text>
          <rect x="245" y="128" width="105" height="28" rx="6" fill="#F6F8F7" stroke="#E0ECE8" strokeWidth="1" />
          <text x="255" y="145" fill="#52796F" fontSize="10">Xarid qildi (7)</text>
        </svg>
      ),
    },
    {
      title: "3. Maxsus izohlar va eslatmalar",
      description: "Mijoz bo'yicha qidirayotgan mahsulot turi, o'lchami, qayta qo'ng'iroq qilish vaqti va boshqa muhim tafsilotlarni izoh sifatida yozib qo'ying.",
      tip: "Izohlar bo'yicha ham qidirish mumkin (Masalan: 'kostyum 50-o'lcham' deb qidirib o'sha mijozni darhol topasiz).",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="30" y="25" width="440" height="170" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="50" y="52" fill="#173B35" fontSize="12" fontWeight="bold">📝 Mijoz bo'yicha maxsus izoh:</text>
          <rect x="50" y="65" width="400" height="85" rx="10" fill="#F6F8F7" stroke="#E0ECE8" strokeWidth="1" />
          <text x="65" y="90" fill="#112521" fontSize="11 font-medium font-sans">"Erkaklar klassik kostyumi qidirmoqda, o'lchami 50.</text>
          <text x="65" y="110" fill="#112521" fontSize="11 font-medium font-sans">Dushanba kuni soat 14:00 da qayta qo'ng'iroq qilib</text>
          <text x="65" y="130" fill="#112521" fontSize="11 font-medium font-sans">yangi kelgan partiyani taklif qilish kerak."</text>
        </svg>
      ),
    },
    {
      title: "4. Qidiruv, Qo'ng'iroq va Telegram tezkor tugmalari",
      description: "Ism, telefon raqami yoki Telegram niki bo'yicha qidirib, bir bosishda telefon qilish 'tel:' yoki Telegram 't.me/username' ga o'tib muloqot qiling.",
      tip: "Telefon raqami ustiga bir marta bossangiz raqam buferga nusxalanadi.",
      visual: (
        <svg viewBox="0 0 500 220" className="w-full max-w-lg h-auto rounded-xl">
          <rect width="500" height="220" rx="16" fill="#F6F8F7" stroke="#D7F0E5" strokeWidth="2" />
          <rect x="30" y="25" width="440" height="170" rx="12" fill="#FFFFFF" stroke="#D7F0E5" strokeWidth="1.5" />
          <text x="50" y="55" fill="#173B35" fontSize="13" fontWeight="bold">Anvar Qodirov</text>
          <rect x="160" y="42" width="70" height="18" rx="4" fill="#FEF3C7" stroke="#FDE047" strokeWidth="1" />
          <text x="168" y="55" fill="#854D0E" fontSize="9" fontWeight="bold">Muzokarada</text>

          <text x="50" y="85" fill="#52796F" fontSize="11" fontFamily="monospace">📞 +998 90 123 45 67</text>

          <rect x="50" y="110" width="115" height="36" rx="10" fill="#F6F8F7" stroke="#E0ECE8" strokeWidth="1" />
          <text x="65" y="132" fill="#112521" fontSize="11" fontWeight="bold">📞 Qo'ng'iroq</text>

          <rect x="180" y="110" width="125" height="36" rx="10" fill="#F0F9FF" stroke="#BAE6FD" strokeWidth="1" />
          <text x="192" y="132" fill="#0369A1" fontSize="11" fontWeight="bold">✈️ @anvar_qodirov</text>
        </svg>
      ),
    },
  ], []);

  // Load customers from Firestore
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setLoading(true);

    getCustomers(user.uid)
      .then((data) => {
        if (isMounted) {
          setCustomers(data);
          try {
            localStorage.setItem('biznes_crm_cache', JSON.stringify(data));
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load customers from Firestore:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Modal open helpers
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('+998 ');
    setTelegramUsername('');
    setNotes('');
    setStatus('yangi');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setTelegramUsername(cust.telegramUsername || '');
    setNotes(cust.notes || '');
    setStatus(cust.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormError(null);
  };

  // Save handler
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const inputData: CustomerInput = {
      name,
      phone,
      telegramUsername,
      notes,
      status,
    };

    const validation = validateCustomerInput(inputData);
    if (!validation.isValid) {
      setFormError(validation.errors.join('. '));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const saved = await saveCustomer(user.uid, inputData, editingCustomer?.id);

      if (editingCustomer) {
        setCustomers((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      } else {
        setCustomers((prev) => [saved, ...prev]);
      }

      handleCloseModal();
    } catch (err: any) {
      setFormError(err?.message || "Mijoz ma'lumotlarini saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleDeleteCustomer = async (cust: Customer) => {
    if (!user) return;
    const confirmDelete = window.confirm(`"${cust.name}" mijozini o'chirishni tasdiqlaysizmi?`);
    if (!confirmDelete) return;

    try {
      await deleteCustomer(user.uid, cust.id);
      setCustomers((prev) => prev.filter((c) => c.id !== cust.id));
    } catch (err) {
      alert("O'chirishda xatolik yuz berdi.");
    }
  };

  const handleCopyPhone = async (phoneStr: string, id: string) => {
    try {
      await navigator.clipboard.writeText(phoneStr);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  // Filtered customers
  const filteredList = useMemo(() => {
    return filterCustomers(customers, searchQuery, statusFilter);
  }, [customers, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = customers.length;
    const yangiCount = customers.filter((c) => c.status === 'yangi').length;
    const muzokaraCount = customers.filter((c) => c.status === 'muzokara' || c.status === 'boglanildi').length;
    const xaridCount = customers.filter((c) => c.status === 'xarid_qildi').length;
    return { total, yangiCount, muzokaraCount, xaridCount };
  }, [customers]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Header */}
      <div className="bg-white border border-[#E0ECE8] rounded-3xl p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F6F8F7] text-[#173B35] rounded-lg text-xs font-semibold border border-[#E0ECE8]/60">
              <Users className="w-3.5 h-3.5 text-[#F5B85C]" />
              <span>Mijozlar Boshqaruvi (CRM)</span>
            </div>
            <HelpGuideButton onClick={() => setIsHelpOpen(true)} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#112521]">
            Mijozlar va Sotuv Aloqalari
          </h1>
          <p className="text-xs sm:text-sm text-[#52796F] max-w-2xl leading-relaxed">
            Mijozlar ro'yxatini shakllantiring, telefon va Telegram orqali tezkor bog'laning hamda muzokaralar holatini kuzatib boring.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-5 py-3 rounded-2xl bg-[#F5B85C] hover:bg-[#E5A749] text-[#112521] text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 btn-tactile shrink-0"
        >
          <UserPlus className="w-4 h-4 text-[#112521]" />
          <span>Yangi mijoz qo'shish</span>
        </button>
      </div>

      {/* 4 Metric Counter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 bg-white border border-[#E0ECE8] rounded-2xl shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#52796F]">Jami mijozlar</span>
            <Users className="w-4 h-4 text-[#F5B85C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#112521] font-mono mt-2">
            {stats.total}
          </div>
          <span className="text-[11px] text-[#173B35] mt-1 block">Bazadagi barcha kontaktlar</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-[#E0ECE8] rounded-2xl shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700">Yangi lidlar</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#112521] font-mono mt-2">
            {stats.yangiCount}
          </div>
          <span className="text-[11px] text-[#173B35] mt-1 block">Birinchi marta murojaat</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-[#E0ECE8] rounded-2xl shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">Muzokarada</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#112521] font-mono mt-2">
            {stats.muzokaraCount}
          </div>
          <span className="text-[11px] text-[#173B35] mt-1 block">Aloqa yoki narx kelishuvi</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-[#E0ECE8] rounded-2xl shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Xarid qilganlar</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#112521] font-mono mt-2">
            {stats.xaridCount}
          </div>
          <span className="text-[11px] text-emerald-700 mt-1 block font-medium">Doimiy mijozlar</span>
        </div>
      </div>

      {/* Search Bar & Status Filter Tabs */}
      <div className="bg-white border border-[#E0ECE8] rounded-2xl p-4 sm:p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#52796F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ism, telefon, Telegram (@username) yoki izoh bo'yicha qidirish..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E0ECE8] focus:border-[#112521] focus:ring-1 focus:ring-[#112521] outline-none text-xs sm:text-sm text-[#112521] bg-[#F6F8F7]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52796F] hover:text-[#112521]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-[#52796F] shrink-0 self-center">
            Topildi: <strong className="text-[#112521] font-mono">{filteredList.length}</strong> ta
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 btn-tactile ${
              statusFilter === 'all'
                ? 'bg-[#112521] text-[#F6F8F7] shadow-xs'
                : 'bg-[#F6F8F7] text-[#52796F] border border-[#E0ECE8] hover:bg-[#E0ECE8]'
            }`}
          >
            Barchasi ({customers.length})
          </button>
          {(['yangi', 'boglanildi', 'muzokara', 'xarid_qildi', 'yoqotildi'] as CustomerStatus[]).map((st) => {
            const cfg = CUSTOMER_STATUS_CONFIG[st];
            const count = customers.filter((c) => c.status === st).length;
            const isActive = statusFilter === st;

            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 flex items-center gap-1.5 btn-tactile ${
                  isActive
                    ? 'bg-[#112521] text-[#F6F8F7] shadow-xs'
                    : 'bg-[#F6F8F7] text-[#52796F] border border-[#E0ECE8] hover:bg-[#E0ECE8]'
                }`}
              >
                <span>{cfg.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-[#F5B85C] text-[#112521]' : 'bg-white border border-[#E0ECE8]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Customer List Display */}
      {loading ? (
        <div className="py-16 bg-white border border-[#E0ECE8] rounded-3xl flex flex-col items-center justify-center space-y-3 shadow-card">
          <Loader2 className="w-8 h-8 text-[#F5B85C] animate-spin" />
          <span className="text-xs font-semibold text-[#173B35]">
            Mijozlar bazasi yuklanmoqda...
          </span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-14 bg-white border border-[#E0ECE8] rounded-3xl text-center space-y-3 p-6 shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-[#F6F8F7] border border-[#E0ECE8] text-[#F5B85C] flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#112521]">
            {customers.length === 0
              ? "Hozircha mijozlar mavjud emas"
              : "Qidiruv bo'yicha hech kim topilmadi"}
          </h3>
          <p className="text-xs text-[#52796F] max-w-md mx-auto">
            {customers.length === 0
              ? "Yangi mijoz qo'shing va ularning kontaktlari, telegram manzili hamda xarid jarayonini qulay saqlang."
              : "Boshqa so'z bilan qidirib ko'ring yoki status filtrini 'Barchasi'ga o'zgartiring."}
          </p>
          {customers.length === 0 && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-2 px-4 py-2.5 bg-[#F5B85C] hover:bg-[#E5A749] text-[#112521] text-xs font-bold rounded-xl transition-all btn-tactile inline-flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus className="w-4 h-4 text-[#112521]" />
              <span>Birinchi mijozni qo'shish</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#E0ECE8] rounded-3xl shadow-card overflow-hidden">
          <div className="divide-y divide-[#E0ECE8]">
            {filteredList.map((cust) => {
              const statusCfg = CUSTOMER_STATUS_CONFIG[cust.status] || CUSTOMER_STATUS_CONFIG.yangi;
              const tgClean = cust.telegramUsername ? cust.telegramUsername.replace(/^@/, '') : '';

              return (
                <div
                  key={cust.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F6F8F7] transition-colors"
                >
                  {/* Left: Customer Info */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-[#112521] truncate">
                        {cust.name}
                      </h3>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Contacts row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#52796F] pt-0.5">
                      {/* Phone */}
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#F5B85C] shrink-0" />
                        <a
                          href={`tel:${cust.phone}`}
                          className="hover:text-[#112521] hover:underline font-mono"
                          title="Qo'ng'iroq qilish"
                        >
                          {cust.phone}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(cust.phone, cust.id)}
                          className="p-1 text-[#52796F] hover:text-[#112521] transition-colors rounded"
                          title="Telefon raqamidan nusxa olish"
                        >
                          {copiedId === cust.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {/* Telegram */}
                      {tgClean && (
                        <div className="flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <a
                            href={`https://t.me/${tgClean}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-700 hover:underline font-mono"
                          >
                            @{tgClean}
                          </a>
                        </div>
                      )}

                      <span className="text-[#52796F] text-[11px]">
                        Sana: {new Date(cust.createdAt).toLocaleDateString('uz-UZ')}
                      </span>
                    </div>

                    {/* Notes */}
                    {cust.notes && (
                      <p className="text-xs text-[#173B35] bg-[#F6F8F7] p-2.5 rounded-xl border border-[#E0ECE8] mt-1.5 max-w-2xl leading-relaxed">
                        📝 {cust.notes}
                      </p>
                    )}
                  </div>

                  {/* Right: Quick Action Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-2 sm:pt-0">
                    <a
                      href={`tel:${cust.phone}`}
                      className="px-3 py-1.5 rounded-xl border border-[#E0ECE8] bg-[#F6F8F7] hover:bg-[#E0ECE8] text-[#112521] text-xs font-semibold flex items-center gap-1.5 transition-colors btn-tactile"
                      title="Qo'ng'iroq"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-[#F5B85C]" />
                      <span className="hidden sm:inline">Qo'ng'iroq</span>
                    </a>

                    {tgClean && (
                      <a
                        href={`https://t.me/${tgClean}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold flex items-center gap-1.5 transition-colors btn-tactile"
                        title="Telegramda yozish"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Telegram</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(cust)}
                      className="p-2 rounded-xl border border-[#E0ECE8] hover:bg-[#F6F8F7] text-[#173B35] transition-colors btn-tactile"
                      title="Tahrirlash"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(cust)}
                      className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors btn-tactile"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#251A14]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden overscroll-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
          role="presentation"
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-modal border border-[#E0ECE8] flex flex-col max-h-[calc(100vh-24px)] max-h-[calc(100dvh-24px)] my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-[#E0ECE8] pb-3 mb-4 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F6F8F7] border border-[#E0ECE8] flex items-center justify-center text-[#173B35] shrink-0">
                  <UserPlus className="w-5 h-5 text-[#F5B85C]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#112521]">
                    {editingCustomer ? "Mijoz ma'lumotlarini tahrirlash" : "Yangi mijoz qo'shish"}
                  </h3>
                  <p className="text-xs text-[#52796F]">
                    Mijoz kontaktlari va hozirgi muzokara holati
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-[#52796F] hover:text-[#112521] p-1.5 rounded-lg transition-colors shrink-0"
                aria-label="Yopish"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCustomer} className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2 overscroll-contain touch-pan-y">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Name */}
              <div>
                <label className="block text-xs font-bold text-[#112521] mb-1.5">
                  Mijoz ismi va familiyasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Anvar Qodirov yoki Malika opa (Toshkent)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0ECE8] focus:border-[#112521] focus:ring-1 focus:ring-[#112521] outline-none text-sm text-[#112521] bg-[#F6F8F7]"
                  required
                />
              </div>

              {/* 2. Phone */}
              <div>
                <label className="block text-xs font-bold text-[#112521] mb-1.5">
                  Telefon raqami <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0ECE8] focus:border-[#112521] focus:ring-1 focus:ring-[#112521] outline-none text-sm font-mono text-[#112521] bg-[#F6F8F7]"
                  required
                />
              </div>

              {/* 3. Telegram Username */}
              <div>
                <label className="block text-xs font-bold text-[#112521] mb-1.5">
                  Telegram username (ixtiyoriy)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#52796F]">
                    @
                  </span>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="foydalanuvchi_nomi"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E0ECE8] focus:border-[#112521] focus:ring-1 focus:ring-[#112521] outline-none text-sm font-mono text-[#112521] bg-[#F6F8F7]"
                  />
                </div>
              </div>

              {/* 4. Status */}
              <div>
                <label className="block text-xs font-bold text-[#112521] mb-1.5">
                  Mijoz statusi <span className="text-red-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0ECE8] focus:border-[#112521] outline-none text-sm text-[#112521] bg-[#F6F8F7]"
                >
                  <option value="yangi">Yangi lid (Birinchi murojaat)</option>
                  <option value="boglanildi">Bog'lanildi (Qo'ng'iroq / xabar yuborildi)</option>
                  <option value="muzokara">Muzokarada (Narx, o'lcham yoki mahsulot tanlanmoqda)</option>
                  <option value="xarid_qildi">Xarid qildi (Mijozga aylandi)</option>
                  <option value="yoqotildi">Yo'qotildi (Rad etdi yoki qiziqmadi)</option>
                </select>
              </div>

              {/* 5. Notes */}
              <div>
                <label className="block text-xs font-bold text-[#112521] mb-1.5">
                  Mijoz bo'yicha maxsus izoh yoki eslatma
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Masalan: Erkaklar kostyumi qidirmoqda, o'lchami 50, dushanba kuni qayta qo'ng'iroq qilish kerak."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0ECE8] focus:border-[#112521] outline-none text-xs sm:text-sm text-[#112521] bg-[#F6F8F7]"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-[#E0ECE8] flex items-center justify-end gap-3 sticky bottom-0 bg-white pt-2 mt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl border border-[#E0ECE8] text-xs font-bold text-[#52796F] hover:bg-[#F6F8F7] transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#112521] hover:bg-[#112521] text-[#F6F8F7] text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 btn-tactile"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saqlanmoqda...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#F5B85C]" />
                      Saqlash
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module Help Guide */}
      <ModuleHelpGuide
        moduleKey="crm"
        moduleTitle="Mijozlar Bazasi (CRM)"
        steps={crmHelpSteps}
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
};
