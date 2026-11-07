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
          <div className={`p-5 rounded-xl border text-[#F1F5F9] ${
            resolutionResult.retained_in_hindsight
              ? 'bg-[#22C55E]/15 border-[#22C55E]/35'
              : 'bg-[#EF4444]/15 border-[#EF4444]/35'
          }`}>
            <div className="flex items-start gap-3">
              {resolutionResult.retained_in_hindsight ? (
                <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <span>
                    {resolutionResult.retained_in_hindsight
                      ? 'Retained in Hindsight Memory'
                      : 'Hindsight Retain Notice'}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[#F1F5F9]">
                    Status: {resolutionResult.hindsight_status}
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {resolutionResult.retained_in_hindsight
                    ? 'This resolution has been indexed into Hindsight persistent memory bank. Subsequent similar incidents will now recall this verified fix.'
                    : resolutionResult.error || 'Resolution saved locally, but Hindsight retain reported degraded status.'}
                </p>
              </div>
            </div>
          </div>

          {/* Resolution Summary Card */}
          <div className="p-4 rounded-xl bg-[#131C31] border border-white/[0.07] space-y-3 text-xs">
            <div>
              <span className="font-mono text-[#94A3B8] uppercase text-[10px] block">Confirmed Cause</span>
              <p className="text-[#F1F5F9] font-medium mt-0.5">{resolutionResult.resolution.confirmed_cause}</p>
            </div>
            <div>
              <span className="font-mono text-[#94A3B8] uppercase text-[10px] block">Verified Resolution</span>
              <p className="text-[#F1F5F9] font-medium mt-0.5">{resolutionResult.resolution.verified_resolution}</p>
            </div>
            <div>
              <span className="font-mono text-[#94A3B8] uppercase text-[10px] block">Outcome</span>
              <p className="text-[#94A3B8] mt-0.5">{resolutionResult.resolution.outcome}</p>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-full bg-white hover:bg-[#C9D6EA] text-[#080E1D] font-semibold text-xs transition cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.30] text-[#F1F5F9] hover:bg-white/5 text-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
              Autofill Verified Resolution
            </button>
          </div>

          {/* Confirmed Root Cause */}
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#F1F5F9]">
              Confirmed Root Cause <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Unhandled exception bypassed connection release in checkout handler"
              value={confirmedCause}
              onChange={(e) => setConfirmedCause(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#131C31] border border-white/[0.07] rounded-xl text-xs sm:text-sm text-[#F1F5F9] focus:outline-hidden focus:border-[#3B82F6]"
              required
            />
          </div>

          {/* Verified Resolution */}
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#F1F5F9]">
              Verified Resolution <span className="text-[#EF4444]">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Explain exactly how the issue was fixed and verified..."
              value={verifiedResolution}
              onChange={(e) => setVerifiedResolution(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#131C31] border border-white/[0.07] rounded-xl text-xs sm:text-sm text-[#F1F5F9] focus:outline-hidden focus:border-[#3B82F6]"
              required
            />
          </div>

          {/* Steps Taken */}
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#F1F5F9]">
              Investigation & Remediation Steps Taken (one per line)
            </label>
            <textarea
              rows={3}
              placeholder="- Queried pg_stat_activity&#10;- Wrapped DB session inside try/finally context manager&#10;- Redeployed payment-api"
              value={stepsTaken}
              onChange={(e) => setStepsTaken(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#131C31] border border-white/[0.07] rounded-xl text-xs sm:text-sm font-mono text-[#F1F5F9] focus:outline-hidden focus:border-[#3B82F6]"
            />
          </div>

          {/* Failed Attempts */}
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#F1F5F9]">
              Failed Attempts / Dead Ends (vital for Hindsight memory learning)
            </label>
            <textarea
              rows={2}
              placeholder="- Restarted pods without code fix (pool exhausted again in 3 minutes)"
              value={failedAttempts}
              onChange={(e) => setFailedAttempts(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#131C31] border border-white/[0.07] rounded-xl text-xs sm:text-sm font-mono text-[#F1F5F9] focus:outline-hidden focus:border-[#3B82F6]"
            />
          </div>

          {/* Outcome */}
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#F1F5F9]">
              Verification Outcome
            </label>
            <input
              type="text"
              placeholder="e.g. Active DB connections dropped from 200 to 18; 0 checkout timeouts observed."
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#131C31] border border-white/[0.07] rounded-xl text-xs sm:text-sm text-[#F1F5F9] focus:outline-hidden focus:border-[#3B82F6]"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F1F5F9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-[#C9D6EA] text-[#080E1D] font-semibold text-xs transition cursor-pointer disabled:opacity-50"
            >
              <Brain className="w-4 h-4 text-[#080E1D]" />
              {submitting ? 'Retaining in Hindsight...' : 'Resolve & Retain in Memory'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
