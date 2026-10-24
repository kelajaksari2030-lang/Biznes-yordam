// src/utils/errorBus.ts
type ErrorCallback = (error: any) => void;
const listeners: ErrorCallback[] = [];

export const emitError = (error: any) => {
  listeners.forEach(callback => callback(error));
};

export const subscribeToErrors = (callback: ErrorCallback) => {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  };
};
