import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, isConfigured, checkFirebaseStatus, FirebaseConfigStatus } from '../services/firebase';
import { syncUserProfile, getTodayAdUsage } from '../services/firestore';
import { PLANS, PlanEntitlements, ADMIN_PLAN, isAdminUser, SimulatedTier } from '../config/plans';
import { UserProfile, DailyUsageDoc } from '../types/firestore';
import { clearAllUserBusinessCaches, clearLegacyUnscopedCaches } from '../utils/userCache';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  dailyUsage: DailyUsageDoc | null;
  loading: boolean;
  isConfigured: boolean;
  configStatus: FirebaseConfigStatus;
  currentPlan: PlanEntitlements;
  simulatedTier: SimulatedTier;
  setSimulatedTier: (tier: SimulatedTier) => void;
  isPro: boolean;
  isUltra: boolean;
  isAdmin: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;

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
  const lastUidRef = useRef<string | null>(null);

  const [simulatedTier, setSimulatedTierState] = useState<SimulatedTier>(() => {
    try {
      const stored = sessionStorage.getItem('biznes_admin_simulated_tier');
      if (stored === 'free' || stored === 'pro' || stored === 'ultra' || stored === 'admin') {
        return stored;
      }
    } catch {
      // ignore
    }
    return 'admin';
  });

  const setSimulatedTier = useCallback((tier: SimulatedTier) => {
    setSimulatedTierState(tier);
    try {
      sessionStorage.setItem('biznes_admin_simulated_tier', tier);
    } catch {
      // ignore
    }
  }, []);

  const configStatus = checkFirebaseStatus();

  // True admin identity derived strictly from Firebase Auth email (never changes regardless of test mode)
  const isAdmin = isAdminUser(user?.email);

  // Authoritatively derive current/effective plan.
  // Non-admin users are strictly locked to Firestore profile.
  // Verified Admin can test Free/Pro/Ultra UI & limit states via simulatedTier without changing Firestore data.
  const currentPlan: PlanEntitlements = (isAdmin && simulatedTier !== 'admin' && PLANS[simulatedTier])
    ? PLANS[simulatedTier]
    : isAdmin
      ? ADMIN_PLAN
      : (userProfile?.currentPlan && PLANS[userProfile.currentPlan])
        ? PLANS[userProfile.currentPlan]
        : PLANS.free;

  const isPro = (isAdmin && simulatedTier === 'admin') || currentPlan.id === 'pro' || currentPlan.id === 'ultra';
  const isUltra = (isAdmin && simulatedTier === 'admin') || currentPlan.id === 'ultra';

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
    clearLegacyUnscopedCaches();

    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        const nextUid = currentUser?.uid || null;
        if (lastUidRef.current && lastUidRef.current !== nextUid) {
          clearAllUserBusinessCaches();
        }
        lastUidRef.current = nextUid;

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
      const code = error?.code || '';
      const msg = error?.message || '';

      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Kirish oynasi yopildi. Qaytadan urinib ko\'ring.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Brauzeringiz pop-up oynasini blokladi. Iltimos, brauzer sozlamalarida pop-up oynalarga ruxsat bering.');
      } else if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
        setAuthError('Firebase konsolida Google provayderi yoqilmagan. Iltimos, Firebase Console -> Authentication -> Sign-in method bo\'limida Google provayderini faollashtiring.');
      } else if (code === 'auth/api-key-not-valid' || msg.includes('api-key-not-valid')) {
        setAuthError('Firebase API kaliti yaroqsiz yoki cheklangan. Iltimos, Firebase Console -> Project settings bo\'limidan haqiqiy Web API Key oling.');
      } else if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setAuthError('Ushbu domen Firebase Authorized Domains ro\'yxatida mavjud emas. Iltimos, Firebase Console -> Authentication -> Settings bo\'limiga domeningizni qo\'shing.');
      } else if (code === 'auth/network-request-failed' || msg.includes('network-request-failed')) {
        setAuthError('Tarmoq ulanishida xatolik yuz berdi. Iltimos, internet ulanishingizni va brauzer blokrovchilarini (AdBlock) tekshiring.');
      } else if (code === 'auth/invalid-continue-uri' || msg.includes('invalid-continue-uri')) {
        setAuthError('Firebase Authentication: continue-uri (qaytish manzili) yaroqsiz yoki Firebase Console -> Authentication -> Settings -> Authorized domains ro\'yxatiga kiritilmagan. Iltimos, domenni Authorized domains ro\'yxatiga qo\'shing.');
      } else {
        setAuthError(msg || 'Google orqali kirishda xatolik yuz berdi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    clearAllUserBusinessCaches();
    lastUidRef.current = null;

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
        simulatedTier,
        setSimulatedTier,
        isPro,
        isUltra,
        isAdmin,
        authError,
        signInWithGoogle,
        signOutUser,
        clearAuthError,

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
