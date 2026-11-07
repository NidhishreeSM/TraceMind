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
        <div className="flex items-center justify-between pb-3 border-b border-white/8">
          <h2 className="text-xl sm:text-2xl font-normal text-white tracking-wide">
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
          fill: '#8FA0BF',
        },
        {
          category: 'With Memory',
          minutes: Number(memory.avg_minutes_to_resolve_with_memory!.toFixed(1)),
          fill: '#3B82F6',
        },
      ]
    : [];

  // Severity Donut Data
  const severityDonutData = [
    { name: 'Critical', value: summary?.severity_breakdown?.critical || 0, color: '#FFFFFF' },
    { name: 'High', value: summary?.severity_breakdown?.high || 0, color: '#3B82F6' },
    { name: 'Medium', value: summary?.severity_breakdown?.medium || 0, color: '#C9D6EA' },
    { name: 'Low', value: summary?.severity_breakdown?.low || 0, color: '#1D4ED8' },
  ];
  const totalSeverityCount = severityDonutData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
        <div>
          <h2 className="text-xl sm:text-2xl font-normal text-white tracking-wide">
            Analytics
          </h2>
          <p className="text-xs sm:text-sm text-[#8FA0BF] mt-0.5">
            Operational metrics, MTTR impact, and distribution with Hindsight memory.
          </p>
        </div>

        <button
          onClick={() => fetchAnalytics(true)}
          className="p-2 rounded-full border border-white/20 text-[#8FA0BF] hover:text-white hover:bg-white/5 transition cursor-pointer self-start sm:self-auto"
          title="Refresh metrics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Top Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: MTTR Time Saved */}
        <div className="p-5 rounded-2xl bg-[#0B1530] border border-white/8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-[#8FA0BF] uppercase font-mono">
              <span>Time saved</span>
              <TrendingDown className="w-3.5 h-3.5 text-[#3B82F6]" />
            </div>
            <div className="mt-2.5">
              {isLiveCredible && memory.time_saved_percentage !== null ? (
                <div className="text-2xl font-bold text-white font-mono">
                  {memory.time_saved_percentage.toFixed(1)}%
                </div>
              ) : (
                <p className="text-xs text-[#8FA0BF]">
                  Needs at least 5 live resolved incidents
                </p>
              )}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/8 text-xs text-[#8FA0BF]">
            MTTR reduction percentage
          </div>
        </div>

        {/* Metric 2: MTTR With Memory */}
        <div className="p-5 rounded-2xl bg-[#0B1530] border border-white/8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-[#8FA0BF] uppercase font-mono">
              <span>MTTR with memory</span>
              <Brain className="w-3.5 h-3.5 text-[#C9D6EA]" />
            </div>
            <div className="mt-2.5">
              {isLiveCredible && memory.avg_minutes_to_resolve_with_memory !== null ? (
                <div className="text-2xl font-bold text-white font-mono">
                  {memory.avg_minutes_to_resolve_with_memory.toFixed(1)}{' '}
                  <span className="text-xs font-sans text-[#8FA0BF] font-normal">min</span>
                </div>
              ) : (
                <p className="text-xs text-[#8FA0BF]">
                  Needs at least 5 live resolved incidents
                </p>
              )}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/8 text-xs text-[#8FA0BF]">
            {isLiveCredible && memory.avg_minutes_to_resolve_without_memory !== null
              ? `Down from ${memory.avg_minutes_to_resolve_without_memory.toFixed(1)}m`
              : 'Statistical significance threshold'}
          </div>
        </div>

        {/* Metric 3: Recall Hit Rate */}
        <div className="p-5 rounded-2xl bg-[#0B1530] border border-white/8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-[#8FA0BF] uppercase font-mono">
              <span>Recall hit rate</span>
              <Sparkles className="w-3.5 h-3.5 text-[#C9D6EA]" />
            </div>
            <div className="mt-2.5">
              {isLiveCredible && memory.recall_hit_rate !== null ? (
                <div className="text-2xl font-bold text-white font-mono">
                  {Math.round(memory.recall_hit_rate * 100)}%
                </div>
              ) : (
                <p className="text-xs text-[#8FA0BF]">
                  Needs at least 5 live resolved incidents
                </p>
              )}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/8 text-xs text-[#8FA0BF]">
            {memory.recall_hit_rate_note ? (
              <span className="flex items-start gap-1">
                <Info className="w-3.5 h-3.5 text-[#8FA0BF] shrink-0 mt-0.5" />
                <span>{memory.recall_hit_rate_note}</span>
              </span>
            ) : (
              <span className="font-mono text-[#8FA0BF]">
                Basis: {memory.basis === 'live_runs' ? 'Live Telemetry' : 'Insufficient live data'}
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Live vs Sample Incidents */}
        <div className="p-5 rounded-2xl bg-[#0B1530] border border-white/8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-[#8FA0BF] uppercase font-mono">
              <span>Dataset split</span>
              <span className="font-mono text-[#8FA0BF]">{summary.total_incidents} total</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">
                {summary.live_incidents ?? 0}
              </span>
              <span className="text-xs text-[#8FA0BF] font-sans">live incidents</span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/8 text-xs text-[#8FA0BF]">
            {summary.demo_incidents ?? 0} sample (synthetic) incidents
          </div>
        </div>
      </div>

      {/* Main Charts Grid: 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Severity Distribution Donut */}
        <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8 space-y-4">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-white font-mono">
              Severity Distribution
            </h3>
            <p className="text-xs text-[#8FA0BF] mt-0.5">Tonal breakdown across incidents</p>
          </div>

          <div className="relative h-52 w-full flex items-center justify-center">
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

        {/* Chart 2: With vs Without Memory MTTR */}
        <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8 space-y-4">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-white font-mono">
              Mean Time to Resolution (MTTR)
            </h3>
            <p className="text-xs text-[#8FA0BF] mt-0.5">
              Live MTTR comparison in minutes
            </p>
          </div>

          {canRenderMttrChart ? (
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="category" stroke="#8FA0BF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#8FA0BF" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#101C3D',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="minutes" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center p-6 bg-[#101C3D] rounded-2xl border border-white/5 text-center space-y-2">
              <p className="text-xs text-white font-medium">Needs at least 5 live resolved incidents</p>
              <p className="text-xs text-[#8FA0BF] max-w-xs leading-relaxed">
                Real MTTR comparison is rendered when sufficient live production samples are available.
              </p>
            </div>
          )}
        </div>

        {/* Chart 3: Incidents by Service */}
        <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8 space-y-4">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-white font-mono">
              Incidents by Service
            </h3>
            <p className="text-xs text-[#8FA0BF] mt-0.5">Distribution across services</p>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="service" stroke="#8FA0BF" tick={{ fontSize: 10 }} />
                <YAxis stroke="#8FA0BF" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101C3D',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="incidents" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sample Data (Synthetic) Section */}
      {demoBenchmark && (
        <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/8">
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
            Seeded benchmark metrics used to evaluate Hindsight pattern matching and retrieval capability.
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
    </div>
  );
};
