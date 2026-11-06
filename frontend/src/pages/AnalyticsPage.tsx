import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingDown,
  Brain,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  BarChart3,
  RefreshCw,
  Server,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { getAnalyticsSummary, extractErrorMessage } from '../api';
import { AnalyticsSummary } from '../types';
import { CardSkeleton } from '../components/common/Skeleton';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { EmptyState } from '../components/common/EmptyState';
import { DemoBadge } from '../components/common/Badge';

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

export const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      setError(null);
      const data = await getAnalyticsSummary();
      setSummary(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getAnalyticsSummary()
      .then((data) => {
        if (isMounted) {
          setSummary(data);
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton className="h-80" />
          <CardSkeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        title="Failed to Load Analytics"
        message={error}
        onRetry={() => fetchAnalytics(true)}
      />
    );
  }

  if (!summary || summary.total_incidents === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            Operational Telemetry & Impact
          </h2>
        </div>
        <EmptyState
          title="No analytics telemetry available"
          description="Zero incidents found in database. Once incidents are recorded and resolved, performance telemetry will render automatically."
          actionText="Declare an Incident"
          onAction={() => window.location.assign('/incidents/new')}
        />
      </div>
    );
  }

  const memory = summary.memory_impact;
  const isLiveCredible = hasEnoughLiveSamples(
    memory?.basis,
    memory?.live_samples_count,
    summary.live_incidents
  );

  const demoBenchmark = memory?.demo_benchmark;

  // Chart data: Service breakdown
  const serviceChartData = Object.entries(summary.service_breakdown).map(([service, count]) => ({
    service,
    incidents: count,
  }));

  // Chart data: Severity breakdown
  const severityChartData = Object.entries(summary.severity_breakdown)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({
      name,
      value,
    }));

  // Chart data: MTTR Comparison (only if both non-null and credible)
  const canRenderMttrChart =
    isLiveCredible &&
    memory?.avg_minutes_to_resolve_without_memory !== null &&
    memory?.avg_minutes_to_resolve_without_memory !== undefined &&
    memory?.avg_minutes_to_resolve_with_memory !== null &&
    memory?.avg_minutes_to_resolve_with_memory !== undefined;

  const mttrComparisonData = canRenderMttrChart
    ? [
        {
          category: 'Without Memory (Zero-Shot)',
          minutes: Number(memory.avg_minutes_to_resolve_without_memory!.toFixed(1)),
          fill: '#64748b',
        },
        {
          category: 'With Hindsight Memory',
          minutes: Number(memory.avg_minutes_to_resolve_with_memory!.toFixed(1)),
          fill: '#14b8a6',
        },
      ]
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Contract Telemetry
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {summary.live_incidents ?? '0'} live incidents recorded
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1.5 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-400" />
            Operational Telemetry & Memory Impact
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real metrics benchmarking mean-time-to-resolution (MTTR) with and without Hindsight memory.
          </p>
        </div>

        <button
          onClick={() => fetchAnalytics(true)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer self-start sm:self-auto"
          title="Refresh metrics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Top Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: MTTR Time Saved */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono">
              <span>MTTR Time Saved</span>
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              {isLiveCredible && memory.time_saved_percentage !== null ? (
                <div className="text-3xl font-black text-emerald-300 font-mono">
                  {memory.time_saved_percentage.toFixed(1)}%
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold text-amber-400 block">
                    Not enough live data yet
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Requires ≥5 live runs
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
            Average resolution acceleration
          </div>
        </div>

        {/* Metric 2: MTTR With Memory */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono">
              <span>MTTR With Memory</span>
              <Brain className="w-4 h-4 text-teal-400" />
            </div>
            <div className="mt-3">
              {isLiveCredible && memory.avg_minutes_to_resolve_with_memory !== null ? (
                <div className="text-3xl font-black text-teal-300 font-mono">
                  {memory.avg_minutes_to_resolve_with_memory.toFixed(1)}{' '}
                  <span className="text-xs font-sans text-slate-400 font-normal">min</span>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold text-amber-400 block">
                    Not enough live data yet
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Requires ≥5 live runs
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
            {isLiveCredible && memory.avg_minutes_to_resolve_without_memory !== null
              ? `Down from ${memory.avg_minutes_to_resolve_without_memory.toFixed(1)}m`
              : 'Statistical significance threshold'}
          </div>
        </div>

        {/* Metric 3: Recall Hit Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono">
              <span>Recall Hit Rate</span>
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div className="mt-3">
              {isLiveCredible && memory.recall_hit_rate !== null ? (
                <div className="text-3xl font-black text-violet-300 font-mono">
                  {Math.round(memory.recall_hit_rate * 100)}%
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold text-amber-400 block">
                    Not enough live data yet
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Never showing 0% or 100% blindly
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* recall_hit_rate_note display beneath it */}
          <div className="mt-3 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 leading-snug">
            {memory.recall_hit_rate_note ? (
              <span className="text-slate-400 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{memory.recall_hit_rate_note}</span>
              </span>
            ) : (
              <span>Relevant past post-mortems retrieved</span>
            )}
          </div>
        </div>

        {/* Metric 4: Feedback Acceptance Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono">
              <span>Engineer Acceptance</span>
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-3">
              {isLiveCredible && memory.feedback_accept_rate !== null ? (
                <div className="text-3xl font-black text-sky-300 font-mono">
                  {Math.round(memory.feedback_accept_rate * 100)}%
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold text-amber-400 block">
                    Not enough live data yet
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Awaiting engineer feedback submissions
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
            Accepted AI recommendations
          </div>
        </div>
      </div>

      {/* SEPARATE DEMO BENCHMARK SECTION (Clearly labelled, never mixed into live metrics) */}
      {demoBenchmark && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/40 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-base font-bold text-purple-200 flex items-center gap-2">
                  Sample data (synthetic)
                  <DemoBadge />
                </h3>
                <p className="text-xs text-slate-400">
                  Isolated benchmark dataset for demonstration and training. Never aggregated with live operational metrics.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-purple-950 border border-purple-600/50 text-purple-300 self-start sm:self-auto">
              Basis: {demoBenchmark.basis}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Synthetic Incident Pool</span>
              <span className="font-mono font-bold text-slate-100 text-2xl block">
                {demoBenchmark.total_sample_incidents}
              </span>
              <span className="text-[11px] text-slate-500 block">Generated failure post-mortems</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Resolved Samples</span>
              <span className="font-mono font-bold text-emerald-400 text-2xl block">
                {demoBenchmark.resolved_sample_incidents}
              </span>
              <span className="text-[11px] text-slate-500 block">Pre-trained into Hindsight memory</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Avg Sample MTTR</span>
              <span className="font-mono font-bold text-teal-300 text-2xl block">
                {demoBenchmark.avg_sample_resolution_minutes.toFixed(1)} min
              </span>
              <span className="text-[11px] text-slate-500 block">Simulated resolution cycle time</span>
            </div>
          </div>
        </div>
      )}

      {/* Row: MTTR Impact Bar Chart + Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: MTTR Comparison Chart (or Honest Gated State) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                Mean Time to Resolution (MTTR) Comparison
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Resolution duration in minutes: Zero-shot triage vs Hindsight memory recall
              </p>
            </div>
            {/* Render time_saved_percentage ONLY if non-null and live credible */}
            {canRenderMttrChart &&
            memory.time_saved_percentage !== null &&
            memory.time_saved_percentage !== undefined ? (
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
                -{memory.time_saved_percentage.toFixed(0)}% Duration
              </span>
            ) : null}
          </div>

          {canRenderMttrChart ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrComparisonData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} unit=" min" />
                  <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={11} width={160} />
                  <Tooltip
                    formatter={(val) => [`${val} minutes`, 'Avg MTTR']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="minutes" radius={[0, 6, 6, 0]}>
                    {mttrComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center p-6 rounded-xl bg-slate-950/70 border border-slate-800 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Not enough live data yet
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                MTTR charts are withheld until at least 5 live incident resolutions are recorded to prevent presenting premature or deceptive metrics.
              </p>
            </div>
          )}

          <div className="pt-2 text-xs text-slate-400 italic">
            TraceMind grounds recommendations in verified past resolutions, eliminating repetitive triage loops.
          </div>
        </div>

        {/* Right 5 cols: Severity Breakdown Pie */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-400" />
              Incidents by Severity
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribution across severity tiers</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
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

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
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
      </div>

      {/* Row 2: Service Distribution Bar Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              Incident Hotspots by Microservice
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies which services encounter the highest frequency of recurring incidents
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serviceChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="service" stroke="#94a3b8" fontSize={11} angle={-20} textAnchor="end" />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="incidents" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
