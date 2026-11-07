import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Incidents
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Active and resolved system anomalies across services.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Seeded incidents (<span className="font-mono text-slate-300">INC-DEMO-*</span>) are synthetic benchmark records.</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchIncidents(true)}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition cursor-pointer"
            title="Refresh list"
            aria-label="Refresh incident list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/incidents/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            Declare Incident
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, title, symptoms, or logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-teal-500 transition"
            />
          </div>

          {/* Service Filter */}
          <div className="w-full md:w-44">
            <input
              type="text"
              placeholder="Filter by service..."
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-teal-500 transition"
            />
          </div>

          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            Filter
          </button>
        </form>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 flex items-center gap-1 text-[11px] font-mono mr-1">
              <SlidersHorizontal className="w-3 h-3" /> Status:
            </span>
            {['all', 'open', 'investigating', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded capitalize text-xs font-medium transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}

            <span className="text-slate-700 mx-1">|</span>

            <span className="text-slate-400 flex items-center gap-1 text-[11px] font-mono mr-1">
              Severity:
            </span>
            {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2 py-0.5 rounded capitalize text-xs font-medium transition cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-2 transition cursor-pointer"
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
          onAction={hasActiveFilters ? resetFilters : () => navigate('/incidents/new')}
        />
      )}

      {!loading && !error && incidents.length > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 min-w-[130px]">Incident ID</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Severity</th>
                  <th className="py-2.5 px-3 min-w-[260px]">Title & Symptoms</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Service</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Status</th>
                  <th className="py-2.5 px-3 min-w-[160px] whitespace-nowrap">Occurred</th>
                  <th className="py-2.5 px-3 min-w-[90px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-slate-800/40 transition group cursor-pointer"
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                  >
                    {/* ID */}
                    <td className="py-2.5 px-3 font-mono font-bold text-teal-400 whitespace-nowrap">
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
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <SeverityBadge severity={incident.severity} />
                    </td>

                    {/* Title */}
                    <td className="py-2.5 px-3 max-w-sm">
                      <div
                        className="font-medium text-slate-200 group-hover:text-white transition truncate"
                        title={incident.title}
                      >
                        {incident.title}
                      </div>
                      <div
                        className="text-xs text-slate-400 truncate mt-0.5"
                        title={incident.symptoms}
                      >
                        {incident.symptoms}
                      </div>
                    </td>

                    {/* Service & Env */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          {incident.service}
                        </span>
                        <EnvironmentBadge env={incident.environment} />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusBadge status={incident.status} />
                    </td>

                    {/* Created At / Occurred */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs text-slate-400">
                      <span title={new Date(incident.created_at).toISOString()}>
                        {new Date(incident.created_at).toLocaleDateString()}{' '}
                        {new Date(incident.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Action link */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <Link
                        to={`/incidents/${incident.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 transition"
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
          <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {incidents.length} recorded incident(s)</span>
          </div>
        </div>
      )}
    </div>
  );
};
