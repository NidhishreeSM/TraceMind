import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { ToastContext, ToastType, ToastItem } from './toast-types';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message, title }]);
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast]
  );

  const success = useCallback((msg: string, title?: string) => addToast('success', msg, title), [addToast]);
  const error = useCallback((msg: string, title?: string) => addToast('error', msg, title), [addToast]);
  const info = useCallback((msg: string, title?: string) => addToast('info', msg, title), [addToast]);
  const warning = useCallback((msg: string, title?: string) => addToast('warning', msg, title), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              toast.type === 'error'
                ? 'bg-[#101C3D] border-red-500/40 text-white'
                : 'bg-[#101C3D] border-white/15 text-white'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-white" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-[#EF4444]" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-[#C9D6EA]" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-[#3B82F6]" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <div className="text-xs font-medium uppercase tracking-wider text-[#8FA0BF] mb-0.5">{toast.title}</div>}
              <div className="text-sm leading-relaxed text-[#C9D6EA]">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-[#8FA0BF] hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
