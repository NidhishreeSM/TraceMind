import React from 'react';
import { Severity, Status, Environment } from '../../types';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  className = '',
}) => {
  // Semantic Colours (text, ~15% bg tint, ~35% border)
  const styles: Record<Severity, string> = {
    critical: 'text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/35 font-semibold',
    high: 'text-[#F97316] bg-[#F97316]/15 border border-[#F97316]/35 font-semibold',
    medium: 'text-[#EAB308] bg-[#EAB308]/15 border border-[#EAB308]/35 font-semibold',
    low: 'text-[#94A3B8] bg-[#94A3B8]/15 border border-[#94A3B8]/35 font-semibold',
  };

  const styleClass = styles[severity] || styles.low;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wider ${styleClass} ${className}`}
    >
      {severity}
    </span>
  );
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  // Semantic dot indicators: Open = red, Investigating = blue, Resolved = green
  const dotStyles: Record<Status, string> = {
    open: 'bg-[#EF4444]',
    investigating: 'bg-[#3B82F6]',
    resolved: 'bg-[#22C55E]',
  };

  const dot = dotStyles[status] || dotStyles.open;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-white/[0.07] bg-[#131C31] text-[#F1F5F9] capitalize ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
};

export const DemoBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono text-[#94A3B8] bg-[#94A3B8]/15 border border-[#94A3B8]/35 ${className}`}
    title="Synthetic benchmark incident"
  >
    Sample data
  </span>
);

export const EnvironmentBadge: React.FC<{ env: Environment; className?: string }> = ({
  env,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono capitalize border border-white/[0.14] text-[#94A3B8] bg-[#131C31] ${className}`}
    >
      {env}
    </span>
  );
};
