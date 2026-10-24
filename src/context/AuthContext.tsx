import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, isConfigured, checkFirebaseStatus, FirebaseConfigStatus } from '../services/firebase';
import { syncUserProfile, getTodayAdUsage, recordAdGeneration } from '../services/firestore';
import { PLANS, PlanEntitlements } from '../config/plans';
import { UserProfile, DailyUsageDoc } from '../types/firestore';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  dailyUsage: DailyUsageDoc | null;
  loading: boolean;
  isConfigured: boolean;
  configStatus: FirebaseConfigStatus;
  currentPlan: PlanEntitlements;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
  recordAdGenerated: () => Promise<number>;
  updateDailyUsageCount: (count: number) => void;
  refreshProfileAndUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const configStatus = checkFirebaseStatus();

  // Authoritatively derive current plan from Firestore profile.
  // Fallback is strictly Free. Never allow localStorage or client-side tampering to escalate tiers.
  const currentPlan: PlanEntitlements = 
    (userProfile?.currentPlan && PLANS[userProfile.currentPlan])
      ? PLANS[userProfile.currentPlan]
      : PLANS.free;

  const loadUserData = useCallback(async (firebaseUser: User) => {
    try {
      const profile = await syncUserProfile(firebaseUser);
      setUserProfile(profile);

      const usage = await getTodayAdUsage(firebaseUser.uid);
      setDailyUsage(usage);
    } catch (err) {
      console.error('Failed to sync profile or usage:', err);
    }
  }, []);

  const refreshProfileAndUsage = useCallback(async () => {
    if (!user) return;
    await loadUserData(user);
  }, [user, loadUserData]);

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          await loadUserData(currentUser);
        } else {
          setUserProfile(null);
          setDailyUsage(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Firebase Auth state error:', error);
        setAuthError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [loadUserData]);

  const signInWithGoogle = async () => {
    setAuthError(null);

    if (!isConfigured || !auth || !googleProvider) {
      setAuthError(
        'Firebase konfiguratsiyasi to\'liq emas. Google orqali kirish uchun Firebase loyihasi talab etiladi.'
      );
      return;
    }

    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged handles user state & profile sync
    } catch (error: any) {
      console.error('Google Sign-in error:', error);
      if (error?.code === 'auth/popup-closed-by-user') {
        setAuthError('Kirish oynasi yopildi. Qaytadan urinib ko\'ring.');
      } else if (error?.code === 'auth/configuration-not-found' || error?.code === 'auth/operation-not-allowed') {
        setAuthError('Firebase konsolida Google provayderi yoqilmagan. Iltimos, Firebase Auth sozlamalarini tekshiring.');
      } else {
        setAuthError(error?.message || 'Google orqali kirishda xatolik yuz berdi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    if (!auth) {
      setUser(null);
      setUserProfile(null);
      setDailyUsage(null);
      return;
    }

    try {
      setLoading(true);
      await fbSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setDailyUsage(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      setAuthError(error?.message || 'Chiqishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const updateDailyUsageCount = useCallback((count: number) => {
    setDailyUsage((prev) => {
      const nowIso = new Date().toISOString();
      const dateKey = nowIso.split('T')[0];
      if (!prev) {
        return {
          id: dateKey,
          userId: user?.uid || '',
          date: dateKey,
          adCount: count,
          lastGeneratedAt: nowIso,
        };
      }
      return {
        ...prev,
        adCount: count,
        lastGeneratedAt: nowIso,
      };
    });
  }, [user]);

  const recordAdGenerated = async (): Promise<number> => {
    if (!user) return 0;
    try {
      const updated = await recordAdGeneration(user.uid);
      setDailyUsage(updated);
      return updated.adCount;
    } catch (error) {
      console.warn('Direct client usage write disabled by security rules (backend authoritative):', error);
      return (dailyUsage?.adCount || 0) + 1;
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        dailyUsage,
        loading,
        isConfigured,
        configStatus,
        currentPlan,
        authError,
        signInWithGoogle,
        signOutUser,
        clearAuthError,
        recordAdGenerated,
        updateDailyUsageCount,
        refreshProfileAndUsage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
