'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string, duration?: number) => string;
    error: (title: string, description?: string, duration?: number) => string;
    warning: (title: string, description?: string, duration?: number) => string;
    info: (title: string, description?: string, duration?: number) => string;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...item, id, duration: item.duration ?? 4000 };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const toast = {
    success: useCallback((title: string, description?: string, duration?: number) => {
      return addToast({ title, description, type: 'success', duration });
    }, [addToast]),
    error: useCallback((title: string, description?: string, duration?: number) => {
      return addToast({ title, description, type: 'error', duration });
    }, [addToast]),
    warning: useCallback((title: string, description?: string, duration?: number) => {
      return addToast({ title, description, type: 'warning', duration });
    }, [addToast]),
    info: useCallback((title: string, description?: string, duration?: number) => {
      return addToast({ title, description, type: 'info', duration });
    }, [addToast]),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast, toast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return fallback no-op so components outside provider don't crash
    return {
      toasts: [],
      addToast: () => '',
      dismissToast: () => {},
      toast: {
        success: (title) => { console.log('[Toast Success]:', title); return ''; },
        error: (title) => { console.error('[Toast Error]:', title); return ''; },
        warning: (title) => { console.warn('[Toast Warning]:', title); return ''; },
        info: (title) => { console.info('[Toast Info]:', title); return ''; },
      },
    };
  }
  return context;
};
