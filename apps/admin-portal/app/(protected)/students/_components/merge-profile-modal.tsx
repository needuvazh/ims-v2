'use client';

import { useState } from 'react';
import { GitMerge, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type Props = {
  survivorProfileId: string;
  survivorStudentNumber: string;
  onClose: () => void;
};

/**
 * MergeProfileModal
 *
 * Shown on the Student Detail page for users with the `student.merge` permission.
 * Accepts the source profile ID and a mandatory merge reason, then calls the
 * /api/v1/students/merge route.
 *
 * The calling page controls visibility — render this component only when the
 * actor has the `student.merge` permission.
 */
export function MergeProfileModal({ survivorProfileId, survivorStudentNumber, onClose }: Props) {
  const router = useRouter();
  const [sourceProfileId, setSourceProfileId] = useState('');
  const [mergeReason, setMergeReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const canSubmit =
    sourceProfileId.trim().length === 36 &&
    mergeReason.trim().length >= 10 &&
    confirmed &&
    !loading;

  const handleMerge = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/students/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survivorStudentProfileId: survivorProfileId,
          sourceStudentProfileId: sourceProfileId.trim(),
          mergeReason: mergeReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.messageEnglish || 'Merge failed.');
      toast.success('Profiles merged successfully.');
      onClose();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <GitMerge className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Merge Duplicate Profile</h2>
            <p className="text-xs text-slate-500">
              This will permanently merge the source into{' '}
              <span className="font-mono font-semibold">{survivorStudentNumber}</span>
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 flex gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Irreversible action.</strong> All admissions, enrollments, documents, and leads
            from the source profile will be permanently remapped to the survivor. The source profile
            will be archived.
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="merge-source-id"
              className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              Source Profile ID (to be archived)
            </label>
            <input
              id="merge-source-id"
              type="text"
              value={sourceProfileId}
              onChange={(e) => setSourceProfileId(e.target.value)}
              placeholder="Paste the UUID of the duplicate profile"
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="merge-reason"
              className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              Merge Reason (min. 10 characters)
            </label>
            <textarea
              id="merge-reason"
              rows={3}
              value={mergeReason}
              onChange={(e) => setMergeReason(e.target.value)}
              placeholder="Describe why these profiles are being merged..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <p className="text-xs text-slate-400 text-right">{mergeReason.length}/500</p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              id="merge-confirm-checkbox"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-red-600"
            />
            <span className="text-sm text-slate-600">
              I understand this action is irreversible and has been reviewed with the Branch Manager.
            </span>
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            id="merge-cancel-btn"
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            id="merge-submit-btn"
            type="button"
            onClick={handleMerge}
            disabled={!canSubmit}
            className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}
            {loading ? 'Merging…' : 'Merge Profiles'}
          </button>
        </div>
      </div>
    </div>
  );
}
