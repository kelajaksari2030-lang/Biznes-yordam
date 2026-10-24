// src/context/DiagnosticContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToErrors } from '../utils/errorBus';
import { FirestoreErrorInfo } from '../services/firebase';

interface DiagnosticContextType {
  errors: FirestoreErrorInfo[];
  clearErrors: () => void;
}

const DiagnosticContext = createContext<DiagnosticContextType | undefined>(undefined);

export const DiagnosticProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<FirestoreErrorInfo[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToErrors((error: FirestoreErrorInfo) => {
      setErrors(prev => [...prev, error]);
    });
    return unsubscribe;
  }, []);

  return (
    <DiagnosticContext.Provider value={{ errors, clearErrors: () => setErrors([]) }}>
      {children}
    </DiagnosticContext.Provider>
  );
};

export const useDiagnostic = () => {
  const context = useContext(DiagnosticContext);
  if (!context) throw new Error('useDiagnostic must be used within DiagnosticProvider');
  return context;
};
