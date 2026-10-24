// src/components/DiagnosticPanel.tsx
import React from 'react';
import { useDiagnostic } from '../context/DiagnosticContext';

export const DiagnosticPanel: React.FC = () => {
  const { errors, clearErrors } = useDiagnostic();

  if (!import.meta.env.DEV || errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[50vh] overflow-y-auto bg-red-50 border-2 border-red-500 rounded-lg shadow-xl p-4 text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-red-800 uppercase">Firestore Diagnostic (DEV)</h3>
        <button 
          onClick={clearErrors}
          className="bg-red-200 hover:bg-red-300 text-red-800 px-2 py-1 rounded"
        >
          Clear
        </button>
      </div>
      <div className="space-y-2">
        {errors.map((info, idx) => (
          <div key={idx} className="border-b border-red-200 pb-2">
            <p><span className="font-bold">Op:</span> {info.operationType}</p>
            <p><span className="font-bold">Path:</span> {info.path}</p>
            <p><span className="font-bold">Error:</span> {info.error}</p>
            <p><span className="font-bold">UID:</span> {info.authInfo.userId ? 'Present' : 'None'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
