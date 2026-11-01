/**
 * BiznesYordam - Suppliers & Purchasing Module Component
 * Full-featured UI for managing suppliers and purchase orders with stock receiving.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Supplier, PurchaseOrder, PurchaseOrderItem } from '../types/modules';
import { Product } from '../types/inventory';
import { getSuppliers, createSupplier, getPurchaseOrders, createPurchaseOrder, receivePurchaseOrder } from '../services/supplierService';
import { getProducts } from '../services/inventoryService';
import { Building2 as BuildingIcon, Plus as PlusIcon, CheckCircle2 as CheckIcon, Clock as ClockIcon, AlertCircle as AlertIcon, Truck as TruckIcon } from 'lucide-react';

export function SuppliersModule() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');

  // New Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supCompany, setSupCompany] = useState('');

  // New PO Modal State
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poItems, setPoItems] = useState<{ productId: string; quantity: number; unitCost: number }[]>([]);
  const [poPaidAmount, setPoPaidAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [sList, poList, pList] = await Promise.all([
        getSuppliers(user.uid),
        getPurchaseOrders(user.uid),
        getProducts(user.uid),
      ]);
      setSuppliers(sList);
      setPurchaseOrders(poList);
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

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await createSupplier(user.uid, {
        name: supName,
        phone: supPhone,
        contactPerson: supContact,
        companyName: supCompany,
        balancePayable: 0,
      });
      setSupName('');
      setSupPhone('');
      setSupContact('');
      setSupCompany('');
      setIsSupplierModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPoItem = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setPoItems((prev) => [
      ...prev,
      { productId: firstProd.id, quantity: 10, unitCost: firstProd.purchasePrice || 10000 },
    ]);
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedSupplierId) {
      setError("Ta'minotchi tanlanishi shart");
      return;
    }
    if (poItems.length === 0) {
      setError("Kamida 1 ta tovar qo'shing");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const selectedSup = suppliers.find((s) => s.id === selectedSupplierId);
      const formattedItems: PurchaseOrderItem[] = poItems.map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const name = prod?.name || 'Tovar';
        return {
          productId: it.productId,
          productName: name,
          quantity: it.quantity,
          unitCost: it.unitCost,
          totalCost: it.quantity * it.unitCost,
          unit: prod?.unit || 'dona',
        };
      });

      await createPurchaseOrder(user.uid, {
        supplierId: selectedSupplierId,
        supplierName: selectedSup?.name || 'Ta\'minotchi',
        items: formattedItems,
        paidAmount: poPaidAmount,
      });

      setIsPoModalOpen(false);
      setPoItems([]);
      setSelectedSupplierId('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceivePo = async (poId: string) => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await receivePurchaseOrder(user.uid, poId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0ECE8] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2.5 rounded-xl bg-[#D7F0E5] text-[#173B35]">
              <TruckIcon className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#112521]">Ta'minotchilar va Xaridlar (Procurement)</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Xomashyo ta'minotchilari, xarid buyurtmalari (PO) va qoldiqlarni avtomatik to'ldirish
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSupplierModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#173B35] text-[#173B35] hover:bg-[#D7F0E5]/50 font-semibold text-sm flex items-center space-x-2 transition"
          >
            <BuildingIcon className="w-4 h-4" />
            <span>Yangi Ta'minotchi</span>
          </button>
          <button
            onClick={() => {
              setIsPoModalOpen(true);
              if (poItems.length === 0) handleAddPoItem();
            }}
            className="px-4 py-2.5 rounded-xl bg-[#173B35] text-white hover:bg-[#112521] font-semibold text-sm flex items-center space-x-2 transition shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Yangi Xarid Buyurtmasi</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center space-x-2">
          <AlertIcon className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[#E0ECE8]">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-3 px-4 font-semibold text-sm transition border-b-2 ${
            activeTab === 'suppliers'
              ? 'border-[#173B35] text-[#173B35]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Ta'minotchilar Bazasi ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 font-semibold text-sm transition border-b-2 ${
            activeTab === 'orders'
              ? 'border-[#173B35] text-[#173B35]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Xarid Buyurtmalari ({purchaseOrders.length})
        </button>
      </div>

      {/* Supplier List */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-[#E0ECE8] overflow-hidden shadow-sm">
          {suppliers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <BuildingIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold">Hali ta'minotchilar qo'shilmagan</p>
              <p className="text-xs text-gray-400 mt-1">"Yangi Ta'minotchi" tugmasi orqali qo'shing</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F6F8F7] text-gray-600 font-semibold border-b border-[#E0ECE8]">
                  <tr>
                    <th className="p-4">Nomi / Kompaniya</th>
                    <th className="p-4">Telefon</th>
                    <th className="p-4">Mas'ul Shaxs</th>
                    <th className="p-4">Qarzdorlik Balansi</th>
                    <th className="p-4">Sana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0ECE8]">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F6F8F7]/50">
                      <td className="p-4 font-semibold text-[#112521]">
                        {s.name}
                        {s.companyName && <span className="block text-xs text-gray-500">{s.companyName}</span>}
                      </td>
                      <td className="p-4 text-gray-700">{s.phone}</td>
                      <td className="p-4 text-gray-600">{s.contactPerson || '-'}</td>
                      <td className="p-4">
                        <span className={`font-semibold ${s.balancePayable > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {s.balancePayable.toLocaleString()} UZS
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Purchase Orders List */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-[#E0ECE8] overflow-hidden shadow-sm">
          {purchaseOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <TruckIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold">Xarid buyurtmalari mavjud emas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F6F8F7] text-gray-600 font-semibold border-b border-[#E0ECE8]">
                  <tr>
                    <th className="p-4">PO kodi</th>
                    <th className="p-4">Ta'minotchi</th>
                    <th className="p-4">Tovarlar</th>
                    <th className="p-4">Jami Summa</th>
                    <th className="p-4">Holat</th>
                    <th className="p-4 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0ECE8]">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-[#F6F8F7]/50">
                      <td className="p-4 font-bold text-[#173B35]">{po.poNumber}</td>
                      <td className="p-4 font-medium">{po.supplierName}</td>
                      <td className="p-4 text-xs text-gray-600">
                        {po.items.map((i) => `${i.productName} (${i.quantity} ${i.unit || 'dona'})`).join(', ')}
                      </td>
                      <td className="p-4 font-semibold">{po.totalAmount.toLocaleString()} UZS</td>
                      <td className="p-4">
                        {po.status === 'received' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckIcon className="w-3.5 h-3.5 mr-1" /> Qabul qilingan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <ClockIcon className="w-3.5 h-3.5 mr-1" /> Kutilmoqda
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {po.status !== 'received' && (
                          <button
                            onClick={() => handleReceivePo(po.id)}
                            disabled={submitting}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                          >
                            Omborga qabul qilish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#112521]">Yangi Ta'minotchi Qo'shish</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nomi / Ismi *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-[#173B35]"
                  placeholder="Masalan: Grand Agro MChJ"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon *</label>
                <input
                  type="text"
                  required
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-[#173B35]"
                  placeholder="+998 90 123 45 67"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mas'ul shaxs</label>
                <input
                  type="text"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                  placeholder="Jasur aka"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-gray-600 text-sm"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#173B35] text-white rounded-xl text-sm font-semibold"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[#112521]">Yangi Xarid Buyurtmasi</h3>
            <form onSubmit={handleCreatePo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ta'minotchini Tanlang *</label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="">-- Tanlang --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-gray-600">Buyurtma Tovarlari</label>
                  <button
                    type="button"
                    onClick={handleAddPoItem}
                    className="text-xs font-semibold text-[#173B35] hover:underline"
                  >
                    + Tovar qo'shish
                  </button>
                </div>

                <div className="space-y-2">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-[#F6F8F7] p-2 rounded-xl">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPoItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, productId: val } : it))
                          );
                        }}
                        className="flex-1 text-xs border p-1.5 rounded-lg bg-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setPoItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                          );
                        }}
                        className="w-20 text-xs border p-1.5 rounded-lg text-center bg-white"
                        placeholder="Miqdor"
                      />
                      <input
                        type="number"
                        min="0"
                        value={item.unitCost}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setPoItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, unitCost: val } : it))
                          );
                        }}
                        className="w-28 text-xs border p-1.5 rounded-lg text-right bg-white"
                        placeholder="Tannarx (UZS)"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-[#173B35] mb-1">Dastlabki to'langan summa (UZS)</label>
                <input
                  type="number"
                  min="0"
                  value={poPaidAmount}
                  onChange={(e) => setPoPaidAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 border rounded-xl"
                  placeholder="0 UZS"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-gray-600 text-sm"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#173B35] text-white rounded-xl text-sm font-semibold"
                >
                  Buyurtmani Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
