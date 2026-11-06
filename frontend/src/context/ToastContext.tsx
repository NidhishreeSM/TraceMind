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
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-950/20'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-rose-950/20'
                : toast.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-amber-950/20'
                : 'bg-slate-900/95 border-cyan-500/40 text-slate-100 shadow-cyan-950/20'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-cyan-400" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{toast.title}</div>}
              <div className="text-sm leading-relaxed text-slate-200">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
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

export default ToastProvider;
