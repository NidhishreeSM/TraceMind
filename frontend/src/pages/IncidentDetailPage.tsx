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
        <Link to="/incidents" className="inline-flex items-center gap-1 text-xs text-[#8FA0BF] hover:text-white">
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
        .map((m) => m.source_incident_id || (m.metadata?.incident_id as string) || m.text.match(/INC-[\w-]+/)?.[0])
        .filter(Boolean)
    )
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
        <div>
          <Link
            to="/incidents"
            className="inline-flex items-center gap-1 text-xs text-[#8FA0BF] hover:text-white mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Incidents
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base font-bold text-white">{incident.id}</span>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            <EnvironmentBadge env={incident.environment} />
            {incident.is_demo && <DemoBadge />}
          </div>
          <h2 className="text-xl sm:text-2xl font-normal text-white tracking-wide mt-1.5">
            {incident.title}
          </h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isResolved ? (
            <button
              onClick={() => setResolveModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white hover:bg-[#C9D6EA] text-[#050B1A] text-xs font-semibold transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Resolve Incident
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#101C3D] border border-white/10 text-[#C9D6EA] text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 text-[#C9D6EA]" />
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
        <div className="lg:col-span-5 space-y-6">
          {/* Incident Facts Card */}
          <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8 space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-white font-mono">
              Incident facts
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#101C3D] border border-white/8">
                <span className="text-[#8FA0BF] block text-[10px] uppercase font-mono">Service</span>
                <span className="font-mono font-bold text-white mt-0.5 block">{incident.service}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#101C3D] border border-white/8">
                <span className="text-[#8FA0BF] block text-[10px] uppercase font-mono">Environment</span>
                <span className="font-mono font-bold text-white mt-0.5 block capitalize">{incident.environment}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#101C3D] border border-white/8">
                <span className="text-[#8FA0BF] block text-[10px] uppercase font-mono">Detected</span>
                <span className="font-mono text-white mt-0.5 block">
                  {new Date(incident.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#101C3D] border border-white/8">
                <span className="text-[#8FA0BF] block text-[10px] uppercase font-mono">Updated</span>
                <span className="font-mono text-white mt-0.5 block">
                  {new Date(incident.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            {/* Observed Symptoms */}
            <div className="space-y-1.5 pt-2 border-t border-white/8">
              <span className="text-[11px] font-mono uppercase text-[#8FA0BF]">Observed symptoms</span>
              <p className="text-xs text-[#C9D6EA] leading-relaxed bg-[#101C3D] p-3 rounded-2xl border border-white/8">
                {incident.symptoms}
              </p>
            </div>
          </div>

          {/* Monospace Error Logs Terminal */}
          <div className="rounded-3xl bg-[#050B1A] border border-white/10 overflow-hidden">
            <div className="p-3 bg-[#0B1530] border-b border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#C9D6EA]" />
                <span className="text-xs font-mono font-medium text-white">Error logs</span>
              </div>
              <button
                onClick={handleCopyLogs}
                className="flex items-center gap-1 px-3 py-1 rounded-full border border-white/20 text-[#8FA0BF] hover:text-white text-xs font-mono transition cursor-pointer"
                title="Copy log contents"
              >
                {copiedLog ? <Check className="w-3 h-3 text-[#C9D6EA]" /> : <Copy className="w-3 h-3" />}
                {copiedLog ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 font-mono text-xs text-[#C9D6EA] overflow-x-auto max-h-60 whitespace-pre-wrap leading-relaxed select-text">
              {incident.error_logs || 'No error logs recorded for this incident.'}
            </pre>
          </div>

          {/* Verified Resolution Post-Mortem (if resolved) */}
          {incident.resolution && (
            <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/15 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <div className="flex items-center gap-1.5 text-[#C9D6EA]">
                  <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" />
                  <h3 className="text-xs font-medium uppercase tracking-wider font-mono text-white">
                    Verified resolution
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#101C3D] text-[#C9D6EA] border border-white/10">
                  Retained in Hindsight
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#8FA0BF] font-mono text-[10px] uppercase block">Confirmed cause</span>
                  <p className="text-white mt-1 bg-[#101C3D] p-3 rounded-2xl border border-white/8">
                    {incident.resolution.confirmed_cause}
                  </p>
                </div>

                <div>
                  <span className="text-[#8FA0BF] font-mono text-[10px] uppercase block">Verified fix</span>
                  <p className="text-[#C9D6EA] mt-1 bg-[#101C3D] p-3 rounded-2xl border border-white/8 font-medium">
                    {incident.resolution.verified_resolution}
                  </p>
                </div>

                {incident.resolution.steps_taken?.length > 0 && (
                  <div>
                    <span className="text-[#8FA0BF] font-mono text-[10px] uppercase block">Steps taken</span>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-[#C9D6EA] pl-1 font-mono text-[11px]">
                      {incident.resolution.steps_taken.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {incident.resolution.failed_attempts?.length > 0 && (
                  <div>
                    <span className="text-[#8FA0BF] font-mono text-[10px] uppercase block">Failed attempts</span>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-[#8FA0BF] pl-1 font-mono text-[11px]">
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
        <div className="lg:col-span-7 space-y-6">
          {/* Analysis Controls */}
          <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/8">
              <div>
                <h3 className="text-base font-normal text-white flex items-center gap-2">
                  AI Investigation
                </h3>
                <p className="text-xs text-[#8FA0BF] mt-0.5">
                  Analyze failure telemetry against Hindsight memory
                </p>
              </div>

              {/* Memory Toggle */}
              <div className="flex items-center gap-2 bg-[#101C3D] p-1 rounded-full border border-white/10 shrink-0">
                <span className="text-xs font-mono text-[#8FA0BF] pl-2">Memory:</span>
                <button
                  type="button"
                  onClick={() => setUseMemory(!useMemory)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                    useMemory
                      ? 'bg-white text-[#050B1A]'
                      : 'bg-transparent text-[#8FA0BF] hover:text-white'
                  }`}
                >
                  {useMemory ? 'With Memory (ON)' : 'Zero-Shot (OFF)'}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleRunAnalysis()}
                  disabled={analyzing || runningCompare}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#C9D6EA] text-[#050B1A] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                  {analyzing ? 'Analyzing...' : useMemory ? 'Analyze with memory' : 'Analyze without memory'}
                </button>

                <button
                  onClick={handleRunCompareMode}
                  disabled={analyzing || runningCompare}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-semibold transition cursor-pointer ${
                    isCompareMode
                      ? 'bg-white/10 border-white text-white'
                      : 'border-white/30 text-white hover:bg-white/5'
                  }`}
                  title="Run both without-memory and with-memory analyses to compare side by side"
                >
                  <Columns className="w-3.5 h-3.5 text-[#C9D6EA]" />
                  {runningCompare ? 'Comparing...' : 'Compare mode'}
                </button>
              </div>

              {currentAnalysis && (
                <div className="text-[11px] font-mono text-[#8FA0BF] flex items-center gap-1.5">
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
            <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <Columns className="w-4 h-4 text-[#C9D6EA]" />
                  <h4 className="text-xs font-medium uppercase tracking-wider text-white font-mono">
                    Comparison: Without memory vs With memory
                  </h4>
                </div>
                <button
                  onClick={() => setIsCompareMode(false)}
                  className="text-xs text-[#8FA0BF] hover:text-white underline cursor-pointer"
                >
                  Close compare
                </button>
              </div>

              {/* Cited Incidents List Banner */}
              {citedMemoryIds.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#101C3D] border border-white/8 text-xs flex items-center gap-2 flex-wrap">
                  <span className="text-[#8FA0BF] font-mono text-[11px]">Recalled incidents cited:</span>
                  {citedMemoryIds.map((cId) => (
                    <Link
                      key={cId}
                      to={`/incidents/${cId}`}
                      className="px-2 py-0.5 rounded-full bg-white/5 border border-white/20 text-[#C9D6EA] font-mono text-[11px] hover:underline flex items-center gap-1"
                    >
                      {cId} <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Without Memory */}
                <div className="p-4 rounded-2xl bg-[#101C3D] border border-white/8 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/8">
                    <span className="font-mono text-xs font-medium text-[#8FA0BF] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Without memory
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-[#8FA0BF]">
                      zero-shot
                    </span>
                  </div>

                  {zeroShotAnalysis ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-mono text-[#8FA0BF] uppercase block">Hypothesis</span>
                        <p className="text-[#8FA0BF] mt-1 leading-relaxed">
                          {zeroShotAnalysis.hypotheses[0]?.description}
                        </p>
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8FA0BF] font-mono">
                          Confidence: {zeroShotAnalysis.hypotheses[0]?.confidence}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-[#8FA0BF] uppercase block">Recommendation</span>
                        <p className="text-[#8FA0BF] mt-1 text-xs leading-relaxed">{zeroShotAnalysis.recommendation}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#8FA0BF] text-xs italic">Run compare mode to populate.</p>
                  )}
                </div>

                {/* With Memory */}
                <div className="p-4 rounded-2xl bg-[#101C3D] border border-[#3B82F6]/50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/8">
                    <span className="font-mono text-xs font-semibold text-[#C9D6EA] flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-[#3B82F6]" />
                      With memory
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3B82F6]/20 text-[#C9D6EA] border border-[#3B82F6]/30">
                      Hindsight
                    </span>
                  </div>

                  {memoryAnalysis ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-mono text-[#C9D6EA] uppercase block">Hypothesis</span>
                        <p className="text-white mt-1 font-normal leading-relaxed">
                          {memoryAnalysis.hypotheses[0]?.description}
                        </p>
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[#C9D6EA] font-mono">
                          Confidence: {memoryAnalysis.hypotheses[0]?.confidence}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-[#C9D6EA] uppercase block">Recommendation</span>
                        <p className="text-[#C9D6EA] mt-1 text-xs leading-relaxed">{memoryAnalysis.recommendation}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#8FA0BF] text-xs italic">Loading memory analysis...</p>
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
            <div className="p-6 rounded-3xl bg-[#0B1530] border border-white/8 space-y-5">
              {/* Warnings Banner (if any) */}
              {currentAnalysis.warnings && currentAnalysis.warnings.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#101C3D] border border-white/20 text-[#C9D6EA] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#C9D6EA]" />
                    Notice
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-xs pl-1 text-[#8FA0BF]">
                    {currentAnalysis.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Guardrail Notice: Single Plain Line */}
              <p className="text-xs text-[#8FA0BF] py-1 border-y border-white/8">
                Human approval required before any change.
              </p>

              {/* SECTION 2: AI HYPOTHESES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-white font-mono">
                    AI hypotheses (unconfirmed)
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {currentAnalysis.hypotheses.map((hyp, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-2xl bg-[#101C3D] border border-white/8 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-white">{hyp.description}</p>
                        <span className="shrink-0 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-white/20 text-[#C9D6EA]">
                          {hyp.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-[#8FA0BF] leading-relaxed">{hyp.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investigation Steps */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium uppercase tracking-wider text-white font-mono">
                  Investigation steps
                </h4>
                <div className="space-y-2">
                  {currentAnalysis.investigation_steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#101C3D] border border-white/8 text-xs text-[#C9D6EA] font-mono"
                    >
                      <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] flex items-center justify-center shrink-0 mt-0.5 font-sans font-bold">
                        {idx + 1}
                      </span>
                      <span className="flex-1 leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation Card */}
              <div className="p-5 rounded-2xl bg-[#101C3D] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-white font-mono">
                    Recommendation
                  </span>
                  <span className="text-[10px] font-mono text-[#8FA0BF]">
                    Awaiting human review
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-white leading-relaxed">
                  {currentAnalysis.recommendation}
                </p>

                {currentAnalysis.uncertainty_note && (
                  <p className="text-[11px] text-[#8FA0BF] italic pt-1 border-t border-white/8">
                    Note: {currentAnalysis.uncertainty_note}
                  </p>
                )}

                {/* Feedback Evaluation Controls */}
                <div className="pt-3 border-t border-white/8 flex items-center justify-between gap-2">
                  <span className="text-xs text-[#8FA0BF]">Feedback:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenFeedback('accept')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition cursor-pointer"
                    >
                      <ThumbsUp className="w-3 h-3 text-[#C9D6EA]" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleOpenFeedback('modify')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 text-[#C9D6EA]" />
                      Modify
                    </button>
                    <button
                      onClick={() => handleOpenFeedback('reject')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition cursor-pointer"
                    >
                      <ThumbsDown className="w-3 h-3 text-[#8FA0BF]" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: RECALLED FROM HINDSIGHT */}
              {currentAnalysis.recalled_memories && currentAnalysis.recalled_memories.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-[#3B82F6]" />
                      Recalled from Hindsight ({Math.min(currentAnalysis.recalled_memories.length, 8)})
                    </h4>
                    <span className="text-[10px] font-mono text-[#8FA0BF]">
                      Bank: {bankId}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {currentAnalysis.recalled_memories.slice(0, 8).map((mem, index) => {
                      const sourceId =
                        mem.source_incident_id ||
                        (mem.metadata?.incident_id as string) ||
                        mem.text.match(/INC-[\w-]+/)?.[0] ||
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
                          className="p-4 rounded-2xl bg-[#101C3D] border border-white/8 space-y-2 hover:border-[#3B82F6]/40 transition"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold">{mem.id || `MEM-${index + 1}`}</span>
                              {scoreValue && (
                                <span className="text-[#8FA0BF]">Score: {scoreValue}</span>
                              )}
                            </div>
                            {sourceId && (
                              <Link
                                to={`/incidents/${sourceId}`}
                                className="text-xs text-[#C9D6EA] hover:underline flex items-center gap-1"
                              >
                                Source: {sourceId} <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>

                          <p className="text-xs text-white leading-relaxed">{mem.text}</p>

                          {mem.entities && mem.entities.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {mem.entities.map((entity, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-[#8FA0BF]"
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
                <div className="p-4 rounded-2xl bg-[#101C3D] border border-white/8 text-xs text-[#8FA0BF] italic">
                  Zero memories recalled for this analysis.
                </div>
              )}

              {/* Feedback History */}
              {incident.feedback && incident.feedback.length > 0 && (
                <div className="pt-3 border-t border-white/8 space-y-2 text-xs">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-[#8FA0BF] font-mono">
                    Prior reviews ({incident.feedback.length})
                  </h4>
                  {incident.feedback.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-3 rounded-2xl bg-[#101C3D] border border-white/8 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono uppercase font-bold text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white">
                            {fb.feedback_type}
                          </span>
                          <span className="text-[#8FA0BF] text-[11px]">
                            {new Date(fb.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        {fb.notes && <p className="text-white text-xs mt-1">{fb.notes}</p>}
                        {fb.modified_recommendation && (
                          <p className="text-[#C9D6EA] text-xs mt-1 italic">
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
            <div className="p-8 rounded-3xl bg-[#0B1530] border border-white/8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#101C3D] border border-white/10 flex items-center justify-center text-[#C9D6EA] mx-auto">
                <Brain className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-normal text-white">No analysis run yet</h4>
                <p className="text-xs text-[#8FA0BF] max-w-sm mx-auto leading-relaxed">
                  Run Groq AI with Hindsight memory to generate hypotheses and investigate steps.
                </p>
              </div>
              <button
                onClick={() => handleRunAnalysis()}
                disabled={analyzing}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-white hover:bg-[#C9D6EA] text-[#050B1A] font-semibold text-xs transition cursor-pointer"
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
