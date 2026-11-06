import React from 'react';
import { Severity, Status, Environment } from '../../types';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, CheckCircle2, Clock, Activity, Sparkles } from 'lucide-react';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
  showIcon?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  className = '',
  showIcon = true,
}) => {
  const styles: Record<Severity, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    critical: {
      bg: 'bg-rose-950/70',
      text: 'text-rose-300',
      border: 'border-rose-500/50',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
    },
    high: {
      bg: 'bg-orange-950/70',
      text: 'text-orange-300',
      border: 'border-orange-500/50',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
    },
    medium: {
      bg: 'bg-amber-950/70',
      text: 'text-amber-300',
      border: 'border-amber-500/50',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
    },
    low: {
      bg: 'bg-blue-950/70',
      text: 'text-blue-300',
      border: 'border-blue-500/50',
      icon: <Info className="w-3.5 h-3.5 text-blue-400" />,
    },
  };

  const current = styles[severity] || styles.low;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border shadow-xs ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      {showIcon && current.icon}
      {severity}
    </span>
  );
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const styles: Record<Status, { bg: string; text: string; border: string; dot: string; icon: React.ReactNode }> = {
    open: {
      bg: 'bg-red-950/60',
      text: 'text-red-300',
      border: 'border-red-600/40',
      dot: 'bg-red-400 animate-pulse',
      icon: <Clock className="w-3.5 h-3.5 text-red-400" />,
    },
    investigating: {
      bg: 'bg-sky-950/60',
      text: 'text-sky-300',
      border: 'border-sky-500/40',
      dot: 'bg-sky-400 animate-pulse',
      icon: <Activity className="w-3.5 h-3.5 text-sky-400" />,
    },
    resolved: {
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-300',
      border: 'border-emerald-500/40',
      dot: 'bg-emerald-400',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    },
  };

  const current = styles[status] || styles.open;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      {status}
    </span>
  );
};

export const DemoBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-purple-950/70 border border-purple-500/50 text-purple-300 ${className}`}
    title="Generated synthetic post-mortem for memory benchmarking"
  >
    <Sparkles className="w-3 h-3 text-purple-400" />
    Sample Data
  </span>
);

export const EnvironmentBadge: React.FC<{ env: Environment; className?: string }> = ({
  env,
  className = '',
}) => {
  const styles: Record<Environment, { bg: string; text: string; border: string }> = {
    production: {
      bg: 'bg-rose-950/50',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
    },
    staging: {
      bg: 'bg-amber-950/50',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
    },
    development: {
      bg: 'bg-slate-800/80',
      text: 'text-slate-300',
      border: 'border-slate-700',
    },
  };

  const current = styles[env] || styles.development;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] uppercase tracking-wide border ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      {env}
    </span>
  );
};

