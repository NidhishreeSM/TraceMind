import React, { useEffect, useState, useRef } from 'react';
import { getHealth } from '../../api';
import { HealthResponse } from '../../types';
import { Database, Brain, Sparkles, RefreshCw, ChevronDown, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const StatusChip: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date>(() => new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchHealth = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await getHealth();
      setHealth(data);
      setLastChecked(new Date());
    } catch {
      // Degraded / Offline representation conforming to contract
      setHealth({
        status: 'degraded',
        version: '1.0.0',
        services: {
          database: { status: 'unreachable', message: 'Connection to backend API failed' },
          groq: { status: 'unknown', message: 'Backend unavailable' },
          hindsight: { status: 'unreachable', message: 'Backend unavailable' },
        },
      });
      setLastChecked(new Date());
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getHealth()
      .then((data) => {
        if (isMounted) {
          setHealth(data);
          setLoading(false);
          setLastChecked(new Date());
        }
      })
      .catch(() => {
        if (isMounted) {
          setHealth({
            status: 'degraded',
            version: '1.0.0',
            services: {
              database: { status: 'unreachable', message: 'Connection to backend API failed' },
              groq: { status: 'unknown', message: 'Backend unavailable' },
              hindsight: { status: 'unreachable', message: 'Backend unavailable' },
            },
          });
          setLoading(false);
          setLastChecked(new Date());
        }
      });

    const interval = setInterval(() => {
      fetchHealth(false);
    }, 30000); // 30s health poll

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

  const hindsightHealthy = health?.services?.hindsight?.status === 'healthy';
  const dbHealthy = health?.services?.database?.status === 'healthy';
  const allHealthy = health?.status === 'ok' && hindsightHealthy && dbHealthy;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all duration-150 cursor-pointer ${
          allHealthy
            ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-teal-500/50'
            : 'bg-amber-950/40 border-amber-500/40 text-amber-200 hover:border-amber-400'
        }`}
        title="Click to view backend and Hindsight memory engine health"
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              allHealthy
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="font-semibold text-slate-300">Hindsight Memory</span>
        </span>

        <span className="text-slate-500">|</span>

        <span className={allHealthy ? 'text-teal-400 font-medium' : 'text-amber-400'}>
          {allHealthy ? 'Online' : 'Degraded'}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Status Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900/98 border border-slate-700 rounded-xl shadow-2xl p-4 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">System Telemetry</span>
            <button
              onClick={() => fetchHealth(true)}
              disabled={loading}
              className="text-xs text-slate-400 hover:text-teal-400 flex items-center gap-1 transition"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {/* Hindsight Service */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <Brain className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">Hindsight Engine</span>
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    {health?.services?.hindsight?.status === 'healthy' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Healthy
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Degraded
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {health?.services?.hindsight?.message || 'Memory bank connected'}
                </p>
                {health?.services?.hindsight?.bank_id && (
                  <p className="text-[10px] font-mono text-teal-400/80 mt-0.5">
                    Bank: {health.services.hindsight.bank_id}
                  </p>
                )}
              </div>
            </div>

            {/* Groq AI Model */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <Sparkles className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">Groq Reasoning</span>
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    {health?.services?.groq?.status === 'healthy' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Healthy
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Offline
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {health?.services?.groq?.message || 'Inference online'}
                </p>
                {health?.services?.groq?.model && (
                  <p className="text-[10px] font-mono text-violet-400/80 mt-0.5 truncate">
                    Model: {health.services.groq.model}
                  </p>
                )}
              </div>
            </div>

            {/* Database */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <Database className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">Postgres / SQLite</span>
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    {health?.services?.database?.status === 'healthy' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Disconnected
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {health?.services?.database?.message || 'Read/write ready'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center">
            <span>Last polled: {lastChecked.toLocaleTimeString()}</span>
            <span>v{health?.version || '1.0.0'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
