import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Brain, Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal';
import { resolveIncident, extractErrorMessage } from '../../api';
import { ResolveRequest, ResolveResponse } from '../../types';
import { useToast } from '../../context';

interface ResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  onResolved: (result: ResolveResponse) => void;
}

export const ResolveModal: React.FC<ResolveModalProps> = ({
  isOpen,
  onClose,
  incidentId,
  onResolved,
}) => {
  const toast = useToast();
  const [confirmedCause, setConfirmedCause] = useState('');
  const [verifiedResolution, setVerifiedResolution] = useState('');
  const [stepsTaken, setStepsTaken] = useState('');
  const [failedAttempts, setFailedAttempts] = useState('');
  const [outcome, setOutcome] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resolutionResult, setResolutionResult] = useState<ResolveResponse | null>(null);

  // Autofill verified resolution for demo convenience
  const autofillDemoResolution = () => {
    setConfirmedCause('Unhandled DB transaction rollback bypassed connection release in checkout handler.');
    setVerifiedResolution('Fixed connection lifecycle with explicit try/finally context managers and bumped pool timeout.');
    setStepsTaken(
`- Identified unclosed session context in checkout.py callback
- Wrapped database query inside context manager
- Increased QueuePool max_overflow to 20
- Redeployed payment-api service`
    );
    setFailedAttempts('- Restarted pods blindly without code fix (pool exhausted again in 3 minutes)');
    setOutcome('Connection pool count stabilized under 15; checkout p99 latency returned to 45ms with 0 timeouts.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedCause.trim() || !verifiedResolution.trim()) {
      toast.error('Please enter confirmed cause and verified resolution.', 'Validation');
      return;
    }

    try {
      setSubmitting(true);
      const payload: ResolveRequest = {
        confirmed_cause: confirmedCause.trim(),
        verified_resolution: verifiedResolution.trim(),
        steps_taken: stepsTaken
          .split('\n')
          .map((s) => s.replace(/^[-*•]\s*/, '').trim())
          .filter(Boolean),
        failed_attempts: failedAttempts
          .split('\n')
          .map((s) => s.replace(/^[-*•]\s*/, '').trim())
          .filter(Boolean),
        outcome: outcome.trim() || 'Incident resolved and verified in production.',
      };

      const result = await resolveIncident(incidentId, payload);
      setResolutionResult(result);
      onResolved(result);
      toast.success(
        `Incident ${incidentId} resolved. Retained in Hindsight memory for institutional learning!`,
        'Resolution Retained'
      );
    } catch (err) {
      toast.error(extractErrorMessage(err), 'Failed to resolve incident');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    setResolutionResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resolutionResult ? handleFinish : onClose}
      title={resolutionResult ? 'Resolution Verified & Retained' : `Resolve Incident ${incidentId}`}
      subtitle={
        resolutionResult
          ? 'Post-mortem retained in Hindsight memory bank.'
          : 'Record the verified post-mortem to institutionalize this knowledge for future incidents.'
      }
      maxWidth="2xl"
    >
      {resolutionResult ? (
        <div className="space-y-5 animate-in zoom-in-95 duration-200">
          {/* Hindsight Retain Confirmation Badge */}
          <div
            className={`p-4 rounded-xl border ${
              resolutionResult.retained_in_hindsight
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {resolutionResult.retained_in_hindsight ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>
                    {resolutionResult.retained_in_hindsight
                      ? 'Retained in Hindsight Memory'
                      : 'Hindsight Retain Advisory'}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/40">
                    Status: {resolutionResult.hindsight_status}
                  </span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">
                  {resolutionResult.retained_in_hindsight
                    ? 'This resolution has been indexed into Hindsight persistent memory bank. Subsequent similar incidents will now automatically recall this verified fix!'
                    : resolutionResult.error || 'Resolution saved locally, but Hindsight retain reported degraded status.'}
                </p>
              </div>
            </div>
          </div>

          {/* Resolution Summary Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
            <div>
              <span className="font-mono text-slate-400 uppercase text-[10px] block">Confirmed Cause</span>
              <p className="text-slate-200 font-medium mt-0.5">{resolutionResult.resolution.confirmed_cause}</p>
            </div>
            <div>
              <span className="font-mono text-slate-400 uppercase text-[10px] block">Verified Resolution</span>
              <p className="text-teal-300 font-medium mt-0.5">{resolutionResult.resolution.verified_resolution}</p>
            </div>
            <div>
              <span className="font-mono text-slate-400 uppercase text-[10px] block">Outcome</span>
              <p className="text-slate-300 mt-0.5">{resolutionResult.resolution.outcome}</p>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={handleFinish}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer"
            >
              Done & Return to Incident
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={autofillDemoResolution}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-950/70 border border-purple-500/40 text-purple-200 text-xs hover:bg-purple-900 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Autofill Verified Resolution
            </button>
          </div>

          {/* Confirmed Root Cause */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Confirmed Root Cause <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Unhandled exception bypassed connection release in checkout handler"
              value={confirmedCause}
              onChange={(e) => setConfirmedCause(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-teal-500"
              required
            />
          </div>

          {/* Verified Resolution */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Verified Resolution <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Explain exactly how the issue was fixed and verified..."
              value={verifiedResolution}
              onChange={(e) => setVerifiedResolution(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-teal-500"
              required
            />
          </div>

          {/* Steps Taken */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Investigation & Remediation Steps Taken (one per line)
            </label>
            <textarea
              rows={3}
              placeholder="- Queried pg_stat_activity&#10;- Wrapped DB session inside try/finally context manager&#10;- Redeployed payment-api"
              value={stepsTaken}
              onChange={(e) => setStepsTaken(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-slate-200 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          {/* Failed Attempts */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Failed Attempts / Dead Ends (vital for Hindsight memory learning)
            </label>
            <textarea
              rows={2}
              placeholder="- Restarted pods without code fix (pool exhausted again in 3 minutes)"
              value={failedAttempts}
              onChange={(e) => setFailedAttempts(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-slate-200 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          {/* Outcome */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Verification Outcome
            </label>
            <input
              type="text"
              placeholder="e.g. Active DB connections dropped from 200 to 18; 0 checkout timeouts observed."
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              <Brain className="w-4 h-4 text-slate-950" />
              {submitting ? 'Retaining in Hindsight...' : 'Resolve & Retain in Memory'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
