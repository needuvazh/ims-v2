'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@ims/shared-ui';

type CorrectionRow = {
  id: string;
  branchId: string;
  oldStatus: string;
  newStatus: string;
  reason: string;
  status: string;
  requestedAt: string | Date;
  requestedByLabel: string;
  studentName: string;
  studentNumber: string;
  batchCode: string;
  sessionTitle: string;
  sessionNumber: number | null;
};

function statusBadge(status: string) {
  if (status === 'Pending') return <Badge variant="info">Pending</Badge>;
  if (status === 'Approved') return <Badge variant="success">Approved</Badge>;
  if (status === 'Rejected') return <Badge variant="error">Rejected</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

async function postCorrectionAction(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.messageEnglish || payload?.error || 'Unable to complete correction action.');
  }

  return payload.data;
}

export function AttendanceCorrectionsQueue({
  corrections,
  canApprove,
  canReject,
}: {
  corrections: CorrectionRow[];
  canApprove: boolean;
  canReject: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectTarget, setRejectTarget] = useState<CorrectionRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleApprove = (correctionId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await postCorrectionAction(`/api/v1/attendance/corrections/${correctionId}/approve`);
        toast.success('Attendance correction approved.');
        router.refresh();
      } catch (submissionError) {
        toast.error(submissionError instanceof Error ? submissionError.message : 'Failed to approve correction.');
      }
    });
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (reason.length < 5) {
      setError('Enter a rejection reason with at least 5 characters.');
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await postCorrectionAction(`/api/v1/attendance/corrections/${rejectTarget.id}/reject`, { reason });
        toast.success('Attendance correction rejected.');
        setRejectTarget(null);
        setRejectReason('');
        router.refresh();
      } catch (submissionError) {
        toast.error(submissionError instanceof Error ? submissionError.message : 'Failed to reject correction.');
      }
    });
  };

  return (
    <>
      {error ? <Alert variant="error" title="Correction action failed" description={error} /> : null}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Batch / Session</TableHead>
              <TableHead>Transition</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead className="text-right">Requested At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {corrections.map((correction) => (
              <TableRow key={correction.id}>
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="font-semibold text-[color:var(--ims-ink)]">{correction.studentName}</div>
                    <div className="text-xs text-[color:var(--ims-muted)]">{correction.studentNumber}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="font-semibold">{correction.sessionTitle}</div>
                    <div className="text-xs text-[color:var(--ims-muted)]">{correction.batchCode} | #{correction.sessionNumber ?? '—'}</div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <span className="font-semibold">{correction.oldStatus}</span>
                  <span className="text-[color:var(--ims-muted)]"> → </span>
                  <span className="font-semibold">{correction.newStatus}</span>
                  <p className="mt-1 text-xs text-[color:var(--ims-muted)]">{correction.reason}</p>
                </TableCell>
                <TableCell>{statusBadge(correction.status)}</TableCell>
                <TableCell className="text-sm text-[color:var(--ims-muted)]">{correction.requestedByLabel}</TableCell>
                <TableCell className="text-right text-sm text-[color:var(--ims-muted)]">
                  {new Date(correction.requestedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {correction.status === 'Pending' ? (
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      {canApprove ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          className="gap-2"
                          disabled={isPending}
                          onClick={() => handleApprove(correction.id)}
                        >
                          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Approve
                        </Button>
                      ) : null}
                      {canReject ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={isPending}
                          onClick={() => {
                            setError(null);
                            setRejectTarget(correction);
                            setRejectReason('');
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-sm text-[color:var(--ims-muted)]">No action</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Reject Attendance Correction</DialogTitle>
            <DialogDescription>
              Rejection keeps the original attendance value unchanged. Add a clear reason for the audit trail.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            label="Rejection reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={4}
            placeholder="Explain why this correction request is being rejected."
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleReject} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reject Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
