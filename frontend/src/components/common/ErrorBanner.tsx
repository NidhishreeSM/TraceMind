import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'System Communication Failure',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`p-5 rounded-2xl border border-[#EF4444]/35 bg-[#EF4444]/15 text-[#F1F5F9] flex items-start justify-between gap-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#EF4444] mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-[#F1F5F9]">{title}</h4>
          <p className="text-xs text-[#94A3B8] mt-1 font-mono leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/20 hover:bg-white/10 text-xs font-semibold text-[#F1F5F9] transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};
