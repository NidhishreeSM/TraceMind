import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronDown,
  Brain,
  Sparkles,
  Database,
} from 'lucide-react';
import { getHealth } from '../../api';
import { HealthResponse } from '../../types';

export const StatusChip: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchHealth = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      const data = await getHealth();
      setHealth(data);
      setLastChecked(new Date());
    } catch {
      setHealth({
        status: 'error',
        version: '1.0.0',
        services: {
          database: { status: 'unhealthy', message: 'Backend unreachable' },
          groq: { status: 'unhealthy', message: 'API unreachable' },
          hindsight: { status: 'unhealthy', message: 'Memory engine unreachable' },
        },
      });
    } finally {
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => fetchHealth(), 30000);
    return () => clearInterval(interval);
  }, []);

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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition cursor-pointer ${
          allHealthy
            ? 'bg-[#101C3D] border-white/10 text-white hover:border-white/20'
            : 'bg-[#101C3D] border-red-500/30 text-[#C9D6EA] hover:border-red-400/40'
        }`}
        title="Click to view backend and Hindsight memory engine health"
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              allHealthy ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'bg-[#EF4444] animate-pulse'
            }`}
          />
          <span className="font-medium text-white">Hindsight Memory</span>
        </span>

        <span className="text-[#8FA0BF]">|</span>

        <span className={allHealthy ? 'text-[#C9D6EA] font-medium' : 'text-[#EF4444]'}>
          {allHealthy ? 'Online' : 'Degraded'}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-[#8FA0BF] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Status Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#0B1530] border border-white/15 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-xs font-medium uppercase tracking-wider text-[#8FA0BF]">System Telemetry</span>
            <button
              onClick={() => fetchHealth(true)}
              disabled={loading}
              className="text-xs text-[#8FA0BF] hover:text-white flex items-center gap-1 transition cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {/* Hindsight Service */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#101C3D] border border-white/10">
              <Brain className="w-4 h-4 text-[#C9D6EA] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">Hindsight Engine</span>
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    {health?.services?.hindsight?.status === 'healthy' ? (
                      <span className="text-white flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#3B82F6]" /> Healthy
                      </span>
                    ) : (
                      <span className="text-[#EF4444] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Degraded
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-[#8FA0BF] truncate mt-0.5">
                  {health?.services?.hindsight?.message || 'Memory bank connected'}
                </p>
                {health?.services?.hindsight?.bank_id && (
                  <p className="text-[10px] font-mono text-[#C9D6EA] mt-0.5">
                    Bank: {health.services.hindsight.bank_id}
                  </p>
                )}
              </div>
            </div>

            {/* Groq AI Model */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#101C3D] border border-white/10">
              <Sparkles className="w-4 h-4 text-[#C9D6EA] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">Groq Reasoning</span>
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    {health?.services?.groq?.status === 'healthy' ? (
                      <span className="text-white flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#3B82F6]" /> Healthy
                      </span>
                    ) : (
                      <span className="text-[#EF4444] flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Offline
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-[#8FA0BF] truncate mt-0.5">
                  {health?.services?.groq?.message || 'Inference online'}
                </p>
                {health?.services?.groq?.model && (
                  <p className="text-[10px] font-mono text-[#C9D6EA] mt-0.5 truncate">
                    Model: {health.services.groq.model}
                  </p>
                )}
              </div>
            </div>

            {/* Database */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#101C3D] border border-white/10">
              <Database className="w-4 h-4 text-[#C9D6EA] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">Postgres / SQLite</span>
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    {health?.services?.database?.status === 'healthy' ? (
                      <span className="text-white flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#3B82F6]" /> Connected
                      </span>
                    ) : (
                      <span className="text-[#EF4444] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Disconnected
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-[#8FA0BF] truncate mt-0.5">
                  {health?.services?.database?.message || 'Read/write ready'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-[#8FA0BF] flex justify-between items-center">
            <span>Last polled: {lastChecked.toLocaleTimeString()}</span>
            <span>v{health?.version || '1.0.0'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
