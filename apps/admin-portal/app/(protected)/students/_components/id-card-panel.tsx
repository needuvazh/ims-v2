'use client';

import { useState } from 'react';
import {
  CreditCard,
  Printer,
  RefreshCw,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type IdCardHistoryEntry = {
  id: string;
  eventType: string;
  oldIdCardNumber: string | null;
  newIdCardNumber: string | null;
  eventDate: string;
  reason: string;
};

type Props = {
  studentProfileId: string;
  idCardIssued: boolean;
  idCardNumber: string | null;
  idCardHistory: IdCardHistoryEntry[];
};

/**
 * IdCardPanel
 *
 * Displays current ID card status and issue/reissue history.
 * Renders the issue or reissue form inline. Wired to the existing
 * /api/v1/admissions/[id]/id-card endpoints via admission-level calls.
 *
 * Note: The ID card issue/reissue API is accessed via the Admission route.
 * This panel calls /api/v1/students/[id]/id-card which we wire below.
 */
export function IdCardPanel({
  studentProfileId,
  idCardIssued,
  idCardNumber,
  idCardHistory,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const isReissue = idCardIssued;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please enter a reason for the card issuance.');
      return;
    }
    if (!cardNumber.trim()) {
      toast.error('Please enter the new ID card number.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/students/${studentProfileId}/id-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newIdCardNumber: cardNumber.trim(),
          reason: reason.trim(),
          eventType: isReissue ? 'Reissue' : 'Issue',
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.messageEnglish || 'Failed to issue ID card.');
      toast.success(
        isReissue
          ? 'ID card reissued successfully.'
          : 'ID card issued successfully.',
      );
      setShowForm(false);
      setReason('');
      setCardNumber('');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Card Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center ${
              idCardIssued ? 'bg-green-100' : 'bg-slate-100'
            }`}
          >
            <CreditCard
              className={`h-5 w-5 ${idCardIssued ? 'text-green-600' : 'text-slate-400'}`}
            />
          </div>
          <div>
            {idCardIssued ? (
              <>
                <p className="text-sm font-semibold text-slate-800">
                  Card Issued
                </p>
                <p className="text-xs font-mono text-slate-500">
                  {idCardNumber}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-500">
                  No Card Issued
                </p>
                <p className="text-xs text-slate-400">
                  Issue the first ID card below
                </p>
              </>
            )}
          </div>
        </div>
        <button
          id={isReissue ? 'id-card-reissue-btn' : 'id-card-issue-btn'}
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 font-medium"
        >
          {isReissue ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" /> Reissue
            </>
          ) : (
            <>
              <Printer className="h-3.5 w-3.5" /> Issue Card
            </>
          )}
        </button>
      </div>

      {/* Issue / Reissue Form */}
      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm">
          <div className="space-y-1">
            <label
              htmlFor="id-card-number-input"
              className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              {isReissue ? 'New Card Number' : 'Card Number'}
            </label>
            <input
              id="id-card-number-input"
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="e.g. ASTI-2026-00123"
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[color:var(--ims-brass)]"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="id-card-reason-input"
              className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              Reason
            </label>
            <input
              id="id-card-reason-input"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isReissue
                  ? 'e.g. Lost original card'
                  : 'First issuance on enrolment'
              }
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--ims-brass)]"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              id="id-card-cancel-btn"
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 h-8 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-white"
            >
              Cancel
            </button>
            <button
              id="id-card-submit-btn"
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 h-8 rounded-lg bg-[color:var(--ims-brass)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Print History */}
      {idCardHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Issue History
          </p>
          <div className="space-y-1.5">
            {idCardHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between text-xs rounded-lg bg-white border border-slate-100 px-3 py-2"
              >
                <div>
                  <span
                    className={`font-semibold ${
                      entry.eventType === 'Reissue'
                        ? 'text-amber-600'
                        : 'text-green-600'
                    }`}
                  >
                    {entry.eventType}
                  </span>
                  {entry.newIdCardNumber && (
                    <span className="ml-2 font-mono text-slate-600">
                      {entry.newIdCardNumber}
                    </span>
                  )}
                  <p className="text-slate-400 mt-0.5">{entry.reason}</p>
                </div>
                <span className="text-slate-300 font-mono ml-4 flex-shrink-0">
                  {new Date(entry.eventDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
