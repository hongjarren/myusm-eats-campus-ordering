import { useState } from 'react';
import type { ToastType } from './Toast';

export type { ToastType } from './Toast';

export type ToastMsg = { id: string; message: string; type: ToastType; duration?: number };

export function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    // hard timeout (failsafe) in case card never closes itself
    setTimeout(() => removeToast(id), duration + 2000);
  };

  return { toasts, showToast, removeToast };
}
