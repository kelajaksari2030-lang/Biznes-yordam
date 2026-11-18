/**
 * BiznesYordam - Staff & KPI Commission Module Component
 * RBAC role management, sales commissions, cashier shifts & cash reconciliation.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StaffMember, StaffShift, StaffRole } from '../types/modules';
import { getStaffMembers, createStaffMember, openShift, closeShift, getShifts } from '../services/staffService';
import { Users, Shield, Clock, Plus, DollarSign, CheckCircle2, AlertCircle, KeyRound, Award, X } from 'lucide-react';

export function StaffModule() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'staff' | 'shifts'>('staff');

  // New Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('cashier');
  const [pinCode, setPinCode] = useState('1234');
  const [commissionRate, setCommissionRate] = useState<number>(2);

  // New Shift Modal
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [initialCash, setInitialCash] = useState<number>(50000);

  // Close Shift Modal
  const [activeShiftToClose, setActiveShiftToClose] = useState<StaffShift | null>(null);
  const [actualCashCount, setActualCashCount] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [stList, shList] = await Promise.all([getStaffMembers(user.uid), getShifts(user.uid)]);
      setStaffList(stList);
      setShifts(shList);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await createStaffMember(
        user.uid,
        {
          name,
          phone,
          role,
          pinCode,
          commissionRatePercent: commissionRate,
          active: true,
        },
        'admin'
      );
      setName('');
      setPhone('');
      setIsStaffModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStaffId) return;
    setSubmitting(true);
    setError(null);
    try {
      const st = staffList.find((s) => s.id === selectedStaffId);
      if (!st) return;
      await openShift(user.uid, st.id, st.name, st.role, initialCash);
      setIsShiftModalOpen(false);
      setSelectedStaffId('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeShiftToClose) return;
    setSubmitting(true);
    setError(null);
    try {
      await closeShift(user.uid, activeShiftToClose.id, actualCashCount);
      setActiveShiftToClose(null);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (r: StaffRole) => {
    switch (r) {
      case 'admin':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Admin</span>;
      case 'manager':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Menejer</span>;
      case 'accountant':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Buxgalter</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Kassir</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0ECE8] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2.5 rounded-xl bg-[#D7F0E5] text-[#173B35]">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#112521]">Xodimlar va Smenalar (Staff & KPI)</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Xodimlar rollari (RBAC), kassir smenalari (Z-report) va sotuv komissiyalari hisobi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setIsShiftModalOpen(true);
              if (staffList.length > 0) setSelectedStaffId(staffList[0].id);
            }}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white border border-[#173B35] text-[#173B35] hover:bg-[#D7F0E5]/50 font-semibold text-sm flex items-center space-x-2 transition"
          >
            <Clock className="w-4 h-4" />
            <span>Smena Ochish</span>
          </button>
          <button
            type="button"
            onClick={() => setIsStaffModalOpen(true)}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#173B35] text-white hover:bg-[#112521] font-semibold text-sm flex items-center space-x-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Xodim</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[#E0ECE8] overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`min-h-[44px] pb-3 px-4 font-semibold text-sm transition border-b-2 whitespace-nowrap ${
            activeTab === 'staff'
              ? 'border-[#173B35] text-[#173B35]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Xodimlar va KPI ({staffList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          className={`min-h-[44px] pb-3 px-4 font-semibold text-sm transition border-b-2 whitespace-nowrap ${
            activeTab === 'shifts'
              ? 'border-[#173B35] text-[#173B35]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Kassa Smenalari ({shifts.length})
        </button>
      </div>

      {/* Staff List */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-2xl border border-[#E0ECE8] overflow-hidden shadow-sm">
          {staffList.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold">Xodimlar ro'yxati bo'sh</p>
              <p className="text-xs text-gray-400 mt-1">"Yangi Xodim" tugmasini bosing</p>
            </div>
          ) : (
            <>
              {/* Mobile Staff Cards */}
              <div className="md:hidden divide-y divide-[#E0ECE8]">
                {staffList.map((st) => (
                  <div key={st.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[#112521]">{st.name}</span>
                      {getRoleBadge(st.role)}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                      <span>{st.phone || '-'}</span>
                      <span className="font-semibold text-emerald-700">KPI: {st.commissionRatePercent}%</span>
                      <span className="font-semibold text-[#173B35]">
                        {st.totalCommissionEarned.toLocaleString()} UZS
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Staff Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F6F8F7] text-gray-600 font-semibold border-b border-[#E0ECE8]">
                    <tr>
                      <th className="p-4">Xodim</th>
                      <th className="p-4">Rol</th>
                      <th className="p-4">Telefon</th>
                      <th className="p-4">PIN Kodi</th>
                      <th className="p-4">Sotuv KPI %</th>
                      <th className="p-4">Jami Komissiya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0ECE8]">
                    {staffList.map((st) => (
                      <tr key={st.id} className="hover:bg-[#F6F8F7]/50">
                        <td className="p-4 font-semibold text-[#112521]">{st.name}</td>
                        <td className="p-4">{getRoleBadge(st.role)}</td>
                        <td className="p-4 text-gray-700">{st.phone || '-'}</td>
                        <td className="p-4 font-mono text-gray-600">••••</td>
                        <td className="p-4 font-semibold text-emerald-700">{st.commissionRatePercent}%</td>
                        <td className="p-4 font-semibold text-[#173B35]">
                          {st.totalCommissionEarned.toLocaleString()} UZS
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Shifts List */}
      {activeTab === 'shifts' && (
        <div className="bg-white rounded-2xl border border-[#E0ECE8] overflow-hidden shadow-sm">
          {shifts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold">Hali kassa smenalari ochilmagan</p>
            </div>
          ) : (
            <>
              {/* Mobile Shift Cards */}
              <div className="md:hidden divide-y divide-[#E0ECE8]">
                {shifts.map((sh) => (
                  <div key={sh.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-sm text-[#112521]">{sh.staffName}</span>
                        <p className="text-[11px] text-gray-500">{new Date(sh.startTime).toLocaleString()}</p>
                      </div>
                      {sh.status === 'open' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                          Ochiq
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 shrink-0">
                          Yopilgan
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Dastlabki: {sh.initialCash.toLocaleString()} UZS</span>
                      <span className="font-bold text-emerald-700">Tushum: {sh.totalSales.toLocaleString()} UZS</span>
                    </div>
                    {sh.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveShiftToClose(sh);
                          setActualCashCount(sh.initialCash + sh.cashCollected);
                        }}
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition"
                      >
                        Smenani Yopish
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Shifts Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F6F8F7] text-gray-600 font-semibold border-b border-[#E0ECE8]">
                    <tr>
                      <th className="p-4">Xodim</th>
                      <th className="p-4">Ochilgan Vaqt</th>
                      <th className="p-4">Dastlabki Naqd</th>
                      <th className="p-4">Tushum</th>
                      <th className="p-4">Holat</th>
                      <th className="p-4 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0ECE8]">
                    {shifts.map((sh) => (
                      <tr key={sh.id} className="hover:bg-[#F6F8F7]/50">
                        <td className="p-4 font-semibold">{sh.staffName}</td>
                        <td className="p-4 text-xs text-gray-600">{new Date(sh.startTime).toLocaleString()}</td>
                        <td className="p-4 text-gray-700">{sh.initialCash.toLocaleString()} UZS</td>
                        <td className="p-4 font-bold text-emerald-700">{sh.totalSales.toLocaleString()} UZS</td>
                        <td className="p-4">
                          {sh.status === 'open' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              Ochiq
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                              Yopilgan
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {sh.status === 'open' && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveShiftToClose(sh);
                                setActualCashCount(sh.initialCash + sh.cashCollected);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition"
                            >
                              Smenani Yopish
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* New Staff Modal */}
      {isStaffModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsStaffModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#112521]">Yangi Xodim Yaratish</h3>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Xodim Ismi va Familiyasi *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl"
                  placeholder="Ali Valiyev"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon *</label>
                <input
                  type="tel"
                  inputMode="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl"
                  placeholder="+998 90 999 88 77"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Roli (RBAC)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="w-full px-3 py-2.5 border rounded-xl"
                >
                  <option value="cashier">Kassir (Faqat POS & Sotuv)</option>
                  <option value="manager">Menejer (Ombor & CRM)</option>
                  <option value="accountant">Buxgalter (Moliya)</option>
                  <option value="admin">Admin (To'liq Huquq)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">PIN Kodi (4 ta raqam)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-center font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sotuv KPI %</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="50"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 border rounded-xl text-center font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 border rounded-xl text-gray-600 text-sm"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2 bg-[#173B35] text-white rounded-xl text-sm font-semibold"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open Shift Modal */}
      {isShiftModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsShiftModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#112521]">Yangi Kassa Smenasini Ochish</h3>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleOpenShift} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Xodimni Tanlang</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl"
                >
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Dastlabki Naqd Pul Kassa Qoldig'i (UZS)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={initialCash}
                  onChange={(e) => setInitialCash(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2.5 border rounded-xl font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 border rounded-xl text-gray-600 text-sm"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2 bg-[#173B35] text-white rounded-xl text-sm font-semibold"
                >
                  Smenani Ochish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {activeShiftToClose && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveShiftToClose(null);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#112521]">Smenani Yopish & Z-Report</h3>
              <button
                type="button"
                onClick={() => setActiveShiftToClose(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
              <div className="bg-[#F6F8F7] p-3 rounded-xl space-y-1 text-xs">
                <p><strong>Xodim:</strong> {activeShiftToClose.staffName}</p>
                <p><strong>Dastlabki naqd:</strong> {activeShiftToClose.initialCash.toLocaleString()} UZS</p>
                <p><strong>Kassaga tushgan naqd:</strong> {activeShiftToClose.cashCollected.toLocaleString()} UZS</p>
                <p className="font-bold text-[#173B35] pt-1">
                  Kutilayotgan Naqd Pul Summasi: {(activeShiftToClose.initialCash + activeShiftToClose.cashCollected).toLocaleString()} UZS
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sanab Chiqilgan Naqd Pul (Haqiqiy)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  value={actualCashCount}
                  onChange={(e) => setActualCashCount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2.5 border rounded-xl font-bold text-lg text-emerald-800"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveShiftToClose(null)}
                  className="min-h-[44px] px-4 py-2 border rounded-xl text-gray-600 text-sm"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold"
                >
                  Smenani Yopish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
