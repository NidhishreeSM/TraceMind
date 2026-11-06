import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Brain,
  Sparkles,
  CheckCircle2,
  Clock,
  Terminal,
  Copy,
  Check,
  ShieldAlert,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Columns,
  ExternalLink,
} from 'lucide-react';
import { getIncident, analyzeIncident, getMemoryStats, extractErrorMessage } from '../api';
import {
  IncidentDetail,
  Analysis,
  Feedback,
  ResolveResponse,
  FeedbackType,
} from '../types';
import { SeverityBadge, StatusBadge, DemoBadge, EnvironmentBadge } from '../components/common/Badge';
import { CardSkeleton } from '../components/common/Skeleton';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { ResolveModal } from '../components/incident/ResolveModal';
import { FeedbackModal } from '../components/incident/FeedbackModal';
import { useToast } from '../context';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [bankId, setBankId] = useState<string>('TraceMind');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Analysis states
  const [useMemory, setUseMemory] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);

  // Compare mode state: holds both without-memory and with-memory analyses side by side
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [zeroShotAnalysis, setZeroShotAnalysis] = useState<Analysis | null>(null);
  const [memoryAnalysis, setMemoryAnalysis] = useState<Analysis | null>(null);
  const [runningCompare, setRunningCompare] = useState<boolean>(false);

  // Modals state
  const [resolveModalOpen, setResolveModalOpen] = useState<boolean>(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState<boolean>(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('accept');

  // Copied log feedback
  const [copiedLog, setCopiedLog] = useState<boolean>(false);

  const loadIncident = useCallback(async (isManual = false) => {
    if (!id) return;
    try {
      if (isManual) setLoading(true);
      setError(null);
      const data = await getIncident(id);
      setIncident(data);

      // Default current analysis to latest if available
      if (data.analyses && data.analyses.length > 0) {
        const latest = data.analyses[data.analyses.length - 1];
        setCurrentAnalysis(latest);
        if (latest.use_memory) {
          setMemoryAnalysis(latest);
        } else {
          setZeroShotAnalysis(latest);
        }
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    getMemoryStats().then((s) => {
      if (isMounted && s?.bank_id) setBankId(s.bank_id);
    }).catch(() => {});

    getIncident(id)
      .then((data) => {
        if (isMounted) {
          setIncident(data);
          if (data.analyses && data.analyses.length > 0) {
            const latest = data.analyses[data.analyses.length - 1];
            setCurrentAnalysis(latest);
            if (latest.use_memory) {
              setMemoryAnalysis(latest);
            } else {
              setZeroShotAnalysis(latest);
            }
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
  }, [id]);

  // Copy logs helper
  const handleCopyLogs = () => {
    if (!incident?.error_logs) return;
    navigator.clipboard.writeText(incident.error_logs);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
    toast.info('Error logs copied to clipboard.');
  };

  // Run single analysis
  const handleRunAnalysis = async (overrideMemory?: boolean) => {
    if (!id) return;
    const memoryFlag = overrideMemory !== undefined ? overrideMemory : useMemory;

    try {
      setAnalyzing(true);
      setAnalysisError(null);
      const result = await analyzeIncident(id, { use_memory: memoryFlag });
      setCurrentAnalysis(result);
      if (memoryFlag) {
        setMemoryAnalysis(result);
      } else {
        setZeroShotAnalysis(result);
      }

      // Also refresh incident in background to update status to 'investigating' if was 'open'
      getIncident(id).then((fresh) => setIncident(fresh)).catch(() => {});

      toast.success(
        memoryFlag
          ? `Analysis generated with ${result.recalled_memories?.length || 0} Hindsight memory pattern(s)!`
          : 'Zero-shot analysis generated (without institutional memory).',
        'AI Reasoning Complete'
      );
    } catch (err) {
      const friendlyMsg = extractErrorMessage(err);
      setAnalysisError(friendlyMsg);
      toast.error(friendlyMsg, 'Analysis Failed');
    } finally {
      setAnalyzing(false);
    }
  };

  // Run side-by-side compare mode for judges
  const handleRunCompareMode = async () => {
    if (!id) return;
    try {
      setRunningCompare(true);
      setAnalysisError(null);
      setIsCompareMode(true);
      toast.info('Running side-by-side benchmark: Without Memory vs With Memory...', 'Benchmark Started');

      const [withoutMem, withMem] = await Promise.all([
        analyzeIncident(id, { use_memory: false }),
        analyzeIncident(id, { use_memory: true }),
      ]);

      setZeroShotAnalysis(withoutMem);
      setMemoryAnalysis(withMem);
      setCurrentAnalysis(withMem);

      // Refresh incident state
      getIncident(id).then((fresh) => setIncident(fresh)).catch(() => {});

      toast.success('Benchmark complete! Compare the confidence and specificity below.', 'Compare Ready');
    } catch (err) {
      const friendlyMsg = extractErrorMessage(err);
      setAnalysisError(friendlyMsg);
      toast.error(friendlyMsg, 'Failed to execute compare benchmark');
    } finally {
      setRunningCompare(false);
    }
  };

  // Open feedback modal
  const handleOpenFeedback = (type: FeedbackType) => {
    setFeedbackType(type);
    setFeedbackModalOpen(true);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton className="h-96" />
        <CardSkeleton className="h-96" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="space-y-4">
        <Link to="/incidents" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Incidents
        </Link>
        <ErrorBanner
          title="Incident Not Found"
          message={error || 'Could not load incident details.'}
          onRetry={loadIncident}
        />
      </div>
    );
  }

  const isResolved = incident.status === 'resolved';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <Link
            to="/incidents"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Registry
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-base font-black text-teal-400">{incident.id}</span>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            <EnvironmentBadge env={incident.environment} />
            {incident.is_demo && <DemoBadge />}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1.5">
            {incident.title}
          </h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Resolve Incident Action */}
          {!isResolved ? (
            <button
              onClick={() => setResolveModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Resolve & Retain in Memory
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Resolved & Retained in Hindsight
            </div>
          )}
        </div>
      </div>

      {/* Main Split Grid: Left = Info & Logs; Right = AI Analysis Hero Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* =========================================================================
            LEFT COLUMN (5 cols): Incident Details, Symptoms, Error Logs & Resolution
            ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Telemetry Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Incident Metadata
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Target Service</span>
                <span className="font-mono font-bold text-slate-200 mt-0.5 block">{incident.service}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Environment</span>
                <span className="font-mono font-bold text-slate-200 mt-0.5 block capitalize">{incident.environment}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Detected At</span>
                <span className="font-mono text-slate-300 mt-0.5 block">
                  {new Date(incident.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Last Activity</span>
                <span className="font-mono text-slate-300 mt-0.5 block">
                  {new Date(incident.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            {/* Symptoms */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Observed Symptoms</span>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                {incident.symptoms}
              </p>
            </div>
          </div>

          {/* Monospace Error Logs Terminal */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-mono font-bold text-slate-300">Error Telemetry / Logs</span>
              </div>
              <button
                onClick={handleCopyLogs}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition cursor-pointer"
                title="Copy log contents"
              >
                {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLog ? 'Copied' : 'Copy Logs'}
              </button>
            </div>
            <pre className="p-4 font-mono text-xs text-teal-300/90 overflow-x-auto max-h-64 whitespace-pre-wrap leading-relaxed select-text">
              {incident.error_logs || 'No error logs captured for this incident.'}
            </pre>
          </div>

          {/* Verified Resolution Card (if resolved) */}
          {incident.resolution && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-slate-100">Verified Resolution & Post-Mortem</h3>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                  Retained in Hindsight
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-mono text-[10px] block">Confirmed Cause</span>
                  <p className="text-slate-200 font-medium mt-0.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    {incident.resolution.confirmed_cause}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-mono text-[10px] block">Verified Resolution</span>
                  <p className="text-emerald-300 font-medium mt-0.5 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/30">
                    {incident.resolution.verified_resolution}
                  </p>
                </div>

                {incident.resolution.steps_taken?.length > 0 && (
                  <div>
                    <span className="text-slate-400 uppercase font-mono text-[10px] block">Steps Taken</span>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-slate-300 pl-1">
                      {incident.resolution.steps_taken.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {incident.resolution.failed_attempts?.length > 0 && (
                  <div>
                    <span className="text-amber-400 uppercase font-mono text-[10px] block">Failed Attempts (Lessons)</span>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-slate-400 pl-1">
                      {incident.resolution.failed_attempts.map((attempt, idx) => (
                        <li key={idx} className="italic text-amber-300/80">{attempt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {incident.resolution.outcome && (
                  <div>
                    <span className="text-slate-400 uppercase font-mono text-[10px] block">Outcome</span>
                    <p className="text-slate-300 mt-0.5">{incident.resolution.outcome}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            RIGHT COLUMN (7 cols): AI Analysis Hero Panel (With/Without Memory & Compare)
            ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* AI Panel Header & Control Bar */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    AI Incident Intelligence
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 border border-teal-700/60 text-teal-300">
                      Groq + Hindsight
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Autonomous reasoning grounded in verified organizational memory.
                  </p>
                </div>
              </div>

              {/* Memory Mode Toggle */}
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0">
                <span className="text-xs font-mono text-slate-400 pl-1.5">Memory:</span>
                <button
                  type="button"
                  onClick={() => setUseMemory(!useMemory)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    useMemory
                      ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-950/50'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {useMemory ? 'With Memory (ON)' : 'Zero-Shot (OFF)'}
                </button>
              </div>
            </div>

            {/* Analysis Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRunAnalysis()}
                  disabled={analyzing || runningCompare}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-teal-950/40 transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                  {analyzing ? 'Reasoning...' : useMemory ? 'Analyze with Memory' : 'Run Zero-Shot Analysis'}
                </button>

                {/* Compare Mode Button for Judges */}
                <button
                  onClick={handleRunCompareMode}
                  disabled={analyzing || runningCompare}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    isCompareMode
                      ? 'bg-purple-950/70 border-purple-500 text-purple-200'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                  title="Run both zero-shot and memory analyses simultaneously to demonstrate the difference for judges"
                >
                  <Columns className="w-3.5 h-3.5 text-purple-400" />
                  {runningCompare ? 'Benchmarking...' : 'Side-by-Side Compare Mode'}
                </button>
              </div>

              {currentAnalysis && (
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                  <span>Latency: {currentAnalysis.latency_ms}ms</span>
                  <span>|</span>
                  <span className="truncate max-w-[120px]" title={currentAnalysis.model_used}>
                    {currentAnalysis.model_used}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* =========================================================================
              SIDE-BY-SIDE COMPARE MODE (HERO DEMO DISPLAY)
              ========================================================================= */}
          {isCompareMode && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/30 border border-purple-500/40 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Columns className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-bold text-slate-100">
                    Institutional Memory Benchmark (Side-by-Side)
                  </h4>
                </div>
                <button
                  onClick={() => setIsCompareMode(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Exit Compare View
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Column 1: Without Memory (Zero-Shot) */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Without Memory (Zero-Shot)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      Isolated LLM
                    </span>
                  </div>

                  {zeroShotAnalysis ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Hypothesis</span>
                        <p className="text-slate-300 font-medium mt-0.5">
                          {zeroShotAnalysis.hypotheses[0]?.description}
                        </p>
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/40 font-mono">
                          Confidence: {zeroShotAnalysis.hypotheses[0]?.confidence}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Investigation Steps</span>
                        <ul className="list-disc list-inside space-y-1 text-slate-400 mt-1">
                          {zeroShotAnalysis.investigation_steps.slice(0, 2).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Recommendation</span>
                        <p className="text-slate-300 mt-0.5">{zeroShotAnalysis.recommendation}</p>
                      </div>

                      <div className="text-[11px] text-rose-400/90 italic">
                        Notice: Generic trial-and-error advice; does not pinpoint the connection leak.
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Click "Side-by-Side Compare Mode" to populate.</p>
                  )}
                </div>

                {/* Column 2: With Hindsight Memory */}
                <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-500/50 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase font-bold text-teal-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      With Hindsight Memory
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-900/80 text-teal-300 border border-teal-500/40">
                      Grounded in Bank
                    </span>
                  </div>

                  {memoryAnalysis ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-mono text-teal-400/80 uppercase block">Pinpointed Root Cause</span>
                        <p className="text-teal-200 font-medium mt-0.5">
                          {memoryAnalysis.hypotheses[0]?.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                            Confidence: {memoryAnalysis.hypotheses[0]?.confidence}
                          </span>
                          <span className="text-[10px] text-teal-400 font-mono">
                            Recalled from {memoryAnalysis.recalled_memories?.[0]?.metadata?.incident_id || 'Past Outages'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-teal-400/80 uppercase block">Targeted Steps</span>
                        <ul className="list-disc list-inside space-y-1 text-slate-200 mt-1">
                          {memoryAnalysis.investigation_steps.slice(0, 2).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-2.5 rounded-lg bg-teal-950/60 border border-teal-500/40">
                        <span className="text-[10px] font-mono text-teal-400/80 uppercase block">Verified Fix</span>
                        <p className="text-teal-200 mt-0.5 font-medium">{memoryAnalysis.recommendation}</p>
                      </div>

                      <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Institutional memory targets confirmed root cause directly.
                      </div>
                    </div>
                  ) : (
                    <p className="text-teal-400/60 italic">Loading memory reasoning...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Banner for reasoning / service failure */}
          {analysisError && (
            <ErrorBanner
              title="AI Incident Reasoning Advisory"
              message={analysisError}
              onRetry={() => handleRunAnalysis()}
            />
          )}

          {/* =========================================================================
              STANDARD ACTIVE ANALYSIS VIEW
              ========================================================================= */}
          {currentAnalysis ? (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              {/* Warnings Advisory Banner (e.g. memory recall fallback) */}
              {currentAnalysis.warnings && currentAnalysis.warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-500/60 text-amber-200 shadow-lg space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    Analysis System Warning
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/90 pl-1">
                    {currentAnalysis.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mandatory Guardrail Notice */}
              <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-amber-300 font-semibold">Human approval required before any change:</strong>{' '}
                  All AI reasoning and investigation steps require human verification. TraceMind never executes remediation actions automatically.
                </div>
              </div>

              {/* Hypotheses List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                    AI Hypotheses
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                    AI hypothesis, not confirmed
                  </span>
                </div>

                <div className="space-y-2.5">
                  {currentAnalysis.hypotheses.map((hyp, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-100">{hyp.description}</p>
                        <span
                          className={`shrink-0 text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold ${
                            hyp.confidence === 'high'
                              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                              : hyp.confidence === 'medium'
                              ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                              : 'bg-blue-950/70 border-blue-500/50 text-blue-300'
                          }`}
                        >
                          Confidence: {hyp.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{hyp.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investigation Steps Checklist */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Recommended Investigation Steps
                </h4>
                <div className="space-y-2">
                  {currentAnalysis.investigation_steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-200"
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed flex-1 font-mono">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-teal-950/40 via-slate-950 to-slate-950 border border-teal-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-300 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    AI Action Recommendation
                  </span>
                  <span className="text-[10px] font-mono text-teal-400/80 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800">
                    Awaiting Review
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                  {currentAnalysis.recommendation}
                </p>

                {currentAnalysis.uncertainty_note && (
                  <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                    Note: {currentAnalysis.uncertainty_note}
                  </p>
                )}

                {/* Feedback Evaluation Buttons */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 font-medium">Record Engineer Assessment:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenFeedback('accept')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleOpenFeedback('modify')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      Modify
                    </button>
                    <button
                      onClick={() => handleOpenFeedback('reject')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>

              {/* Recalled Memories from Hindsight Section (Capped at 8 per contract) */}
              {currentAnalysis.recalled_memories && currentAnalysis.recalled_memories.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 font-mono flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-teal-400" />
                      Recalled From Hindsight Memory Bank ({Math.min(currentAnalysis.recalled_memories.length, 8)})
                    </h4>
                    <span className="text-[10px] font-mono text-teal-400/80">
                      Bank: {bankId}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {currentAnalysis.recalled_memories.slice(0, 8).map((mem, index) => {
                      const sourceId =
                        (mem.metadata?.incident_id as string) ||
                        mem.text.match(/INC-[\w-]+/)?.[0] ||
                        null;

                      return (
                        <div
                          key={mem.id || `mem-${index}`}
                          className="p-3.5 rounded-xl bg-slate-950 border border-teal-500/30 space-y-2 hover:border-teal-500/60 transition"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-teal-400 font-bold">{mem.id || 'MEM-REF'}</span>
                            {sourceId && (
                              <Link
                                to={`/incidents/${sourceId}`}
                                className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                              >
                                Source: {sourceId} <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>

                          <p className="text-xs text-slate-200 leading-relaxed font-sans">{mem.text}</p>

                          {mem.entities && mem.entities.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {mem.entities.map((entity, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300"
                                >
                                  {entity}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 italic">
                  Zero memories recalled (Zero-shot run or no past matching pattern found).
                </div>
              )}

              {/* Feedback History on this Incident */}
              {incident.feedback && incident.feedback.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Prior Engineer Reviews ({incident.feedback.length})
                  </h4>
                  {incident.feedback.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono uppercase font-bold text-[10px] px-1.5 py-0.2 rounded ${
                              fb.feedback_type === 'accept'
                                ? 'bg-emerald-950 text-emerald-300'
                                : fb.feedback_type === 'modify'
                                ? 'bg-amber-950 text-amber-300'
                                : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            {fb.feedback_type}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {new Date(fb.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        {fb.notes && <p className="text-slate-300 text-xs mt-1">{fb.notes}</p>}
                        {fb.modified_recommendation && (
                          <p className="text-amber-200 text-xs mt-1 italic">
                            Modified: {fb.modified_recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Empty state when no analysis has run yet */
            <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 mx-auto">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-200">AI Incident Analysis Ready</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                  Trigger Groq reasoning grounded by Hindsight institutional memory to generate hypotheses, investigation steps, and pattern-matched recommendations.
                </p>
              </div>
              <button
                onClick={() => handleRunAnalysis()}
                disabled={analyzing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Analyze Incident Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ResolveModal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        incidentId={incident.id}
        onResolved={(result: ResolveResponse) => {
          setIncident((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'resolved',
                  resolved_at: result.resolved_at,
                  resolution: result.resolution,
                }
              : null
          );
        }}
      />

      {currentAnalysis && (
        <FeedbackModal
          isOpen={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          incidentId={incident.id}
          analysisId={currentAnalysis.id}
          initialType={feedbackType}
          currentRecommendation={currentAnalysis.recommendation}
          onFeedbackSaved={(newFb: Feedback) => {
            setIncident((prev) =>
              prev ? { ...prev, feedback: [...(prev.feedback || []), newFb] } : null
            );
          }}
        />
      )}
    </div>
  );
};
