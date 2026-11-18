/**
 * BiznesYordam - Multi-Branch & Multi-Warehouse Module Component
 * Manage branches, warehouses, and inter-warehouse stock transfers.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Branch, Warehouse, StockTransfer, StockTransferItem } from '../types/modules';
import { Product } from '../types/inventory';
import { getBranches, createBranch, getWarehouses, createWarehouse, getStockTransfers, createStockTransfer, confirmStockTransfer } from '../services/multiBranchService';
import { getProducts } from '../services/inventoryService';
import { GitFork, Warehouse as WarehouseIcon, Building, ArrowRightLeft, Plus, CheckCircle2, AlertCircle, X } from 'lucide-react';

export function MultiBranchModule() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transfers' | 'branches' | 'warehouses'>('transfers');

  // Branch Modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');

  // Warehouse Modal
  const [isWhModalOpen, setIsWhModalOpen] = useState(false);
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whBranchId, setWhBranchId] = useState('');

  // Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [sourceWhId, setSourceWhId] = useState('');
  const [destWhId, setDestWhId] = useState('');
  const [transferItems, setTransferItems] = useState<{ productId: string; quantity: number }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [bList, wList, tList, pList] = await Promise.all([
        getBranches(user.uid),
        getWarehouses(user.uid),
        getStockTransfers(user.uid),
        getProducts(user.uid),
      ]);
      setBranches(bList);
      setWarehouses(wList);
      setTransfers(tList);
      setProducts(pList);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await createBranch(user.uid, {
        name: branchName,
        code: branchCode,
        isMain: false,
      });
      setBranchName('');
      setBranchCode('');
      setIsBranchModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await createWarehouse(user.uid, {
        name: whName,
        code: whCode,
        branchId: whBranchId || (branches[0]?.id || 'main_branch'),
        isMain: false,
      });
      setWhName('');
      setWhCode('');
      setIsWhModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!sourceWhId || !destWhId) {
      setError("Manba va mo'ljallangan omborni tanlang");
      return;
    }
    if (sourceWhId === destWhId) {
      setError("Bir xil omborlar o'rtasida transfer qilib bo'lmaydi");
      return;
    }
    if (transferItems.length === 0) {
      setError("Kamida 1 ta tovar qo'shing");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const srcWh = warehouses.find((w) => w.id === sourceWhId);
      const dstWh = warehouses.find((w) => w.id === destWhId);

      const items: StockTransferItem[] = transferItems.map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        return {
          productId: it.productId,
          productName: prod?.name || 'Tovar',
          quantity: it.quantity,
          unit: prod?.unit || 'dona',
        };
      });

      await createStockTransfer(user.uid, {
        sourceWarehouseId: sourceWhId,
        sourceWarehouseName: srcWh?.name || 'Manba Ombor',
        destWarehouseId: destWhId,
        destWarehouseName: dstWh?.name || 'Mo\'ljal Ombor',
        items,
      });

      setIsTransferModalOpen(false);
      setTransferItems([]);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTransfer = async (tId: string) => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await confirmStockTransfer(user.uid, tId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0ECE8] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2.5 rounded-xl bg-[#D7F0E5] text-[#173B35]">
              <GitFork className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#112521]">Ko'p Filialli & Omborli Boshqaruv (Multi-branch)</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Filiallar, omborlar tarmog'i va omborlararo tovarlar transferi (audit trail)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              setIsTransferModalOpen(true);
              if (products.length > 0) {
                setTransferItems([{ productId: products[0].id, quantity: 5 }]);
              }
            }}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#173B35] text-white hover:bg-[#112521] font-semibold text-sm flex items-center space-x-2 transition shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Yangi Transfer Yaratish</span>
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
          onClick={() => setActiveTab('transfers')}
          className={`min-h-[44px] pb-3 px-4 font-semibold text-sm transition border-b-2 whitespace-nowrap ${
            activeTab === 'transfers'
              ? 'border-[#173B35] text-[#173B35]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Omborlararo Transferlar ({transfers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`min-h-[44px] pb-3 px-4 font-semibold text-sm transition border-b-2 whitespace-nowrap ${
            activeTab === 'branches'
              ? 'border-[#173B35] text-[#173B35]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Filiallar ({branches.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('warehouses')}
          className={`min-h-[44px] pb-3 px-4 font-semibold text-sm transition border-b-2 whitespace-nowrap ${
            activeTab === 'warehouses'
              ? 'border-[#173B35] text-[#173B35]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Omborlar ({warehouses.length})
        </button>
      </div>

      {/* Transfers Table */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-2xl border border-[#E0ECE8] overflow-hidden shadow-sm">
          {transfers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Hali tovar transferlari bajarilmagan</div>
          ) : (
            <>
              {/* Mobile Transfer Cards */}
              <div className="md:hidden divide-y divide-[#E0ECE8]">
                {transfers.map((tr) => (
                  <div key={tr.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[#173B35]">{tr.transferNumber}</span>
                      {tr.status === 'completed' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Bajarildi
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          Kutilmoqda
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-700 font-medium">
                      {tr.sourceWarehouseName} → {tr.destWarehouseName}
                    </div>
                    <p className="text-xs text-gray-600">
                      {tr.items.map((i) => `${i.productName} (${i.quantity} ${i.unit || 'dona'})`).join(', ')}
                    </p>
                    {tr.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleConfirmTransfer(tr.id)}
                        disabled={submitting}
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                      >
                        Tasdiqlash & O'tkazish
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Transfers Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F6F8F7] text-gray-600 font-semibold border-b border-[#E0ECE8]">
                    <tr>
                      <th className="p-4">Transfer kodi</th>
                      <th className="p-4">Manba Ombor</th>
                      <th className="p-4">Mo'ljal Ombor</th>
                      <th className="p-4">Tovarlar</th>
                      <th className="p-4">Holat</th>
                      <th className="p-4 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0ECE8]">
                    {transfers.map((tr) => (
                      <tr key={tr.id} className="hover:bg-[#F6F8F7]/50">
                        <td className="p-4 font-bold text-[#173B35]">{tr.transferNumber}</td>
                        <td className="p-4 text-gray-700">{tr.sourceWarehouseName}</td>
                        <td className="p-4 text-gray-700">{tr.destWarehouseName}</td>
                        <td className="p-4 text-xs text-gray-600">
                          {tr.items.map((i) => `${i.productName} (${i.quantity} ${i.unit || 'dona'})`).join(', ')}
                        </td>
                        <td className="p-4">
                          {tr.status === 'completed' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              Bajarildi
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                              Kutilmoqda
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {tr.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleConfirmTransfer(tr.id)}
                              disabled={submitting}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                            >
                              Tasdiqlash & O'tkazish
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

      {/* Branches List */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsBranchModalOpen(true)}
              className="px-4 py-2 bg-[#173B35] text-white rounded-xl text-xs font-semibold"
            >
              + Yangi Filial
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {branches.map((b) => (
              <div key={b.id} className="bg-white p-5 rounded-2xl border border-[#E0ECE8] space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#112521]">{b.name}</h3>
                  {b.isMain && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Asosiy</span>}
                </div>
                <p className="text-xs text-gray-500">Kodi: {b.code}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warehouses List */}
      {activeTab === 'warehouses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsWhModalOpen(true)}
              className="px-4 py-2 bg-[#173B35] text-white rounded-xl text-xs font-semibold"
            >
              + Yangi Ombor
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {warehouses.map((w) => (
              <div key={w.id} className="bg-white p-5 rounded-2xl border border-[#E0ECE8] space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#112521]">{w.name}</h3>
                  {w.isMain && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Markaziy</span>}
                </div>
                <p className="text-xs text-gray-500">Kodi: {w.code}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Branch Modal */}
      {isBranchModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBranchModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#112521]">Yangi Filial Qo'shish</h3>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Filial Nomi</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl"
                  placeholder="Chilonzor filiali"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Filial Kodi</label>
                <input
                  type="text"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl"
                  placeholder="BR-CHIL"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
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

      {/* Warehouse Modal */}
      {isWhModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWhModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#112521]">Yangi Ombor Qo'shish</h3>
              <button
                type="button"
                onClick={() => setIsWhModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ombor Nomi</label>
                <input
                  type="text"
                  required
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl"
                  placeholder="Zaxira Ombori №2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ombor Kodi</label>
                <input
                  type="text"
                  value={whCode}
                  onChange={(e) => setWhCode(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl"
                  placeholder="WH-02"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWhModalOpen(false)}
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

      {/* Stock Transfer Modal */}
      {isTransferModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTransferModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#112521]">Omborlararo Transfer Yaratish</h3>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTransfer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Manba Ombor (Qayerdan)</label>
                <select
                  value={sourceWhId}
                  onChange={(e) => setSourceWhId(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl"
                >
                  <option value="">-- Tanlang --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mo'ljal Ombor (Qayerga)</label>
                <select
                  value={destWhId}
                  onChange={(e) => setDestWhId(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl"
                >
                  <option value="">-- Tanlang --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">O'tkazilayotgan Tovar</label>
                {transferItems.map((it, idx) => (
                  <div key={idx} className="flex space-x-2">
                    <select
                      value={it.productId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTransferItems((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, productId: val } : item))
                        );
                      }}
                      className="flex-1 text-xs border p-2.5 rounded-xl"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Mavjud: {p.quantity})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setTransferItems((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, quantity: val } : item))
                        );
                      }}
                      className="w-20 text-xs border p-2.5 rounded-xl text-center"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 border rounded-xl text-gray-600 text-sm"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2 bg-[#173B35] text-white rounded-xl text-sm font-semibold"
                >
                  Transferni Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
