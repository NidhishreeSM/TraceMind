import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Brain,
  Sparkles,
  Database,
} from 'lucide-react';
import { getHealth, extractErrorMessage } from '../../api';
import { HealthResponse } from '../../types';

export const StatusChip: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchHealth = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      setError(null);
      const data = await getHealth();
      setHealth(data);
      setLastChecked(new Date());
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getHealth()
      .then((data) => {
        if (isMounted) {
          setHealth(data);
          setLastChecked(new Date());
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(extractErrorMessage(err));
        }
      });

    const interval = setInterval(() => {
      getHealth()
        .then((data) => {
          if (isMounted) {
            setHealth(data);
            setLastChecked(new Date());
          }
        })
        .catch(() => {});
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine health state: healthy, degraded, or down
  const getOverallState = (): 'healthy' | 'degraded' | 'down' => {
    if (error || !health) return 'down';
    const s = health.services;
    const statuses = [s?.database?.status, s?.groq?.status, s?.hindsight?.status].filter(Boolean);
    if (statuses.length === 0) return health.status === 'ok' ? 'healthy' : 'down';
    if (statuses.some((st) => st === 'down' || st === 'unhealthy' || st === 'error')) return 'down';
    if (statuses.some((st) => st === 'degraded')) return 'degraded';
    if (statuses.every((st) => st === 'healthy' || st === 'ok')) return 'healthy';
    return health.status === 'ok' ? 'healthy' : 'degraded';
  };

  const overallState = getOverallState();

  const dotColor =
    overallState === 'healthy'
      ? 'bg-[#22C55E]'
      : overallState === 'degraded'
      ? 'bg-[#EAB308]'
      : 'bg-[#EF4444]';

  const statusLabel =
    overallState === 'healthy'
      ? 'Online'
      : overallState === 'degraded'
      ? 'Degraded'
      : 'Offline';

  const statusTextColor =
    overallState === 'healthy'
      ? 'text-[#22C55E]'
      : overallState === 'degraded'
      ? 'text-[#EAB308]'
      : 'text-[#EF4444]';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.07] bg-[#131C31] text-xs font-mono text-[#F1F5F9] hover:border-white/[0.14] transition cursor-pointer"
        title="Click to view backend and Hindsight memory engine health"
      >
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className="font-medium text-[#F1F5F9]">Hindsight Memory</span>
        </span>

        <span className="text-[#94A3B8]">|</span>

        <span className={`font-medium ${statusTextColor}`}>
          {statusLabel}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Status Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#0E1628] border border-white/[0.07] rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
            <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">System Telemetry</span>
            <button
              onClick={() => fetchHealth(true)}
              disabled={loading}
              className="text-xs text-[#94A3B8] hover:text-[#F1F5F9] flex items-center gap-1 transition cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {/* Hindsight Service */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#131C31] border border-white/[0.07]">
              <Brain className="w-4 h-4 text-[#8B5CF6] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#F1F5F9]">Hindsight Engine</span>
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    {health?.services?.hindsight?.status === 'healthy' ? (
                      <span className="text-[#22C55E] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Healthy
                      </span>
                    ) : health?.services?.hindsight?.status === 'degraded' ? (
                      <span className="text-[#EAB308] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Degraded
                      </span>
                    ) : (
                      <span className="text-[#EF4444] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Down
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                  {health?.services?.hindsight?.message || 'Memory bank connected'}
                </p>
                {health?.services?.hindsight?.bank_id && (
                  <p className="text-[10px] font-mono text-[#8B5CF6] mt-0.5">
                    Bank: {health.services.hindsight.bank_id}
                  </p>
                )}
              </div>
            </div>

            {/* Groq AI Model */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#131C31] border border-white/[0.07]">
              <Sparkles className="w-4 h-4 text-[#3B82F6] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#F1F5F9]">Groq LLM</span>
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    {health?.services?.groq?.status === 'healthy' ? (
                      <span className="text-[#22C55E] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Healthy
                      </span>
                    ) : health?.services?.groq?.status === 'degraded' ? (
                      <span className="text-[#EAB308] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Degraded
                      </span>
                    ) : (
                      <span className="text-[#EF4444] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Down
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                  {health?.services?.groq?.message || 'Model API ready'}
                </p>
              </div>
            </div>

            {/* Database Engine */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#131C31] border border-white/[0.07]">
              <Database className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#F1F5F9]">Database</span>
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    {health?.services?.database?.status === 'healthy' ? (
                      <span className="text-[#22C55E] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Healthy
                      </span>
                    ) : (
                      <span className="text-[#EF4444] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Offline
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                  {health?.services?.database?.message || 'SQLite storage'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.07] flex items-center justify-between text-[10px] text-[#94A3B8] font-mono">
            <span>TraceMind v{health?.version || '1.0.0'}</span>
            <span>{lastChecked ? lastChecked.toLocaleTimeString() : 'Checking...'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
