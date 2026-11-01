/**
 * BiznesYordam - Staff & KPI Commission Service
 * Manages staff members (/users/{userId}/staff) and cash shifts (/users/{userId}/shifts).
 * Enforces role-based permissions and shift reconciliation.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeFirestorePayload } from './firebase';
import { StaffMember, StaffShift, StaffRole } from '../types/modules';

/**
 * Validates if the requesting user has administrative rights to assign roles
 */
export function validateRoleAssignment(
  currentUserRole: StaffRole,
  targetRole: StaffRole
): { allowed: boolean; reason?: string } {
  if (targetRole === 'admin' && currentUserRole !== 'admin') {
    return {
      allowed: false,
      reason: "Ruxsat berilmagan: Faqat Admin darajasidagi foydalanuvchi Admin huquqini bera oladi.",
    };
  }
  return { allowed: true };
}

/**
 * Fetches all staff members for a business account
 */
export async function getStaffMembers(userId: string): Promise<StaffMember[]> {
  if (!userId) return [];
  const colRef = collection(db, 'users', userId, 'staff');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  try {
    const snap = await getDocs(q);
    const list: StaffMember[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as StaffMember));
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/staff`);
    return [];
  }
}

/**
 * Creates a new staff member with role check
 */
export async function createStaffMember(
  userId: string,
  input: Omit<StaffMember, 'id' | 'userId' | 'totalCommissionEarned' | 'createdAt' | 'updatedAt'>,
  currentUserRole: StaffRole = 'admin'
): Promise<StaffMember> {
  if (!userId) throw new Error("Foydalanuvchi tizimga kirmagan");
  if (!input.name || !input.name.trim()) throw new Error("Xodim ismi ko'rsatilsin");

  const roleCheck = validateRoleAssignment(currentUserRole, input.role);
  if (!roleCheck.allowed) {
    throw new Error(roleCheck.reason);
  }

  const colRef = collection(db, 'users', userId, 'staff');
  const newDoc = doc(colRef);
  const now = new Date().toISOString();

  const staff: StaffMember = {
    id: newDoc.id,
    userId,
    name: input.name.trim(),
    email: input.email?.trim() || '',
    phone: input.phone?.trim() || '',
    role: input.role || 'cashier',
    pinCode: input.pinCode?.trim() || '0000',
    commissionRatePercent: Math.max(0, Number(input.commissionRatePercent) || 0),
    totalCommissionEarned: 0,
    active: input.active !== undefined ? input.active : true,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(newDoc, sanitizeFirestorePayload(staff));
    return staff;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/staff/${newDoc.id}`);
    throw err;
  }
}

/**
 * Updates staff member
 */
export async function updateStaffMember(
  userId: string,
  staffId: string,
  input: Partial<StaffMember>,
  currentUserRole: StaffRole = 'admin'
): Promise<void> {
  if (!userId || !staffId) return;

  if (input.role) {
    const roleCheck = validateRoleAssignment(currentUserRole, input.role);
    if (!roleCheck.allowed) {
      throw new Error(roleCheck.reason);
    }
  }

  const docRef = doc(db, 'users', userId, 'staff', staffId);
  const now = new Date().toISOString();
  try {
    await updateDoc(docRef, sanitizeFirestorePayload({ ...input, updatedAt: now }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/staff/${staffId}`);
    throw err;
  }
}

/**
 * Deletes staff member
 */
export async function deleteStaffMember(userId: string, staffId: string): Promise<void> {
  if (!userId || !staffId) return;
  const docRef = doc(db, 'users', userId, 'staff', staffId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/staff/${staffId}`);
    throw err;
  }
}

/**
 * Opens a new cashier/sales shift
 */
export async function openShift(
  userId: string,
  staffId: string,
  staffName: string,
  role: StaffRole,
  initialCash: number
): Promise<StaffShift> {
  if (!userId || !staffId) throw new Error("Xodim yoki foydalanuvchi ko'rsatilmadi");

  const colRef = collection(db, 'users', userId, 'shifts');
  const newDoc = doc(colRef);
  const now = new Date().toISOString();

  const shift: StaffShift = {
    id: newDoc.id,
    userId,
    staffId,
    staffName,
    role,
    startTime: now,
    endTime: null,
    initialCash: Math.max(0, Number(initialCash) || 0),
    cashCollected: 0,
    cardCollected: 0,
    totalSales: 0,
    ordersCount: 0,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(newDoc, sanitizeFirestorePayload(shift));
    return shift;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/shifts/${newDoc.id}`);
    throw err;
  }
}

/**
 * Closes an active shift with cash count & discrepancy reconciliation
 */
export async function closeShift(
  userId: string,
  shiftId: string,
  actualCash: number,
  notes?: string
): Promise<StaffShift> {
  if (!userId || !shiftId) throw new Error("Smena kodi noto'g'ri");
  const shiftRef = doc(db, 'users', userId, 'shifts', shiftId);

  try {
    const closed = await runTransaction(db, async (tx) => {
      const snap = await tx.get(shiftRef);
      if (!snap.exists()) throw new Error("Smena topilmadi");
      const data = snap.data() as StaffShift;

      if (data.status === 'closed') return data; // Idempotent

      const now = new Date().toISOString();
      const expectedCash = data.initialCash + data.cashCollected;
      const count = Math.max(0, Number(actualCash) || 0);
      const discrepancy = count - expectedCash;

      const updatePayload = {
        endTime: now,
        actualCash: count,
        discrepancy,
        status: 'closed' as const,
        notes: notes?.trim() || '',
        updatedAt: now,
      };

      tx.update(shiftRef, updatePayload);
      return { ...data, ...updatePayload };
    });

    return closed;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/shifts/${shiftId}`);
    throw err;
  }
}

/**
 * Fetches user's shifts
 */
export async function getShifts(userId: string): Promise<StaffShift[]> {
  if (!userId) return [];
  const colRef = collection(db, 'users', userId, 'shifts');
  const q = query(colRef, orderBy('startTime', 'desc'));
  try {
    const snap = await getDocs(q);
    const list: StaffShift[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as StaffShift));
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/shifts`);
    return [];
  }
}
