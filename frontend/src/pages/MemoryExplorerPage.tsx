import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Search,
  Sparkles,
  ExternalLink,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';
import { recallMemory, getMemoryStats, extractErrorMessage } from '../api';
import { RecalledMemory } from '../types';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { CardSkeleton } from '../components/common/Skeleton';
import { useToast } from '../context';

const EXAMPLE_QUERIES = [
  'database connection pool leak in payment service',
  'JWT signature validation failure on key rotation',
  'Kafka consumer rebalance storm from unbounded batch processing',
  'Redis cache cluster connection timeout under load',
];

export const MemoryExplorerPage: React.FC = () => {
  const toast = useToast();
  const [query, setQuery] = useState('database connection pool leak');
  const [bankId, setBankId] = useState<string>('TraceMind');
  const [results, setResults] = useState<RecalledMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchQueryText?: string) => {
    const q = (searchQueryText !== undefined ? searchQueryText : query).trim();
    if (!q) {
      toast.warning('Please enter a query to recall memories from Hindsight.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // POST /api/memory/recall sends { query }
      const res = await recallMemory({ query: q });
      setResults(res.results || []);
      setSearched(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    getMemoryStats().then((s) => {
      if (isMounted && s?.bank_id) setBankId(s.bank_id);
    }).catch(() => {});

    recallMemory({ query: 'database connection pool leak' })
      .then((res) => {
        if (isMounted) {
          setResults(res.results || []);
          setSearched(true);
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

  const handleChipClick = (example: string) => {
    setQuery(example);
    handleSearch(example);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Institutional Retain & Recall
              </span>
              <span className="text-xs text-slate-400 font-mono">Bank: {bankId}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1.5 flex items-center gap-2">
              <Brain className="w-6 h-6 text-teal-400" />
              Hindsight Memory Explorer
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-xl">
              Inspect semantic memory clusters, verified post-mortem resolutions, and past incident experiences.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-950/80 border border-teal-500/40 text-teal-300 text-xs font-mono self-start sm:self-auto">
            <Sparkles className="w-4 h-4 text-teal-400" />
            Powered by Hindsight
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search institutional memory by symptoms, technology, or error signature..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-teal-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-teal-950/40 transition cursor-pointer disabled:opacity-50"
            >
              <Brain className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Recalling...' : 'Recall Memory'}
            </button>
          </div>
        </form>

        {/* Example Query Chips */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" /> Examples:
          </span>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleChipClick(example)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && <ErrorBanner message={error} onRetry={() => handleSearch()} />}

      {/* Loading state */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} className="h-44" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && searched && results.length === 0 && (
        <EmptyState
          title="No institutional memories found"
          description={`Hindsight found no indexed incident experiences matching "${query}". Try broadening keywords or search for database or authentication issues.`}
          actionText="Try Example Query"
          onAction={() => handleChipClick('database connection pool leak')}
        />
      )}

      {/* Results Cards Grid */}
      {!loading && !error && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>
              Retrieved <strong className="text-teal-400">{results.length}</strong> verified memories from Hindsight
            </span>
            <span>Query: &ldquo;{query}&rdquo;</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((mem) => {
              const incidentId = (mem.metadata?.incident_id as string) || null;
              const service = (mem.metadata?.service as string) || null;

              return (
                <div
                  key={mem.id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3.5 hover:border-teal-500/50 transition group flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Card Top: ID and Type Badge */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-teal-400">{mem.id}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize text-[10px] border border-slate-700">
                          {mem.type || 'experience'}
                        </span>
                        {service && (
                          <span className="px-2 py-0.5 rounded bg-teal-950/70 text-teal-300 text-[10px] border border-teal-800">
                            {service}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Memory Content Text */}
                    <p className="text-sm text-slate-200 leading-relaxed font-sans">
                      {mem.text}
                    </p>

                    {/* Entities Tags */}
                    {mem.entities && mem.entities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {mem.entities.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400"
                          >
                            <Tag className="w-2.5 h-2.5 text-slate-500" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Source Incident Link */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {incidentId ? (
                      <Link
                        to={`/incidents/${incidentId}`}
                        className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 font-medium group-hover:underline transition"
                      >
                        Inspect Source: {incidentId} <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Synthetic Knowledge Record</span>
                    )}

                    <span className="text-[10px] font-mono text-slate-500">
                      Bank: {bankId}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
