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

  // Compare mode state
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

  const handleCopyLogs = () => {
    if (!incident?.error_logs) return;
    navigator.clipboard.writeText(incident.error_logs);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
    toast.info('Logs copied to clipboard.');
  };

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

      getIncident(id).then((fresh) => setIncident(fresh)).catch(() => {});
      toast.success(
        memoryFlag ? 'Analysis generated with Hindsight memory.' : 'Zero-shot analysis generated.',
        'Analysis Complete'
      );
    } catch (err) {
      const friendlyMsg = extractErrorMessage(err);
      setAnalysisError(friendlyMsg);
      toast.error(friendlyMsg, 'Analysis Failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunCompareMode = async () => {
    if (!id) return;
    try {
      setRunningCompare(true);
      setAnalysisError(null);
      setIsCompareMode(true);

      const [withoutMem, withMem] = await Promise.all([
        analyzeIncident(id, { use_memory: false }),
        analyzeIncident(id, { use_memory: true }),
      ]);

      setZeroShotAnalysis(withoutMem);
      setMemoryAnalysis(withMem);
      setCurrentAnalysis(withMem);

      getIncident(id).then((fresh) => setIncident(fresh)).catch(() => {});
      toast.success('Compare benchmark complete.', 'Compare Ready');
    } catch (err) {
      const friendlyMsg = extractErrorMessage(err);
      setAnalysisError(friendlyMsg);
      toast.error(friendlyMsg, 'Failed to execute compare benchmark');
    } finally {
      setRunningCompare(false);
    }
  };

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

  // Helper: extract cited incident IDs from recalled memories
  const citedMemoryIds = Array.from(
    new Set(
      (memoryAnalysis?.recalled_memories || [])
        .map((m) => m.source_incident_id || (m.metadata?.incident_id as string) || m.text?.match(/INC-[\w-]+/)?.[0])
        .filter(Boolean)
    )
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <Link
            to="/incidents"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 mb-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Incidents
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base font-bold text-teal-400">{incident.id}</span>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            <EnvironmentBadge env={incident.environment} />
            {incident.is_demo && <DemoBadge />}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight mt-1">
            {incident.title}
          </h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isResolved ? (
            <button
              onClick={() => setResolveModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Resolve Incident
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Resolved & Retained
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Column = Incident Facts & Logs; Right Column = AI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* =========================================================================
            SECTION 1: INCIDENT FACTS (Left Column - 5 cols)
            ========================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* Incident Facts Card */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
              Incident facts
            </h3>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Service</span>
                <span className="font-mono font-bold text-slate-200 mt-0.5 block">{incident.service}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Environment</span>
                <span className="font-mono font-bold text-slate-200 mt-0.5 block capitalize">{incident.environment}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Detected</span>
                <span className="font-mono text-slate-300 mt-0.5 block">
                  {new Date(incident.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Updated</span>
                <span className="font-mono text-slate-300 mt-0.5 block">
                  {new Date(incident.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            {/* Observed Symptoms */}
            <div className="space-y-1 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-mono uppercase text-slate-400">Observed symptoms</span>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {incident.symptoms}
              </p>
            </div>
          </div>

          {/* Monospace Error Logs Terminal */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-mono font-medium text-slate-300">Error logs</span>
              </div>
              <button
                onClick={handleCopyLogs}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition cursor-pointer"
                title="Copy log contents"
              >
                {copiedLog ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedLog ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 font-mono text-xs text-teal-300/90 overflow-x-auto max-h-60 whitespace-pre-wrap leading-relaxed select-text">
              {incident.error_logs || 'No error logs recorded for this incident.'}
            </pre>
          </div>

          {/* Verified Resolution Post-Mortem (if resolved) */}
          {incident.resolution && (
            <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-slate-200">
                    Verified resolution
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  Retained in Hindsight
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 font-mono text-[10px] uppercase block">Confirmed cause</span>
                  <p className="text-slate-200 mt-0.5 bg-slate-950 p-2 rounded border border-slate-800">
                    {incident.resolution.confirmed_cause}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-mono text-[10px] uppercase block">Verified fix</span>
                  <p className="text-emerald-300 mt-0.5 bg-slate-950 p-2 rounded border border-slate-800">
                    {incident.resolution.verified_resolution}
                  </p>
                </div>

                {incident.resolution.steps_taken?.length > 0 && (
                  <div>
                    <span className="text-slate-400 font-mono text-[10px] uppercase block">Steps taken</span>
                    <ul className="list-disc list-inside space-y-0.5 mt-0.5 text-slate-300 pl-1 font-mono text-[11px]">
                      {incident.resolution.steps_taken.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {incident.resolution.failed_attempts?.length > 0 && (
                  <div>
                    <span className="text-amber-400 font-mono text-[10px] uppercase block">Failed attempts</span>
                    <ul className="list-disc list-inside space-y-0.5 mt-0.5 text-slate-400 pl-1 font-mono text-[11px]">
                      {incident.resolution.failed_attempts.map((attempt, idx) => (
                        <li key={idx}>{attempt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 2 & 3: AI HYPOTHESES & RECALLED MEMORY (Right Column - 7 cols)
            ========================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* Analysis Controls */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  AI Investigation
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Analyze failure telemetry against Hindsight memory
                </p>
              </div>

              {/* Memory Toggle */}
              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
                <span className="text-xs font-mono text-slate-400 pl-1">Memory:</span>
                <button
                  type="button"
                  onClick={() => setUseMemory(!useMemory)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                    useMemory
                      ? 'bg-teal-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {useMemory ? 'With Memory (ON)' : 'Zero-Shot (OFF)'}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRunAnalysis()}
                  disabled={analyzing || runningCompare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                  {analyzing ? 'Analyzing...' : useMemory ? 'Analyze with memory' : 'Analyze without memory'}
                </button>

                <button
                  onClick={handleRunCompareMode}
                  disabled={analyzing || runningCompare}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    isCompareMode
                      ? 'bg-slate-800 border-teal-500 text-teal-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                  title="Run both without-memory and with-memory analyses to compare side by side"
                >
                  <Columns className="w-3.5 h-3.5 text-teal-400" />
                  {runningCompare ? 'Comparing...' : 'Compare mode'}
                </button>
              </div>

              {currentAnalysis && (
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <span>{currentAnalysis.latency_ms}ms</span>
                  <span>·</span>
                  <span className="truncate max-w-[140px]" title={currentAnalysis.model_used}>
                    {currentAnalysis.model_used}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* =========================================================================
              SIDE-BY-SIDE COMPARE MODE
              ========================================================================= */}
          {isCompareMode && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Columns className="w-4 h-4 text-teal-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                    Comparison: Without memory vs With memory
                  </h4>
                </div>
                <button
                  onClick={() => setIsCompareMode(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Close compare
                </button>
              </div>

              {/* Cited Incidents List Banner */}
              {citedMemoryIds.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 font-mono text-[11px]">Recalled incidents cited:</span>
                  {citedMemoryIds.map((cId) => (
                    <Link
                      key={cId}
                      to={`/incidents/${cId}`}
                      className="px-1.5 py-0.5 rounded bg-teal-950/80 border border-teal-500/40 text-teal-300 font-mono text-[11px] hover:underline flex items-center gap-1"
                    >
                      {cId} <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Without Memory */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                    <span className="font-mono text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Without memory
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      zero-shot
                    </span>
                  </div>

                  {zeroShotAnalysis ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Hypothesis</span>
                        <p className="text-slate-300 mt-0.5">
                          {zeroShotAnalysis.hypotheses[0]?.description}
                        </p>
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          Confidence: {zeroShotAnalysis.hypotheses[0]?.confidence}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Recommendation</span>
                        <p className="text-slate-300 mt-0.5 text-xs">{zeroShotAnalysis.recommendation}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs italic">Run compare mode to populate.</p>
                  )}
                </div>

                {/* With Memory */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-teal-500/40 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                    <span className="font-mono text-xs font-bold text-teal-300 flex items-center gap-1">
                      <Brain className="w-3.5 h-3.5 text-teal-400" />
                      With memory
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-500/30">
                      Hindsight
                    </span>
                  </div>

                  {memoryAnalysis ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-mono text-teal-400 uppercase block">Hypothesis</span>
                        <p className="text-slate-200 mt-0.5 font-medium">
                          {memoryAnalysis.hypotheses[0]?.description}
                        </p>
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-500/30 font-mono">
                          Confidence: {memoryAnalysis.hypotheses[0]?.confidence}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-teal-400 uppercase block">Recommendation</span>
                        <p className="text-teal-200 mt-0.5 text-xs">{memoryAnalysis.recommendation}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs italic">Loading memory analysis...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Analysis Error Advisory */}
          {analysisError && (
            <ErrorBanner
              title="Analysis Advisory"
              message={analysisError}
              onRetry={() => handleRunAnalysis()}
            />
          )}

          {/* Active Analysis View */}
          {currentAnalysis ? (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
              {/* Warnings Banner (if any) */}
              {currentAnalysis.warnings && currentAnalysis.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Notice
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-xs pl-1">
                    {currentAnalysis.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Guardrail Notice: Single Plain Line */}
              <p className="text-xs text-amber-400/90 py-1 border-y border-slate-800">
                Human approval required before any change.
              </p>

              {/* SECTION 2: AI HYPOTHESES */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                    AI hypotheses (unconfirmed)
                  </h4>
                </div>

                <div className="space-y-2">
                  {currentAnalysis.hypotheses.map((hyp, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-100">{hyp.description}</p>
                        <span
                          className={`shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border font-semibold ${
                            hyp.confidence === 'high'
                              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                              : hyp.confidence === 'medium'
                              ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                              : 'bg-blue-950/70 border-blue-500/40 text-blue-300'
                          }`}
                        >
                          {hyp.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{hyp.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investigation Steps */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                  Investigation steps
                </h4>
                <div className="space-y-1.5">
                  {currentAnalysis.investigation_steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono"
                    >
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-teal-400 text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="flex-1 leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation Card */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-teal-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-300 font-mono">
                    Recommendation
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Awaiting human review
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                  {currentAnalysis.recommendation}
                </p>

                {currentAnalysis.uncertainty_note && (
                  <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/80">
                    Note: {currentAnalysis.uncertainty_note}
                  </p>
                )}

                {/* Feedback Evaluation Controls */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">Feedback:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenFeedback('accept')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
                    >
                      <ThumbsUp className="w-3 h-3 text-emerald-400" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleOpenFeedback('modify')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                      Modify
                    </button>
                    <button
                      onClick={() => handleOpenFeedback('reject')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
                    >
                      <ThumbsDown className="w-3 h-3 text-rose-400" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: RECALLED FROM HINDSIGHT */}
              {currentAnalysis.recalled_memories && currentAnalysis.recalled_memories.length > 0 ? (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-300 font-mono flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-teal-400" />
                      Recalled from Hindsight ({Math.min(currentAnalysis.recalled_memories.length, 8)})
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      Bank: {bankId}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {currentAnalysis.recalled_memories.slice(0, 8).map((mem, index) => {
                      const sourceId =
                        mem.source_incident_id ||
                        (mem.metadata?.incident_id as string) ||
                        mem.text?.match(/INC-[\w-]+/)?.[0] ||
                        null;

                      const scoreValue =
                        mem.score !== undefined && mem.score !== null
                          ? typeof mem.score === 'number'
                            ? mem.score.toFixed(2)
                            : String(mem.score)
                          : null;

                      return (
                        <div
                          key={mem.id || `mem-${index}`}
                          className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 hover:border-teal-500/40 transition"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-teal-400 font-semibold">{mem.id || `MEM-${index + 1}`}</span>
                              {scoreValue && (
                                <span className="text-slate-400">Score: {scoreValue}</span>
                              )}
                            </div>
                            {sourceId && (
                              <Link
                                to={`/incidents/${sourceId}`}
                                className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                              >
                                Source: {sourceId} <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>

                          <p className="text-xs text-slate-200 leading-relaxed">{mem.text}</p>

                          {mem.entities && mem.entities.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {mem.entities.map((entity, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300"
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
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-500 italic">
                  Zero memories recalled for this analysis.
                </div>
              )}

              {/* Feedback History */}
              {incident.feedback && incident.feedback.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                    Prior reviews ({incident.feedback.length})
                  </h4>
                  {incident.feedback.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-2 rounded bg-slate-950 border border-slate-800 flex items-start justify-between gap-2"
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
                        {fb.notes && <p className="text-slate-300 text-xs mt-0.5">{fb.notes}</p>}
                        {fb.modified_recommendation && (
                          <p className="text-amber-200 text-xs mt-0.5 italic">
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
            /* Empty state when no analysis has run */
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 mx-auto">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">No analysis run yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-0.5">
                  Run Groq AI with Hindsight memory to generate hypotheses and investigate steps.
                </p>
              </div>
              <button
                onClick={() => handleRunAnalysis()}
                disabled={analyzing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Analyze Incident
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
