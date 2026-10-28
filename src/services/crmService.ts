/**
 * BiznesYordam - CRM Service
 * Manages customer relationship records at /users/{userId}/customers/{customerId}
 * Strictly isolated per authenticated user (ABAC/Owner-enforced).
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logFirestoreOp } from './firebase';
import { Customer, CustomerInput, CustomerStatus } from '../types/crm';

/**
 * Validates customer form inputs
 */
export function validateCustomerInput(input: Partial<CustomerInput>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.name || !input.name.trim()) {
    errors.push("Mijoz ismi kiritilishi shart");
  } else if (input.name.trim().length > 200) {
    errors.push("Mijoz ismi 200 belgidan oshmasligi kerak");
  }

  if (!input.phone || !input.phone.trim()) {
    errors.push("Telefon raqami kiritilishi shart");
  } else if (input.phone.trim().length > 64) {
    errors.push("Telefon raqami 64 belgidan oshmasligi kerak");
  }

  const validStatuses: CustomerStatus[] = ['yangi', 'boglanildi', 'muzokara', 'xarid_qildi', 'yoqotildi'];
  if (input.status && !validStatuses.includes(input.status)) {
    errors.push("Noto'g'ri mijoz statusi tanlandi");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Normalizes phone numbers for convenient calling/messaging
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.trim();
  return cleaned;
}

/**
 * Fetches all customers for a given user from Firestore
 */
export async function getCustomers(userId: string): Promise<Customer[]> {
  if (!userId || !userId.trim()) return [];

  const collectionPath = `users/${userId}/customers`;
  logFirestoreOp(OperationType.LIST, collectionPath);

  try {
    const colRef = collection(db, 'users', userId, 'customers');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId,
        name: data.name || '',
        phone: data.phone || '',
        telegramUsername: data.telegramUsername || '',
        notes: data.notes || '',
        status: (data.status as CustomerStatus) || 'yangi',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

/**
 * Creates or updates a customer document in Firestore
 */
export async function saveCustomer(
  userId: string,
  input: CustomerInput,
  customerId?: string
): Promise<Customer> {
  if (!userId || !userId.trim()) {
    throw new Error("Foydalanuvchi identifikatori (userId) mavjud emas.");
  }

  const validation = validateCustomerInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('. '));
  }

  const id = customerId || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docPath = `users/${userId}/customers/${id}`;
  const nowIso = new Date().toISOString();

  const customerRecord: Customer = {
    id,
    userId,
    name: input.name.trim(),
    phone: input.phone.trim(),
    telegramUsername: (input.telegramUsername || '').trim().replace(/^@/, ''),
    notes: (input.notes || '').trim(),
    status: input.status || 'yangi',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  logFirestoreOp(OperationType.WRITE, docPath);

  try {
    const docRef = doc(db, 'users', userId, 'customers', id);
    await setDoc(docRef, customerRecord, { merge: true });
    return customerRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}

/**
 * Deletes a customer document from Firestore
 */
export async function deleteCustomer(userId: string, customerId: string): Promise<void> {
  if (!userId || !customerId) return;

  const docPath = `users/${userId}/customers/${customerId}`;
  logFirestoreOp(OperationType.DELETE, docPath);

  try {
    const docRef = doc(db, 'users', userId, 'customers', customerId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
    throw error;
  }
}

/**
 * Filters customers client-side by query string and status
 */
export function filterCustomers(
  customers: Customer[],
  searchQuery: string,
  statusFilter?: CustomerStatus | 'all'
): Customer[] {
  const queryClean = searchQuery.toLowerCase().trim();

  return customers.filter((cust) => {
    // Status filter
    if (statusFilter && statusFilter !== 'all' && cust.status !== statusFilter) {
      return false;
    }

    // Search query matching
    if (!queryClean) return true;

    const nameMatch = cust.name.toLowerCase().includes(queryClean);
    const phoneMatch = cust.phone.toLowerCase().includes(queryClean);
    const tgMatch = (cust.telegramUsername || '').toLowerCase().includes(queryClean);
    const notesMatch = (cust.notes || '').toLowerCase().includes(queryClean);

    return nameMatch || phoneMatch || tgMatch || notesMatch;
  });
}
