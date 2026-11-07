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
  // Tone-based distinction (no multi-colour)
  const styles: Record<Severity, string> = {
    critical: 'bg-white text-[#050B1A] font-bold border border-white',
    high: 'bg-[#3B82F6] text-white font-medium border border-[#3B82F6]',
    medium: 'bg-transparent text-[#C9D6EA] font-medium border border-[#3B82F6]',
    low: 'bg-transparent text-[#8FA0BF] font-medium border border-white/20',
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
  // Tone-based dot indicators: Open = white, Investigating = blue, Resolved = silver
  const dotStyles: Record<Status, string> = {
    open: 'bg-white',
    investigating: 'bg-[#3B82F6]',
    resolved: 'bg-[#C9D6EA]',
  };

  const dot = dotStyles[status] || dotStyles.open;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-white/10 bg-[#101C3D] text-[#C9D6EA] capitalize ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
};

export const DemoBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono text-[#8FA0BF] bg-white/5 border border-white/10 ${className}`}
    title="Synthetic benchmark incident"
  >
    sample
  </span>
);

export const EnvironmentBadge: React.FC<{ env: Environment; className?: string }> = ({
  env,
  className = '',
}) => {
  // Neutral outline for all environments
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] uppercase tracking-wide border border-white/15 bg-transparent text-[#8FA0BF] ${className}`}
    >
      {env}
    </span>
  );
};
