import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  RefreshCw,
  ChevronRight,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { getIncidents, extractErrorMessage } from '../api';
import { Incident, Status, Severity } from '../types';
import { SeverityBadge, StatusBadge, DemoBadge, EnvironmentBadge } from '../components/common/Badge';
import { TableSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorBanner } from '../components/common/ErrorBanner';

export const IncidentsListPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [demoOnlyFilter, setDemoOnlyFilter] = useState<boolean | null>(null);

  const fetchIncidents = async (isManual = true) => {
    try {
      if (isManual) setLoading(true);
      setError(null);
      const res = await getIncidents({
        status: statusFilter !== 'all' ? (statusFilter as Status) : undefined,
        severity: severityFilter !== 'all' ? (severityFilter as Severity) : undefined,
        service: serviceFilter.trim() || undefined,
        search: searchQuery.trim() || undefined,
        is_demo: demoOnlyFilter === null ? undefined : demoOnlyFilter,
        limit: 100,
      });
      setIncidents(res.items || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      getIncidents({
        status: statusFilter !== 'all' ? (statusFilter as Status) : undefined,
        severity: severityFilter !== 'all' ? (severityFilter as Severity) : undefined,
        service: serviceFilter.trim() || undefined,
        search: searchQuery.trim() || undefined,
        is_demo: demoOnlyFilter === null ? undefined : demoOnlyFilter,
        limit: 100,
      })
        .then((res) => {
          if (isMounted) {
            setIncidents(res.items || []);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(extractErrorMessage(err));
            setLoading(false);
          }
        });
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [statusFilter, severityFilter, serviceFilter, searchQuery, demoOnlyFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIncidents();
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setSeverityFilter('all');
    setServiceFilter('');
    setSearchQuery('');
    setDemoOnlyFilter(null);
  };

  const hasActiveFilters =
    statusFilter !== 'all' ||
    severityFilter !== 'all' ||
    serviceFilter !== '' ||
    searchQuery !== '' ||
    demoOnlyFilter !== null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
        <div>
          <h2 className="text-xl sm:text-2xl font-normal text-white tracking-wide">
            Incidents
          </h2>
          <p className="text-xs sm:text-sm text-[#8FA0BF] mt-0.5">
            Active and resolved system anomalies across services.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[#8FA0BF] mt-1.5">
            <Info className="w-3.5 h-3.5 text-[#8FA0BF] shrink-0" />
            <span>
              Seeded incidents (<span className="font-mono text-white">INC-DEMO-*</span>) are synthetic benchmark records.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchIncidents(true)}
            disabled={loading}
            className="p-2 rounded-full border border-white/20 text-[#8FA0BF] hover:text-white hover:bg-white/5 transition cursor-pointer"
            title="Refresh list"
            aria-label="Refresh incident list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/incidents/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#C9D6EA] text-[#050B1A] text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            Declare Incident
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-5 rounded-3xl bg-[#0B1530] border border-white/8 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA0BF]" />
            <input
              type="text"
              placeholder="Search by ID, title, symptoms, or logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#101C3D] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-[#8FA0BF]/60 focus:outline-hidden focus:border-[#3B82F6] transition"
            />
          </div>

          {/* Service Filter */}
          <div className="w-full md:w-48">
            <input
              type="text"
              placeholder="Filter by service..."
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#101C3D] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-[#8FA0BF]/60 focus:outline-hidden focus:border-[#3B82F6] transition"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2 rounded-full border border-white/30 text-white hover:bg-white/5 text-xs font-semibold transition cursor-pointer shrink-0"
          >
            Filter
          </button>
        </form>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/8 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#8FA0BF] flex items-center gap-1 text-[11px] font-mono mr-1">
              <SlidersHorizontal className="w-3 h-3" /> Status:
            </span>
            {['all', 'open', 'investigating', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full capitalize text-xs transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-[#050B1A] font-semibold'
                    : 'bg-[#101C3D] text-[#8FA0BF] border border-white/10 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}

            <span className="text-white/20 mx-1">|</span>

            <span className="text-[#8FA0BF] flex items-center gap-1 text-[11px] font-mono mr-1">
              Severity:
            </span>
            {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-full capitalize text-xs transition cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-white text-[#050B1A] font-semibold'
                    : 'bg-[#101C3D] text-[#8FA0BF] border border-white/10 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#8FA0BF] hover:text-white underline underline-offset-2 transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && <ErrorBanner message={error} onRetry={fetchIncidents} />}

      {/* Loading state */}
      {loading && !error && <TableSkeleton rows={8} cols={6} />}

      {/* Incidents Table */}
      {!loading && !error && incidents.length === 0 && (
        <EmptyState
          title="No incidents match your criteria"
          description={
            hasActiveFilters
              ? 'Try widening your filters or clearing search terms to locate records.'
              : 'Zero incidents found in database. Seed sample data or declare a new incident.'
          }
          actionText={hasActiveFilters ? 'Clear Filters' : 'Declare Incident'}
          onAction={hasActiveFilters ? resetFilters : () => window.location.assign('/incidents/new')}
        />
      )}

      {!loading && !error && incidents.length > 0 && (
        <div className="rounded-3xl bg-[#0B1530] border border-white/8 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[850px]">
              <thead>
                <tr className="border-b border-white/8 bg-[#101C3D]/40 text-[#8FA0BF] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[130px]">Incident ID</th>
                  <th className="py-3 px-4 min-w-[100px]">Severity</th>
                  <th className="py-3 px-4 min-w-[260px]">Title & Symptoms</th>
                  <th className="py-3 px-4 min-w-[150px]">Service</th>
                  <th className="py-3 px-4 min-w-[110px]">Status</th>
                  <th className="py-3 px-4 min-w-[160px] whitespace-nowrap">Occurred</th>
                  <th className="py-3 px-4 min-w-[90px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-[#101C3D]/50 transition group cursor-pointer"
                    onClick={() => window.location.assign(`/incidents/${incident.id}`)}
                  >
                    {/* ID */}
                    <td className="py-3 px-4 font-mono font-medium text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/incidents/${incident.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {incident.id}
                        </Link>
                        {incident.is_demo && <DemoBadge />}
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <SeverityBadge severity={incident.severity} />
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 max-w-sm">
                      <div
                        className="font-normal text-white group-hover:text-white transition truncate"
                        title={incident.title}
                      >
                        {incident.title}
                      </div>
                      <div
                        className="text-xs text-[#8FA0BF] truncate mt-0.5"
                        title={incident.symptoms}
                      >
                        {incident.symptoms}
                      </div>
                    </td>

                    {/* Service & Env */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-[#8FA0BF] bg-[#101C3D] px-2 py-0.5 rounded border border-white/5">
                          {incident.service}
                        </span>
                        <EnvironmentBadge env={incident.environment} />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={incident.status} />
                    </td>

                    {/* Created At / Occurred */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-[#8FA0BF]">
                      <span title={new Date(incident.created_at).toISOString()}>
                        {new Date(incident.created_at).toLocaleDateString()}{' '}
                        {new Date(incident.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Action link */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/incidents/${incident.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#C9D6EA] hover:text-white transition"
                      >
                        Investigate <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer info */}
          <div className="p-4 border-t border-white/8 bg-[#101C3D]/20 flex items-center justify-between text-xs text-[#8FA0BF]">
            <span>Showing {incidents.length} recorded incident(s)</span>
          </div>
        </div>
      )}
    </div>
  );
};
