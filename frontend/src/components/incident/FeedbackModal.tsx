import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Edit3, Send, ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';
import { sendFeedback, extractErrorMessage } from '../../api';
import { FeedbackType, Feedback } from '../../types';
import { useToast } from '../../context';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  analysisId: number;
  initialType: FeedbackType;
  currentRecommendation: string;
  onFeedbackSaved: (feedback: Feedback) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  incidentId,
  analysisId,
  initialType,
  currentRecommendation,
  onFeedbackSaved,
}) => {
  const toast = useToast();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(initialType);
  const [notes, setNotes] = useState('');
  const [modifiedRec, setModifiedRec] = useState(currentRecommendation);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await sendFeedback(incidentId, {
        analysis_id: analysisId,
        feedback_type: feedbackType,
        notes: notes.trim() || null,
        modified_recommendation: feedbackType === 'modify' ? modifiedRec.trim() : null,
      });

      toast.success(
        `Feedback recorded (${feedbackType.toUpperCase()}). Memory reinforced.`,
        'Feedback Recorded'
      );
      onFeedbackSaved(res);
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err), 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Engineer Review & Human-in-the-Loop Feedback"
      subtitle="Your feedback trains future incident analysis and reinforces institutional memory accuracy."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Guardrail Warning */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">Human approval required:</strong> AI recommendations are never executed automatically. You are evaluating whether this recommendation is sound.
          </span>
        </div>

        {/* Action Type Toggle */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Feedback Assessment
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFeedbackType('accept')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                feedbackType === 'accept'
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
              Accept
            </button>

            <button
              type="button"
              onClick={() => setFeedbackType('modify')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                feedbackType === 'modify'
                  ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              Modify
            </button>

            <button
              type="button"
              onClick={() => setFeedbackType('reject')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                feedbackType === 'reject'
                  ? 'bg-rose-950/70 border-rose-500 text-rose-300 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
              Reject
            </button>
          </div>
        </div>

        {/* If Modify: Modified Recommendation Input */}
        {feedbackType === 'modify' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
              Refined Recommendation
            </label>
            <textarea
              rows={3}
              value={modifiedRec}
              onChange={(e) => setModifiedRec(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-amber-500/50 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-amber-400"
              placeholder="Correct the recommendation with human insight..."
              required
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Engineer Triage Notes / Rationale
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              feedbackType === 'accept'
                ? 'e.g. Spot on. Suggestion matched root cause perfectly.'
                : feedbackType === 'reject'
                ? 'e.g. Recommendation would cause cascading restarts.'
                : 'e.g. Adjusted connection pool values based on cluster headroom.'
            }
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-teal-500"
          />
        </div>

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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Saving...' : 'Submit Evaluation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
