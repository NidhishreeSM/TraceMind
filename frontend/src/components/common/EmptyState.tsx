import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-white/[0.07] bg-[#0E1628] ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-[#131C31] border border-white/[0.07] flex items-center justify-center text-[#94A3B8] mb-4">
        <Icon className="w-6 h-6 text-[#94A3B8]" />
      </div>
      <h3 className="text-base font-normal text-[#F1F5F9]">{title}</h3>
      <p className="text-sm text-[#94A3B8] max-w-sm mt-1 mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-200 text-[#0A1122] text-xs font-semibold transition cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
