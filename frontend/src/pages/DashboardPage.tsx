import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { getAnalyticsSummary, getIncidents, getMemoryStats, extractErrorMessage } from '../api';
import { AnalyticsSummary, Incident, MemoryStatsResponse } from '../types';
import { SeverityBadge, StatusBadge, DemoBadge } from '../components/common/Badge';
import { CardSkeleton, TableSkeleton } from '../components/common/Skeleton';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { EmptyState } from '../components/common/EmptyState';

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

  // Severity Donut Data with tonal palette
  const severityDonutData = [
    { name: 'Critical', value: summary?.severity_breakdown?.critical || 0, color: '#FFFFFF' },
    { name: 'High', value: summary?.severity_breakdown?.high || 0, color: '#3B82F6' },
    { name: 'Medium', value: summary?.severity_breakdown?.medium || 0, color: '#C9D6EA' },
    { name: 'Low', value: summary?.severity_breakdown?.low || 0, color: '#1D4ED8' },
  ];
  const totalSeverityCount = severityDonutData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
        <div>
          <h2 className="text-xl sm:text-2xl font-normal text-white tracking-wide">
            Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-[#8FA0BF] mt-0.5">
            Active incidents, verified resolutions, and Hindsight memory impact.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/memory"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/30 hover:bg-white/5 text-white text-xs font-semibold transition"
          >
            <Brain className="w-3.5 h-3.5 text-[#C9D6EA]" />
            Memory Explorer
          </Link>
          <Link
            to="/incidents/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#C9D6EA] text-[#050B1A] text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            Declare Incident
          </Link>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Incidents */}
        <div className="p-5 rounded-2xl bg-[#0B1530] border border-white/8">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#8FA0BF] font-medium">Open</span>
            <div className="w-7 h-7 rounded-lg bg-[#101C3D] border border-white/10 flex items-center justify-center text-white">
              <AlertOctagon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {summary?.open_incidents ?? 0}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/8 flex items-center justify-between text-xs text-[#8FA0BF]">
            <span>Total recorded</span>
            <span className="font-mono text-white">{summary?.total_incidents ?? 0}</span>
          </div>
        </div>

        {/* Resolved Incidents */}
        <div className="p-5 rounded-2xl bg-[#0B1530] border border-white/8">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#8FA0BF] font-medium">Resolved</span>
            <div className="w-7 h-7 rounded-lg bg-[#101C3D] border border-white/10 flex items-center justify-center text-[#C9D6EA]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {summary?.resolved_incidents ?? 0}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/8 flex items-center justify-between text-xs text-[#8FA0BF]">
            <span>Live / sample</span>
            <span className="font-mono text-white">
              {summary?.live_incidents ?? '0'} live · {summary?.demo_incidents ?? '0'} sample
            </span>
          </div>
        </div>

        {/* Post-mortems Retained (Documents) */}
        <div className="p-5 rounded-2xl bg-[#0B1530] border border-white/8">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#8FA0BF] font-medium">Post-mortems retained</span>
            <div className="w-7 h-7 rounded-lg bg-[#101C3D] border border-white/10 flex items-center justify-center text-[#3B82F6]">
              <Brain className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#C9D6EA] font-mono">
              {summary?.resolved_incidents ?? 0}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/8 space-y-1 text-xs text-[#8FA0BF]">
            <div className="flex items-center justify-between">
              <span>Bank scope</span>
              <span className="font-mono text-white">{bankId}</span>
            </div>
            {memoryStats?.total_nodes != null && (
              <div className="flex items-center justify-between text-[11px] text-[#C9D6EA] pt-0.5">
                <span>Facts extracted</span>
                <span className="font-mono font-semibold">{memoryStats.total_nodes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Recall Hit Rate */}
        <div className="p-5 rounded-2xl bg-[#0B1530] border border-white/8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#8FA0BF] font-medium">Recall hit rate</span>
              <div className="w-7 h-7 rounded-lg bg-[#101C3D] border border-white/10 flex items-center justify-center text-[#8FA0BF]">
                <Brain className="w-3.5 h-3.5 text-[#C9D6EA]" />
              </div>
            </div>

            <div className="mt-2.5">
              {isLiveCredible && memory?.recall_hit_rate !== null && memory?.recall_hit_rate !== undefined ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">
                    {Math.round(memory.recall_hit_rate * 100)}%
                  </span>
                  <span className="text-xs text-[#C9D6EA]">Live</span>
                </div>
              ) : (
                <p className="text-xs text-[#8FA0BF]">
                  Needs at least 5 live resolved incidents
                </p>
              )}
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/8 text-[11px] text-[#8FA0BF]">
            {memory?.recall_hit_rate_note ? (
              <span className="flex items-start gap-1">
                <Info className="w-3.5 h-3.5 text-[#8FA0BF] shrink-0 mt-0.5" />
                <span>{memory.recall_hit_rate_note}</span>
              </span>
            ) : (
              <span className="font-mono text-[#8FA0BF]">
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
          <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/8">
              <div>
                <h3 className="text-base font-normal text-white">
                  Memory Impact
                </h3>
                <p className="text-xs text-[#8FA0BF] mt-0.5">
                  Resolution time comparison with vs without Hindsight memory
                </p>
              </div>

              {isLiveCredible &&
              memory?.time_saved_percentage !== null &&
              memory?.time_saved_percentage !== undefined ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#101C3D] border border-white/10 text-[#C9D6EA] text-xs font-semibold shrink-0">
                  <TrendingDown className="w-3.5 h-3.5 text-[#3B82F6]" />
                  {memory.time_saved_percentage.toFixed(1)}% Faster
                </div>
              ) : null}
            </div>

            {/* Check if enough live data exists */}
            {isLiveCredible &&
            memory &&
            memory.avg_minutes_to_resolve_with_memory != null &&
            memory.avg_minutes_to_resolve_without_memory != null ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Without Memory Metric */}
                <div className="p-4 rounded-2xl bg-[#101C3D] border border-white/8">
                  <div className="flex items-center justify-between text-xs text-[#8FA0BF]">
                    <span>Without Memory (Zero-Shot)</span>
                    <Clock className="w-3.5 h-3.5 text-[#8FA0BF]" />
                  </div>
                  <div className="mt-2 text-xl font-mono font-bold text-[#8FA0BF]">
                    {memory.avg_minutes_to_resolve_without_memory.toFixed(1)}{' '}
                    <span className="text-xs text-[#8FA0BF] font-sans font-normal">minutes</span>
                  </div>
                </div>

                {/* With Memory Metric */}
                <div className="p-4 rounded-2xl bg-[#101C3D] border border-[#3B82F6]/40">
                  <div className="flex items-center justify-between text-xs text-[#C9D6EA]">
                    <span>With Hindsight Memory</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                  </div>
                  <div className="mt-2 text-xl font-mono font-bold text-white">
                    {memory.avg_minutes_to_resolve_with_memory.toFixed(1)}{' '}
                    <span className="text-xs text-[#C9D6EA] font-sans font-normal">minutes</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Quiet neutral empty state */
              <div className="py-4 text-xs text-[#8FA0BF] space-y-1">
                <p>Needs at least 5 live resolved incidents</p>
                {memory?.recall_hit_rate_note && (
                  <p className="text-white/70">{memory.recall_hit_rate_note}</p>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-white/8 flex items-center justify-end text-xs">
              <Link
                to="/analytics"
                className="text-[#C9D6EA] hover:text-white font-medium flex items-center gap-1 transition"
              >
                View analytics <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Sample Data (Synthetic) Section */}
          {demoBenchmark && (
            <div className="p-5 rounded-3xl bg-[#0B1530] border border-white/8 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-white">
                    Sample data (synthetic)
                  </h3>
                  <DemoBadge />
                </div>
                <span className="text-[10px] font-mono text-[#8FA0BF]">
                  Basis: {demoBenchmark.basis}
                </span>
              </div>

              <p className="text-xs text-[#8FA0BF]">
                Benchmark patterns (connection pool starvation, JWT cache desync, Kafka rebalances) used for evaluation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-3 rounded-2xl bg-[#101C3D] border border-white/8">
                  <span className="text-[#8FA0BF] block text-[10px] uppercase font-mono">Sample Incidents</span>
                  <span className="font-mono font-bold text-white text-base mt-0.5 block">
                    {demoBenchmark.total_sample_incidents}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#101C3D] border border-white/8">
                  <span className="text-[#8FA0BF] block text-[10px] uppercase font-mono">Sample Resolved</span>
                  <span className="font-mono font-bold text-white text-base mt-0.5 block">
                    {demoBenchmark.resolved_sample_incidents}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#101C3D] border border-white/8">
                  <span className="text-[#8FA0BF] block text-[10px] uppercase font-mono">Avg Resolution</span>
                  <span className="font-mono font-bold text-white text-base mt-0.5 block">
                    {demoBenchmark.avg_sample_resolution_minutes.toFixed(1)} min
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Incidents Table */}
          <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C9D6EA]" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-white font-mono">
                  Recent Incidents
                </h3>
              </div>
              <Link
                to="/incidents"
                className="text-xs text-[#C9D6EA] hover:text-white flex items-center gap-1 font-medium transition"
              >
                View all ({summary?.total_incidents ?? 0}) <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentIncidents.length === 0 ? (
              <EmptyState
                title="No incidents logged"
                description="Zero reported incidents."
                actionText="Declare an Incident"
                onAction={() => window.location.assign('/incidents/new')}
                className="mt-3"
              />
            ) : (
              <div className="mt-3 divide-y divide-white/6">
                {recentIncidents.map((inc) => (
                  <Link
                    key={inc.id}
                    to={`/incidents/${inc.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 hover:bg-[#101C3D]/50 px-2.5 rounded-xl transition group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5">
                        <SeverityBadge severity={inc.severity} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-white group-hover:underline">
                            {inc.id}
                          </span>
                          <span className="text-xs font-mono text-[#8FA0BF] bg-[#101C3D] px-1.5 py-0.5 rounded border border-white/5">
                            {inc.service}
                          </span>
                          {inc.is_demo && <DemoBadge />}
                        </div>
                        <h4 className="text-xs sm:text-sm font-normal text-[#C9D6EA] truncate mt-0.5 group-hover:text-white">
                          {inc.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <StatusBadge status={inc.status} />
                      <span className="text-xs text-[#8FA0BF] font-mono">
                        {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Donut Chart & Quick Actions */}
        <div className="space-y-6">
          {/* Severity Distribution Donut Chart */}
          <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8 space-y-4">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-white font-mono">
                Severity Distribution
              </h3>
              <p className="text-xs text-[#8FA0BF] mt-0.5">Counts across recorded incidents</p>
            </div>

            {/* Donut Chart with total centered */}
            <div className="relative h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={totalSeverityCount > 0 ? 3 : 0}
                    dataKey="value"
                    stroke="#0B1530"
                    strokeWidth={2}
                  >
                    {severityDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#101C3D',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#FFFFFF',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-white font-mono">{totalSeverityCount}</span>
                <span className="text-[10px] uppercase tracking-widest text-[#8FA0BF]">Total</span>
              </div>
            </div>

            {/* Legend below with label, count, and percentage */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/8 text-xs">
              {severityDonutData.map((item) => {
                const pct = totalSeverityCount > 0 ? Math.round((item.value / totalSeverityCount) * 100) : 0;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#101C3D] border border-white/5"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[#8FA0BF] text-[11px] truncate">{item.name}</span>
                    </div>
                    <span className="font-mono text-xs text-white ml-2">
                      {item.value} <span className="text-[#8FA0BF] text-[10px]">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8 space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-white font-mono">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/incidents/new"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#101C3D] hover:bg-white/5 border border-white/8 text-xs font-medium text-white transition"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-[#C9D6EA]" />
                  Declare Incident
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#8FA0BF]" />
              </Link>

              <Link
                to="/memory"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#101C3D] hover:bg-white/5 border border-white/8 text-xs font-medium text-white transition"
              >
                <span className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-[#C9D6EA]" />
                  Memory Explorer
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#8FA0BF]" />
              </Link>

              <Link
                to="/incidents/INC-DEMO-026"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#101C3D] hover:bg-white/5 border border-[#3B82F6]/30 text-xs font-medium text-[#C9D6EA] transition"
              >
                <span className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-[#3B82F6]" />
                  Try Demo Incident
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#3B82F6]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
