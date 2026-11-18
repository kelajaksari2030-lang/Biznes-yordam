/**
 * BiznesYordam - Customer Loyalty & Cashback Module Component
 * Tiered cashback program (Bronze, Silver, Gold, Platinum) and ledger tracking.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LoyaltyConfig, LoyaltyLedgerItem, CustomerTier } from '../types/modules';
import { Customer } from '../types/crm';
import { getLoyaltyConfig, saveLoyaltyConfig, getLoyaltyLedger, calculateCustomerTier, getEffectiveCashbackPercent } from '../services/loyaltyService';
import { getCustomers } from '../services/crmService';
import { Gift, Award, Coins, Settings2, Users, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle } from 'lucide-react';

export function LoyaltyModule() {
  const { user } = useAuth();
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledgerItems, setLedgerItems] = useState<LoyaltyLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tiers' | 'customers' | 'ledger' | 'settings'>('tiers');

  // Form states for settings
  const [cashbackPercent, setCashbackPercent] = useState<number>(2);
  const [silverThreshold, setSilverThreshold] = useState<number>(2000000);
  const [goldThreshold, setGoldThreshold] = useState<number>(5000000);
  const [platinumThreshold, setPlatinumThreshold] = useState<number>(10000000);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cfg, cList, lList] = await Promise.all([
        getLoyaltyConfig(user.uid),
        getCustomers(user.uid),
        getLoyaltyLedger(user.uid),
      ]);
      setConfig(cfg);
      setCustomers(cList);
      setLedgerItems(lList);

      setCashbackPercent(cfg.cashbackPercent);
      setSilverThreshold(cfg.silverThresholdUZS);
      setGoldThreshold(cfg.goldThresholdUZS);
      setPlatinumThreshold(cfg.platinumThresholdUZS);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const updated = await saveLoyaltyConfig(user.uid, {
        enabled: true,
        cashbackPercent,
        silverThresholdUZS: silverThreshold,
        goldThresholdUZS: goldThreshold,
        platinumThresholdUZS: platinumThreshold,
      });
      setConfig(updated);
      setMessage("Sadoqat dasturi sozlamalari saqlandi!");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getTierBadge = (t: CustomerTier) => {
    switch (t) {
      case 'platinum':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-purple-300">Platinum</span>;
      case 'gold':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Gold</span>;
      case 'silver':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">Silver</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#D7F0E5] text-[#173B35]">Bronze</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0ECE8] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2.5 rounded-xl bg-[#D7F0E5] text-[#173B35]">
              <Gift className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#112521]">Mijozlar Sadoqat Dasturi (Loyalty & Cashback)</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Keshbek ballari, mijoz darajalari (Bronze, Silver, Gold, Platinum) va sarflangan keshbek balansi
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="px-4 py-2 rounded-xl bg-[#F6F8F7] border border-[#E0ECE8] text-xs font-semibold text-[#173B35]">
            Asosiy Keshbek: <strong>{config?.cashbackPercent || 2}%</strong>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[#E0ECE8] overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('tiers')}
          className={`min-h-[44px] pb-3 px-4 font-semibold text-sm transition border-b-2 whitespace-nowrap ${
            activeTab === 'tiers'
              ? 'border-[#173B35] text-[#173B35]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Darajalar va Keshbek
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`min-h-[44px] pb-3 px-4 font-semibold text-sm transition border-b-2 whitespace-nowrap ${
            activeTab === 'customers'
              ? 'border-[#173B35] text-[#173B35]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Mijozlar Balansi ({customers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`min-h-[44px] pb-3 px-4 font-semibold text-sm transition border-b-2 whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-[#173B35] text-[#173B35]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Keshbek Tarixi ({ledgerItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`min-h-[44px] pb-3 px-4 font-semibold text-sm transition border-b-2 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-[#173B35] text-[#173B35]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Sozlamalar
        </button>
      </div>

      {/* Tiers View */}
      {activeTab === 'tiers' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E0ECE8] space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg text-[#173B35]">Bronze</span>
              {getTierBadge('bronze')}
            </div>
            <div className="text-2xl font-bold text-[#112521]">{config?.cashbackPercent || 2}%</div>
            <p className="text-xs text-gray-500">Dastlabki xaridlardan boshlab (0 UZS spend)</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-300 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg text-slate-700">Silver</span>
              {getTierBadge('silver')}
            </div>
            <div className="text-2xl font-bold text-[#112521]">
              {(config?.cashbackPercent || 2) + (config?.silverCashbackBonusPercent || 1)}%
            </div>
            <p className="text-xs text-gray-500">
              Jami xarid &ge; {(config?.silverThresholdUZS || 2000000).toLocaleString()} UZS
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-300 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg text-amber-700">Gold</span>
              {getTierBadge('gold')}
            </div>
            <div className="text-2xl font-bold text-[#112521]">
              {(config?.cashbackPercent || 2) + (config?.goldCashbackBonusPercent || 3)}%
            </div>
            <p className="text-xs text-gray-500">
              Jami xarid &ge; {(config?.goldThresholdUZS || 5000000).toLocaleString()} UZS
            </p>
          </div>

          <div className="bg-[#112521] text-white p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg text-purple-300">Platinum</span>
              {getTierBadge('platinum')}
            </div>
            <div className="text-2xl font-bold text-white">
              {(config?.cashbackPercent || 2) + (config?.platinumCashbackBonusPercent || 5)}%
            </div>
            <p className="text-xs text-gray-300">
              Jami xarid &ge; {(config?.platinumThresholdUZS || 10000000).toLocaleString()} UZS
            </p>
          </div>
        </div>
      )}

      {/* Customer Loyalty Balances */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-[#E0ECE8] overflow-hidden shadow-sm">
          {customers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Mijozlar topilmadi</div>
          ) : (
            <>
              {/* Mobile Customer Cards */}
              <div className="md:hidden divide-y divide-[#E0ECE8]">
                {customers.map((c) => {
                  const totalSpentVal = (c as any).totalSpent || 0;
                  const tier = calculateCustomerTier(totalSpentVal, config || undefined);
                  const bal = (c as any).loyaltyBalanceUZS || 0;
                  return (
                    <div key={c.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-sm text-[#112521]">{c.name}</span>
                          <p className="text-xs text-gray-600">{c.phone}</p>
                        </div>
                        {getTierBadge(tier)}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-gray-600">
                          Jami xarid: <strong>{totalSpentVal.toLocaleString()} UZS</strong>
                        </span>
                        <span className="font-bold text-emerald-700">
                          Balans: {bal.toLocaleString()} UZS
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Customers Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F6F8F7] text-gray-600 font-semibold border-b border-[#E0ECE8]">
                    <tr>
                      <th className="p-4">Mijoz</th>
                      <th className="p-4">Telefon</th>
                      <th className="p-4">Daraja (Tier)</th>
                      <th className="p-4">Jami Xaridlari</th>
                      <th className="p-4">Mavjud Keshbek Balansi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0ECE8]">
                    {customers.map((c) => {
                      const totalSpentVal = (c as any).totalSpent || 0;
                      const tier = calculateCustomerTier(totalSpentVal, config || undefined);
                      const bal = (c as any).loyaltyBalanceUZS || 0;
                      return (
                        <tr key={c.id} className="hover:bg-[#F6F8F7]/50">
                          <td className="p-4 font-semibold text-[#112521]">{c.name}</td>
                          <td className="p-4 text-gray-600">{c.phone}</td>
                          <td className="p-4">{getTierBadge(tier)}</td>
                          <td className="p-4 text-gray-700">{(c as any).totalSpent ? (c as any).totalSpent.toLocaleString() : 0} UZS</td>
                          <td className="p-4 font-bold text-emerald-700">{bal.toLocaleString()} UZS</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Ledger History */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-[#E0ECE8] overflow-hidden shadow-sm">
          {ledgerItems.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Hali keshbek tarixi mavjud emas</div>
          ) : (
            <>
              {/* Mobile Ledger Cards */}
              <div className="md:hidden divide-y divide-[#E0ECE8]">
                {ledgerItems.map((lg) => (
                  <div key={lg.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[#112521]">{lg.customerName}</span>
                      {lg.type === 'earned' ? (
                        <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                          <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Berildi
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                          <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Sarflandi
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{lg.description}</p>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-[#112521]">{lg.amount.toLocaleString()} UZS</span>
                      <span className="text-gray-400">{new Date(lg.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Ledger Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F6F8F7] text-gray-600 font-semibold border-b border-[#E0ECE8]">
                    <tr>
                      <th className="p-4">Mijoz</th>
                      <th className="p-4">Amal</th>
                      <th className="p-4">Summa</th>
                      <th className="p-4">Tafsilot</th>
                      <th className="p-4">Sana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0ECE8]">
                    {ledgerItems.map((lg) => (
                      <tr key={lg.id} className="hover:bg-[#F6F8F7]/50">
                        <td className="p-4 font-semibold">{lg.customerName}</td>
                        <td className="p-4">
                          {lg.type === 'earned' ? (
                            <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                              <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Berildi
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                              <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Sarflandi
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-bold">{lg.amount.toLocaleString()} UZS</td>
                        <td className="p-4 text-xs text-gray-600">{lg.description}</td>
                        <td className="p-4 text-xs text-gray-400">{new Date(lg.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Settings Form */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E0ECE8] max-w-lg space-y-4">
          <h3 className="font-bold text-lg text-[#112521]">Sadoqat Dasturi Parametrlari</h3>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Asosiy Keshbek Foizi (%)</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="20"
                value={cashbackPercent}
                onChange={(e) => setCashbackPercent(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Silver Darajasi Chegarasi (UZS)</label>
              <input
                type="number"
                inputMode="numeric"
                value={silverThreshold}
                onChange={(e) => setSilverThreshold(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2.5 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Gold Darajasi Chegarasi (UZS)</label>
              <input
                type="number"
                inputMode="numeric"
                value={goldThreshold}
                onChange={(e) => setGoldThreshold(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2.5 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Platinum Darajasi Chegarasi (UZS)</label>
              <input
                type="number"
                inputMode="numeric"
                value={platinumThreshold}
                onChange={(e) => setPlatinumThreshold(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2.5 border rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] py-2.5 bg-[#173B35] text-white font-semibold rounded-xl"
            >
              Sozlamalarni Saqlash
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
