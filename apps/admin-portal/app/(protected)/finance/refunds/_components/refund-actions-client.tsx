'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input } from '@ims/shared-ui';
import { CheckCircle2, XCircle, Play, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { approveRefundAction, rejectRefundAction, executeRefundAction } from '../actions';

interface RefundActionsClientProps {
  refundId: string;
  status: string;
  refundNumber: string;
}

export function RefundActionsClient({ refundId, status, refundNumber }: RefundActionsClientProps) {
  const [loading, setLoading] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState<'approve' | 'reject' | 'execute' | null>(null);
  const [inputValue, setInputValue] = useState('');

  const handleAction = async () => {
    if (!showReasonModal) return;
    setLoading(true);

    try {
      let res;
      if (showReasonModal === 'approve') {
        res = await approveRefundAction(refundId, inputValue || 'Approved by administrator');
      } else if (showReasonModal === 'reject') {
        if (!inputValue.trim()) {
          toast.error('Please enter a reason for rejection');
          setLoading(false);
          return;
        }
        res = await rejectRefundAction(refundId, inputValue);
      } else if (showReasonModal === 'execute') {
        if (!inputValue.trim()) {
          toast.error('Please enter an execution reference (e.g., bank transfer reference)');
          setLoading(false);
          return;
        }
        res = await executeRefundAction(refundId, inputValue);
      }

      if (res?.success) {
        toast.success(`Refund request updated: ${refundNumber}`);
        setShowReasonModal(null);
        setInputValue('');
      } else {
        toast.error(res?.error || 'Failed to perform refund action');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'Requested') {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
          onClick={() => { setInputValue(''); setShowReasonModal('approve'); }}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
          onClick={() => { setInputValue(''); setShowReasonModal('reject'); }}
        >
          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
        </Button>

        <Modal
          title={showReasonModal === 'approve' ? 'Approve Refund Request' : 'Reject Refund Request'}
          isOpen={showReasonModal === 'approve' || showReasonModal === 'reject'}
          onClose={() => setShowReasonModal(null)}
        >
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              {showReasonModal === 'approve'
                ? 'Confirming this will approve the refund. Enter any approval remarks:'
                : 'Please enter the reason for rejecting this refund request:'}
            </p>
            <Input
              placeholder={showReasonModal === 'approve' ? 'Approval remarks...' : 'Reason for rejection (required)...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowReasonModal(null)} disabled={loading}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAction}
                disabled={loading}
                className={showReasonModal === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  if (status === 'Approved') {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => { setInputValue(''); setShowReasonModal('execute'); }}
        >
          <Play className="h-3.5 w-3.5 mr-1" /> Execute
        </Button>

        <Modal
          title="Execute Refund Reversal"
          isOpen={showReasonModal === 'execute'}
          onClose={() => setShowReasonModal(null)}
        >
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              Enter the bank transaction or cheque execution reference to mark the refund as executed:
            </p>
            <Input
              placeholder="Execution reference number (required)..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowReasonModal(null)} disabled={loading}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAction} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {loading ? 'Processing...' : 'Confirm Execution'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return null;
}

// Portal-based modal — renders directly on document.body to escape
// any overflow:hidden or CSS transform on parent table/card elements.
function Modal({
  title,
  isOpen,
  onClose,
  children,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
          <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-500" /> {title}
          </h5>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
