/**
 * BiznesYordam - CRM Types
 */

export type CustomerStatus = 'yangi' | 'boglanildi' | 'muzokara' | 'xarid_qildi' | 'yoqotildi';

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  telegramUsername?: string;
  notes?: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export type CustomerInput = Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export const CUSTOMER_STATUS_CONFIG: Record<CustomerStatus, { label: string; bg: string; text: string; border: string }> = {
  yangi: {
    label: 'Yangi lid',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  boglanildi: {
    label: "Bog'lanildi",
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  muzokara: {
    label: 'Muzokarada',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  xarid_qildi: {
    label: 'Xarid qildi (Mijoz)',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  yoqotildi: {
    label: "Yo'qotildi / Rad etdi",
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};
