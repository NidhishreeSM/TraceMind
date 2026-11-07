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
        <div className="p-3.5 rounded-xl bg-[#131C31] border border-white/[0.07] text-[11px] text-[#94A3B8] flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[#F1F5F9]">Human approval required:</strong> AI recommendations are never executed automatically. You are evaluating whether this recommendation is sound.
          </span>
        </div>

        {/* Action Type Toggle (Accept = Green, Modify = Amber, Reject = Red) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-[#F1F5F9]">
            Feedback Assessment
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFeedbackType('accept')}
              className={`p-2.5 rounded-full border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                feedbackType === 'accept'
                  ? 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]'
                  : 'bg-[#131C31] border-white/[0.07] text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Accept
            </button>

            <button
              type="button"
              onClick={() => setFeedbackType('modify')}
              className={`p-2.5 rounded-full border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                feedbackType === 'modify'
                  ? 'bg-[#EAB308]/20 text-[#EAB308] border-[#EAB308]'
                  : 'bg-[#131C31] border-white/[0.07] text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Modify
            </button>

            <button
              type="button"
              onClick={() => setFeedbackType('reject')}
              className={`p-2.5 rounded-full border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                feedbackType === 'reject'
                  ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]'
                  : 'bg-[#131C31] border-white/[0.07] text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        </div>

        {/* If Modify: Modified Recommendation Input */}
        {feedbackType === 'modify' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#EAB308]">
              Refined Recommendation
            </label>
            <textarea
              rows={3}
              value={modifiedRec}
              onChange={(e) => setModifiedRec(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#131C31] border border-[#EAB308]/40 rounded-xl text-xs sm:text-sm text-[#F1F5F9] focus:outline-hidden focus:border-[#EAB308]"
              placeholder="Correct the recommendation with human insight..."
              required
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-[#F1F5F9]">
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
            className="w-full px-3.5 py-2.5 bg-[#131C31] border border-white/[0.07] rounded-xl text-xs sm:text-sm text-[#F1F5F9] focus:outline-hidden focus:border-[#3B82F6]"
          />
        </div>

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
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white hover:bg-[#C9D6EA] text-[#080E1D] font-semibold text-xs transition cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Saving...' : 'Submit Evaluation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
