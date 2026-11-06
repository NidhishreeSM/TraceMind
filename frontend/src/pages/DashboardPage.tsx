import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  CheckCircle2,
  Brain,
  Zap,
  TrendingDown,
  ArrowRight,
  Plus,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { getAnalyticsSummary, getIncidents, extractErrorMessage } from '../api';
import { AnalyticsSummary, Incident } from '../types';
import { SeverityBadge, StatusBadge, DemoBadge } from '../components/common/Badge';
import { CardSkeleton, TableSkeleton } from '../components/common/Skeleton';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { EmptyState } from '../components/common/EmptyState';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
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
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      setError(null);
      const [analyticsData, incidentsData] = await Promise.all([
        getAnalyticsSummary(),
        getIncidents({ limit: 5 }),
      ]);
      setSummary(analyticsData);
      setRecentIncidents(incidentsData.items || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getAnalyticsSummary(), getIncidents({ limit: 5 })])
      .then(([analyticsData, incidentsData]) => {
        if (isMounted) {
          setSummary(analyticsData);
          setRecentIncidents(incidentsData.items || []);
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
          title="Could Not Load Ops Dashboard"
          message={error}
          onRetry={() => loadDashboardData(true)}
        />
      </div>
    );
  }

  // Format data for Recharts Pie chart
  const severityChartData = summary
    ? Object.entries(summary.severity_breakdown)
        .filter(([, count]) => count > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const memory = summary?.memory_impact;
  const isLiveCredible = hasEnoughLiveSamples(
    memory?.basis,
    memory?.live_samples_count,
    summary?.live_incidents
  );

  const demoBenchmark = memory?.demo_benchmark;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-teal-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Institutional Intelligence
            </span>
            <span className="text-xs text-slate-400">Continuous Learning Active</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1.5">
            Operations Intelligence Command
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            TraceMind combines Groq reasoning with Hindsight persistent memory to eliminate repeat downtime.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/memory"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Brain className="w-3.5 h-3.5 text-teal-400" />
            Memory Explorer
          </Link>
          <Link
            to="/incidents/new"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-950/40 transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Declare Incident
          </Link>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Incidents */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Open Incidents</span>
            <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100">
              {summary?.open_incidents ?? 0}
            </span>
            <span className="text-xs text-rose-400 font-medium">Active in triage</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Total recorded</span>
            <span className="font-mono text-slate-300 font-medium">{summary?.total_incidents ?? 0}</span>
          </div>
        </div>

        {/* Resolved Incidents */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resolved Incidents</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100">
              {summary?.resolved_incidents ?? 0}
            </span>
            <span className="text-xs text-emerald-400 font-medium">Retained post-mortems</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Live vs Demo</span>
            <span className="font-mono text-slate-300 font-medium">
              {summary?.live_incidents ?? '0'} live / {summary?.demo_incidents ?? '0'} demo
            </span>
          </div>
        </div>

        {/* Hindsight Memories Indexed */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hindsight Memories</span>
            <div className="w-8 h-8 rounded-lg bg-teal-950/60 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-teal-300">
              {summary?.resolved_incidents ?? 0}
            </span>
            <span className="text-xs text-teal-400/80 font-medium">Indexed in Bank</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Bank scope</span>
            <span className="font-mono text-teal-300 font-medium">tracemind-production</span>
          </div>
        </div>

        {/* Recall Hit Rate (Honest Gate: require >= 5 live samples) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recall Hit Rate</span>
              <div className="w-8 h-8 rounded-lg bg-violet-950/60 border border-violet-500/40 flex items-center justify-center text-violet-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              {isLiveCredible && memory?.recall_hit_rate !== null && memory?.recall_hit_rate !== undefined ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-violet-300">
                    {Math.round(memory.recall_hit_rate * 100)}%
                  </span>
                  <span className="text-xs text-violet-400 font-medium">Live match rate</span>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold text-amber-400 block">
                    Not enough live data yet
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Requires ≥5 live runs (never showing misleading 0% or 100%)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* recall_hit_rate_note display */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400 leading-snug">
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

      {/* Main Grid: Live Memory Impact & Separate Demo Benchmark Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Memory Impact & Recent Incidents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Memory Impact Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/30 border border-teal-500/30 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    Live Memory Impact
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Live Telemetry
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real MTTR reduction computed strictly from production incident resolutions
                  </p>
                </div>
              </div>

              {/* Render time_saved_percentage ONLY if non-null and credible */}
              {isLiveCredible &&
              memory?.time_saved_percentage !== null &&
              memory?.time_saved_percentage !== undefined ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold shrink-0">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {memory.time_saved_percentage.toFixed(1)}% Faster Recovery
                </div>
              ) : null}
            </div>

            {/* Check if enough live data exists */}
            {isLiveCredible &&
            memory?.avg_minutes_to_resolve_with_memory !== null &&
            memory?.avg_minutes_to_resolve_without_memory !== null ? (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Without Memory Metric */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Without Memory (Zero-Shot)</span>
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="mt-2 text-2xl font-mono font-bold text-slate-300">
                    {memory.avg_minutes_to_resolve_without_memory.toFixed(1)}{' '}
                    <span className="text-xs text-slate-500 font-sans font-normal">minutes</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Trial-and-error triage, pods restarted blindly
                  </div>
                </div>

                {/* With Memory Metric */}
                <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-500/40 shadow-inner">
                  <div className="flex items-center justify-between text-xs text-teal-300 font-medium">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      With Hindsight Memory
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <div className="mt-2 text-2xl font-mono font-bold text-teal-300">
                    {memory.avg_minutes_to_resolve_with_memory.toFixed(1)}{' '}
                    <span className="text-xs text-teal-400/80 font-sans font-normal">minutes</span>
                  </div>
                  <div className="mt-2 text-[11px] text-teal-300/80">
                    Direct root-cause recall from verified past incidents
                  </div>
                </div>
              </div>
            ) : (
              /* Honest Insufficient Live Data State */
              <div className="mt-5 p-5 rounded-xl bg-slate-950/70 border border-slate-800 text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Not enough live data yet
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Live MTTR comparison requires at least 5 resolved live incidents to guarantee statistical accuracy. Zero fabrication policy is strictly active.
                </p>
                {memory?.recall_hit_rate_note && (
                  <p className="text-[11px] text-slate-500 italic">
                    {memory.recall_hit_rate_note}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="italic">
                &ldquo;Every incident teaches. Every resolution makes us smarter.&rdquo;
              </span>
              <Link
                to="/analytics"
                className="text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition"
              >
                View full telemetry <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* SEPARATE DEMO BENCHMARK SECTION (Clearly labelled, never mixed into live metrics) */}
          {demoBenchmark && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-purple-200">
                    Sample data (synthetic)
                  </h3>
                  <DemoBadge />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-950 border border-purple-600/50 text-purple-300">
                  Basis: {demoBenchmark.basis}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Pre-seeded benchmark patterns (connection pool starvation, JWT cache desync, Kafka rebalances) used to pre-train Hindsight memory banks.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Sample Incidents</span>
                  <span className="font-mono font-bold text-slate-200 text-lg mt-0.5 block">
                    {demoBenchmark.total_sample_incidents}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Sample Resolved</span>
                  <span className="font-mono font-bold text-emerald-400 text-lg mt-0.5 block">
                    {demoBenchmark.resolved_sample_incidents}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Avg Sample Resolution</span>
                  <span className="font-mono font-bold text-teal-300 text-lg mt-0.5 block">
                    {demoBenchmark.avg_sample_resolution_minutes.toFixed(1)} min
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Incidents Table */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-slate-200">Recent Incidents</h3>
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
                description="Your operations environment is healthy with zero reported incidents."
                actionText="Declare an Incident"
                onAction={() => window.location.assign('/incidents/new')}
                className="mt-4"
              />
            ) : (
              <div className="mt-3 divide-y divide-slate-800/60">
                {recentIncidents.map((inc) => (
                  <Link
                    key={inc.id}
                    to={`/incidents/${inc.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 hover:bg-slate-800/40 px-2 rounded-xl transition group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-1">
                        <SeverityBadge severity={inc.severity} showIcon={false} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-teal-400 group-hover:underline">
                            {inc.id}
                          </span>
                          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                            {inc.service}
                          </span>
                          {inc.is_demo && <DemoBadge />}
                        </div>
                        <h4 className="text-sm font-medium text-slate-200 truncate mt-0.5 group-hover:text-white">
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

        {/* Right 1 Col: Severity Breakdown & Quick Triage Links */}
        <div className="space-y-6">
          {/* Severity Breakdown Pie Chart */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <h3 className="text-sm font-bold text-slate-200 mb-1">Severity Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">Breakdown across all active and resolved incidents</p>

            {severityChartData.length > 0 ? (
              <div>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {severityChartData.map((entry) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={SEVERITY_COLORS[entry.name] || '#64748b'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
                  {severityChartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: SEVERITY_COLORS[item.name] || '#64748b' }}
                      />
                      <span className="capitalize text-slate-300">{item.name}:</span>
                      <span className="font-mono font-bold text-slate-100">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                No incidents recorded yet
              </div>
            )}
          </div>

          {/* Quick Actions & Demo Shortcuts */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <h3 className="text-sm font-bold text-slate-200 mb-3">Ops Quick Actions</h3>
            <div className="space-y-2.5">
              <Link
                to="/incidents/new"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-teal-400" />
                  Declare New Outage / Bug
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                to="/memory"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition"
              >
                <span className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  Search Hindsight Memory Bank
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                to="/incidents/INC-001"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-teal-950/40 hover:bg-teal-900/50 border border-teal-500/30 text-xs font-medium text-teal-300 transition"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  Launch Hero Demo (INC-001)
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
