import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingDown,
  Brain,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';
import { getAnalyticsSummary, extractErrorMessage } from '../api';
import { AnalyticsSummary } from '../types';
import { CardSkeleton } from '../components/common/Skeleton';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { EmptyState } from '../components/common/EmptyState';
import { DemoBadge } from '../components/common/Badge';

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
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Analytics
          </h2>
        </div>
        <EmptyState
          title="No analytics telemetry available"
          description="Zero incidents found. As incidents are recorded and resolved, telemetry will appear here."
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
          category: 'Without Memory',
          minutes: Number(memory.avg_minutes_to_resolve_without_memory!.toFixed(1)),
          fill: '#64748b',
        },
        {
          category: 'With Memory',
          minutes: Number(memory.avg_minutes_to_resolve_with_memory!.toFixed(1)),
          fill: '#14b8a6',
        },
      ]
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Operational metrics and MTTR impact with vs without Hindsight memory.
          </p>
        </div>

        <button
          onClick={() => fetchAnalytics(true)}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer self-start sm:self-auto"
          title="Refresh metrics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Top Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: MTTR Time Saved */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono">
              <span>Time saved</span>
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2.5">
              {isLiveCredible && memory.time_saved_percentage !== null ? (
                <div className="text-2xl font-bold text-emerald-300 font-mono">
                  {memory.time_saved_percentage.toFixed(1)}%
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Needs at least 5 live resolved incidents
                </p>
              )}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-xs text-slate-500">
            MTTR reduction percentage
          </div>
        </div>

        {/* Metric 2: MTTR With Memory */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono">
              <span>MTTR with memory</span>
              <Brain className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="mt-2.5">
              {isLiveCredible && memory.avg_minutes_to_resolve_with_memory !== null ? (
                <div className="text-2xl font-bold text-teal-300 font-mono">
                  {memory.avg_minutes_to_resolve_with_memory.toFixed(1)}{' '}
                  <span className="text-xs font-sans text-slate-400 font-normal">min</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Needs at least 5 live resolved incidents
                </p>
              )}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-xs text-slate-500">
            {isLiveCredible && memory.avg_minutes_to_resolve_without_memory !== null
              ? `Down from ${memory.avg_minutes_to_resolve_without_memory.toFixed(1)}m`
              : 'Statistical significance threshold'}
          </div>
        </div>

        {/* Metric 3: Recall Hit Rate */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono">
              <span>Recall hit rate</span>
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="mt-2.5">
              {isLiveCredible && memory.recall_hit_rate !== null ? (
                <div className="text-2xl font-bold text-slate-100 font-mono">
                  {Math.round(memory.recall_hit_rate * 100)}%
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Needs at least 5 live resolved incidents
                </p>
              )}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            {memory.recall_hit_rate_note ? (
              <span className="flex items-start gap-1">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{memory.recall_hit_rate_note}</span>
              </span>
            ) : (
              <span className="text-slate-500 font-mono">
                Basis: {memory.basis === 'live_runs' ? 'Live Telemetry' : 'Insufficient live data'}
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Live vs Sample Incidents */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-mono">
              <span>Dataset split</span>
              <span className="font-mono text-slate-500">{summary.total_incidents} total</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-100 font-mono">
                {summary.live_incidents ?? 0}
              </span>
              <span className="text-xs text-slate-400 font-sans">live incidents</span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-xs text-slate-500">
            {summary.demo_incidents ?? 0} sample (synthetic) incidents
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: With vs Without Memory MTTR */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Mean Time to Resolution (MTTR)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live MTTR comparison in minutes
            </p>
          </div>

          {canRenderMttrChart ? (
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="category" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-lg border border-slate-800/80 text-center space-y-1">
              <p className="text-xs text-slate-400 font-medium">Needs at least 5 live resolved incidents</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Real MTTR comparison is rendered only when sufficient live production samples are available.
              </p>
            </div>
          )}
        </div>

        {/* Chart 2: Incidents by Service */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Incidents by Service
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribution across services</p>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="service" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="incidents" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
            Seeded benchmark metrics used to evaluate Hindsight pattern matching and retrieval capability.
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
                {demoBenchmark.avg_sample_resolution_minutes.toFixed(1)} min
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
