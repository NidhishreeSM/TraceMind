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
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-3xl border border-dashed border-white/10 bg-[#0B1530] ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#101C3D] border border-white/10 flex items-center justify-center text-[#C9D6EA] mb-4 shadow-inner">
        <Icon className="w-6 h-6 text-[#C9D6EA]" />
      </div>
      <h3 className="text-base font-normal text-white">{title}</h3>
      <p className="text-sm text-[#8FA0BF] max-w-sm mt-1 mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#C9D6EA] text-[#050B1A] text-xs font-semibold transition cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
