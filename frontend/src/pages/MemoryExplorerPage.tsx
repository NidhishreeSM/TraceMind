import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Search,
  ExternalLink,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';
import { recallMemory, getMemoryStats, extractErrorMessage } from '../api';
import { RecalledMemory, MemoryStatsResponse } from '../types';
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
  const [memoryStats, setMemoryStats] = useState<MemoryStatsResponse | null>(null);
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
      if (isMounted && s) {
        setMemoryStats(s);
        if (s.bank_id) setBankId(s.bank_id);
      }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div>
          <h2 className="text-xl sm:text-2xl font-normal text-[#F1F5F9] tracking-wide">
            Memory Explorer
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
            Query past incident resolutions and verified post-mortems in Hindsight memory.
          </p>
        </div>

        {/* Real bank stats */}
        <div className="flex items-center gap-2.5 text-xs font-mono text-[#94A3B8] shrink-0">
          <div className="px-3 py-1 rounded-full bg-[#131C31] border border-white/[0.07]">
            <span>Bank: </span>
            <span className="text-[#F1F5F9] font-semibold">{bankId}</span>
          </div>
          {memoryStats?.total_documents != null && (
            <div className="px-3 py-1 rounded-full bg-[#131C31] border border-white/[0.07]">
              <span>Post-mortems: </span>
              <span className="text-[#F1F5F9] font-semibold">{memoryStats.total_documents}</span>
            </div>
          )}
          {memoryStats?.total_nodes != null && (
            <div className="px-3 py-1 rounded-full bg-[#131C31] border border-white/[0.07]">
              <span>Facts: </span>
              <span className="text-[#F1F5F9] font-semibold">{memoryStats.total_nodes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Input Box */}
      <div className="p-6 rounded-2xl bg-[#0E1628] border border-white/[0.07] space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by symptom, service, or error signature..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#131C31] border border-white/[0.07] rounded-xl text-xs sm:text-sm text-[#F1F5F9] placeholder-[#94A3B8]/60 focus:outline-hidden focus:border-[#8B5CF6] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-[#C9D6EA] text-[#080E1D] text-xs font-semibold transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Brain className={`w-3.5 h-3.5 text-[#080E1D] ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Searching...' : 'Recall'}
          </button>
        </form>

        {/* Example Query Chips */}
        <div className="pt-3 border-t border-white/[0.07] flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#94A3B8] font-mono flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3 h-3" /> Examples:
          </span>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleChipClick(example)}
              className="px-3 py-1 rounded-full text-xs font-mono bg-[#131C31] hover:bg-white/10 border border-white/[0.07] text-[#94A3B8] hover:text-[#F1F5F9] transition cursor-pointer"
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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && searched && results.length === 0 && (
        <EmptyState
          title="No matching memories"
          description={`No past resolutions or incident experiences found in bank "${bankId}" matching "${query}".`}
          actionText="Try an example query"
          onAction={() => handleChipClick('database connection pool leak')}
        />
      )}

      {/* Compact List Results */}
      {!loading && !error && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#94A3B8] font-mono px-1">
            <span>
              <strong className="text-[#F1F5F9] font-bold">{results.length}</strong> matching memories retrieved
            </span>
            <span>Query: &ldquo;{query}&rdquo;</span>
          </div>

          <div className="space-y-3">
            {results.map((mem, index) => {
              const incidentId =
                mem.source_incident_id ||
                (mem.metadata?.incident_id as string) ||
                mem.text.match(/INC-[\w-]+/)?.[0] ||
                null;

              const service = (mem.metadata?.service as string) || null;
              const scoreValue =
                mem.score !== undefined && mem.score !== null
                  ? typeof mem.score === 'number'
                    ? mem.score.toFixed(2)
                    : String(mem.score)
                  : null;

              return (
                <div
                  key={mem.id || `mem-${index}`}
                  className="p-5 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/35 space-y-2.5 hover:border-[#8B5CF6]/60 transition"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F1F5F9]">{mem.id || `MEM-${index + 1}`}</span>
                      {service && (
                        <span className="px-2 py-0.5 rounded-full bg-[#131C31] text-[#94A3B8] text-[10px] border border-white/[0.07]">
                          {service}
                        </span>
                      )}
                      {scoreValue && (
                        <span className="text-[#8B5CF6] text-[11px]">Score: {scoreValue}</span>
                      )}
                    </div>

                    {incidentId ? (
                      <Link
                        to={`/incidents/${incidentId}`}
                        className="text-xs text-[#8B5CF6] hover:underline flex items-center gap-1"
                      >
                        Source: {incidentId} <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-[#94A3B8] text-[11px]">Synthesized</span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[#F1F5F9] leading-relaxed font-sans">
                    {mem.text}
                  </p>

                  {mem.entities && mem.entities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {mem.entities.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#131C31] border border-white/[0.07] text-[#94A3B8]"
                        >
                          <Tag className="w-2.5 h-2.5 text-[#94A3B8]" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
