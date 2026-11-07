import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  CheckCircle2,
  Brain,
  TrendingDown,
  ArrowRight,
  Plus,
  Clock,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { getAnalyticsSummary, getIncidents, getMemoryStats, extractErrorMessage } from '../api';
import { AnalyticsSummary, Incident, MemoryStatsResponse } from '../types';
import { SeverityBadge, StatusBadge, DemoBadge } from '../components/common/Badge';
import { CardSkeleton, TableSkeleton } from '../components/common/Skeleton';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { EmptyState } from '../components/common/EmptyState';

const SEVERITY_BAR_COLORS: Record<string, string> = {
  critical: 'bg-rose-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};

// Helper: Check if live sample threshold (>= 5 live incidents) is met
function hasEnoughLiveSamples(
  basis?: string,
  samplesCount?: number,
  liveIncidents?: number
): boolean {
  if (basis === 'insufficient_live_data') return false;
  if (samplesCount !== undefined && samplesCount < 5) return false;
  if (liveIncidents !== undefined && liveIncidents < 5) return false;
  return true;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [memoryStats, setMemoryStats] = useState<MemoryStatsResponse | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [bankId, setBankId] = useState<string>('TraceMind');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      setError(null);
      const [analyticsData, incidentsData, statsData] = await Promise.all([
        getAnalyticsSummary(),
        getIncidents({ limit: 5 }),
        getMemoryStats().catch(() => null),
      ]);
      setSummary(analyticsData);
      setRecentIncidents(incidentsData.items || []);
      if (statsData) {
        setMemoryStats(statsData);
        if (statsData.bank_id) setBankId(statsData.bank_id);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getAnalyticsSummary(),
      getIncidents({ limit: 5 }),
      getMemoryStats().catch(() => null),
    ])
      .then(([analyticsData, incidentsData, statsData]) => {
        if (isMounted) {
          setSummary(analyticsData);
          setRecentIncidents(incidentsData.items || []);
          if (statsData) {
            setMemoryStats(statsData);
            if (statsData.bank_id) setBankId(statsData.bank_id);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(extractErrorMessage(err));
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <CardSkeleton className="h-48" />
            <TableSkeleton rows={4} cols={4} />
          </div>
          <div>
            <CardSkeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorBanner
          title="Could Not Load Dashboard"
          message={error}
          onRetry={() => loadDashboardData(true)}
        />
      </div>
    );
  }

  const memory = summary?.memory_impact;
  const isLiveCredible = hasEnoughLiveSamples(
    memory?.basis,
    memory?.live_samples_count,
    summary?.live_incidents
  );

  const demoBenchmark = memory?.demo_benchmark;
  const totalIncidentsCount = summary?.total_incidents || 1;

  const severityItems = [
    { key: 'critical', label: 'Critical', count: summary?.severity_breakdown?.critical || 0 },
    { key: 'high', label: 'High', count: summary?.severity_breakdown?.high || 0 },
    { key: 'medium', label: 'Medium', count: summary?.severity_breakdown?.medium || 0 },
    { key: 'low', label: 'Low', count: summary?.severity_breakdown?.low || 0 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Active incidents, verified resolutions, and Hindsight memory impact.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/memory"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Brain className="w-3.5 h-3.5 text-teal-400" />
            Memory Explorer
          </Link>
          <Link
            to="/incidents/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            Declare Incident
          </Link>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Incidents */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Open</span>
            <div className="w-7 h-7 rounded-lg bg-rose-950/60 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {summary?.open_incidents ?? 0}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Total recorded</span>
            <span className="font-mono text-slate-300">{summary?.total_incidents ?? 0}</span>
          </div>
        </div>

        {/* Resolved Incidents */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Resolved</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {summary?.resolved_incidents ?? 0}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Live / sample</span>
            <span className="font-mono text-slate-300">
              {summary?.live_incidents ?? '0'} live · {summary?.demo_incidents ?? '0'} sample
            </span>
          </div>
        </div>

        {/* Post-mortems Retained (Documents) */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Post-mortems retained</span>
            <div className="w-7 h-7 rounded-lg bg-teal-950/60 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Brain className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-300">
              {summary?.resolved_incidents ?? 0}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span>Bank scope</span>
              <span className="font-mono text-slate-300">{bankId}</span>
            </div>
            {memoryStats?.total_nodes != null && (
              <div className="flex items-center justify-between text-[11px] text-teal-400/90 pt-0.5">
                <span>Facts extracted by Hindsight</span>
                <span className="font-mono font-semibold">{memoryStats.total_nodes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Recall Hit Rate */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Recall hit rate</span>
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <Brain className="w-3.5 h-3.5 text-teal-400" />
              </div>
            </div>

            <div className="mt-2.5">
              {isLiveCredible && memory?.recall_hit_rate !== null && memory?.recall_hit_rate !== undefined ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-100">
                    {Math.round(memory.recall_hit_rate * 100)}%
                  </span>
                  <span className="text-xs text-teal-400">Live</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Needs at least 5 live resolved incidents
                </p>
              )}
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            {memory?.recall_hit_rate_note ? (
              <span className="text-slate-400 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{memory.recall_hit_rate_note}</span>
              </span>
            ) : (
              <span className="text-slate-500 font-mono">
                Basis: {memory?.basis === 'live_runs' ? 'Live Telemetry' : 'Insufficient live data'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Memory Impact & Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Memory Impact & Recent Incidents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Memory Impact Card */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Memory Impact
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Resolution time comparison with vs without Hindsight memory
                </p>
              </div>

              {isLiveCredible &&
              memory?.time_saved_percentage !== null &&
              memory?.time_saved_percentage !== undefined ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shrink-0">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {memory.time_saved_percentage.toFixed(1)}% Faster
                </div>
              ) : null}
            </div>

            {/* Check if enough live data exists */}
            {isLiveCredible &&
            memory &&
            memory.avg_minutes_to_resolve_with_memory != null &&
            memory.avg_minutes_to_resolve_without_memory != null ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Without Memory Metric */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Without Memory (Zero-Shot)</span>
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="mt-2 text-xl font-mono font-bold text-slate-300">
                    {memory.avg_minutes_to_resolve_without_memory.toFixed(1)}{' '}
                    <span className="text-xs text-slate-500 font-sans font-normal">minutes</span>
                  </div>
                </div>

                {/* With Memory Metric */}
                <div className="p-3.5 rounded-lg bg-teal-950/20 border border-teal-500/30">
                  <div className="flex items-center justify-between text-xs text-teal-300">
                    <span>With Hindsight Memory</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <div className="mt-2 text-xl font-mono font-bold text-teal-300">
                    {memory.avg_minutes_to_resolve_with_memory.toFixed(1)}{' '}
                    <span className="text-xs text-teal-400/80 font-sans font-normal">minutes</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Quiet neutral empty state */
              <div className="py-4 text-xs text-slate-500 space-y-1">
                <p>Needs at least 5 live resolved incidents</p>
                {memory?.recall_hit_rate_note && (
                  <p className="text-slate-400">{memory.recall_hit_rate_note}</p>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end text-xs">
              <Link
                to="/analytics"
                className="text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition"
              >
                View analytics <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Calmer Sample Data (Synthetic) Section */}
          {demoBenchmark && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-slate-300">
                    Sample data (synthetic)
                  </h3>
                  <DemoBadge />
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  Basis: {demoBenchmark.basis}
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Benchmark patterns (connection pool starvation, JWT cache desync, Kafka rebalances) used for evaluation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Sample Incidents</span>
                  <span className="font-mono font-bold text-slate-200 text-base mt-0.5 block">
                    {demoBenchmark.total_sample_incidents}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Sample Resolved</span>
                  <span className="font-mono font-bold text-slate-200 text-base mt-0.5 block">
                    {demoBenchmark.resolved_sample_incidents}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Avg Resolution</span>
                  <span className="font-mono font-bold text-slate-200 text-base mt-0.5 block">
                    {demoBenchmark.avg_sample_resolution_minutes != null
                      ? Number(demoBenchmark.avg_sample_resolution_minutes).toFixed(1)
                      : '0.0'}{' '}
                    min
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Incidents Table */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                  Recent Incidents
                </h3>
              </div>
              <Link
                to="/incidents"
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium transition"
              >
                View all ({summary?.total_incidents ?? 0}) <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentIncidents.length === 0 ? (
              <EmptyState
                title="No incidents logged"
                description="Zero reported incidents."
                actionText="Declare an Incident"
                onAction={() => navigate('/incidents/new')}
                className="mt-3"
              />
            ) : (
              <div className="mt-2 divide-y divide-slate-800/60">
                {recentIncidents.map((inc) => (
                  <Link
                    key={inc.id}
                    to={`/incidents/${inc.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 hover:bg-slate-800/40 px-2 rounded-lg transition group"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5">
                        <SeverityBadge severity={inc.severity} showIcon={false} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-teal-400 group-hover:underline">
                            {inc.id}
                          </span>
                          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                            {inc.service}
                          </span>
                          {inc.is_demo && <DemoBadge />}
                        </div>
                        <h4 className="text-xs sm:text-sm font-medium text-slate-200 truncate mt-0.5 group-hover:text-white">
                          {inc.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <StatusBadge status={inc.status} />
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Severity Breakdown & Quick Actions */}
        <div className="space-y-6">
          {/* Severity Breakdown: Scannable Horizontal Bar List with Counts */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-1">
              Severity Distribution
            </h3>
            <p className="text-xs text-slate-400 mb-3">Counts across all recorded incidents</p>

            <div className="space-y-2.5">
              {severityItems.map((item) => {
                const percentage = Math.round((item.count / totalIncidentsCount) * 100);
                const barColor = SEVERITY_BAR_COLORS[item.key] || 'bg-slate-500';

                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300">{item.label}</span>
                      <span className="font-mono text-slate-400">
                        <span className="font-bold text-slate-200">{item.count}</span>
                        <span className="text-slate-500 ml-1.5">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.max(percentage, item.count > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-2.5">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/incidents/new"
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-teal-400" />
                  Declare Incident
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                to="/memory"
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition"
              >
                <span className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-teal-400" />
                  Memory Explorer
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                to="/incidents/INC-DEMO-001"
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-teal-950/30 hover:bg-teal-900/40 border border-teal-500/30 text-xs font-medium text-teal-300 transition"
              >
                <span className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-teal-400" />
                  Sample Incident (INC-DEMO-001)
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-teal-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
