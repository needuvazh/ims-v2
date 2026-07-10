'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ResponsiveDataTable,
  Textarea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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

function recordBadge(status: string) {
  if (status === 'Present') return <Badge variant="success">Present</Badge>;
  if (status === 'Late') return <Badge variant="info">Late</Badge>;
  if (status === 'Excused') return <Badge variant="outline">Excused</Badge>;
  if (status === 'Absent') return <Badge variant="error">Absent</Badge>;
  return <Badge variant="default">Unmarked</Badge>;
}

async function postCorrectionAction(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.messageEnglish ||
        payload?.error ||
        'Unable to complete correction action.',
    );
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
        await postCorrectionAction(
          `/api/v1/attendance/corrections/${correctionId}/approve`,
        );
        toast.success('Attendance correction approved.');
        router.refresh();
      } catch (submissionError) {
        toast.error(
          submissionError instanceof Error
            ? submissionError.message
            : 'Failed to approve correction.',
        );
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
        await postCorrectionAction(
          `/api/v1/attendance/corrections/${rejectTarget.id}/reject`,
          { reason },
        );
        toast.success('Attendance correction rejected.');
        setRejectTarget(null);
        setRejectReason('');
        router.refresh();
      } catch (submissionError) {
        toast.error(
          submissionError instanceof Error
            ? submissionError.message
            : 'Failed to reject correction.',
        );
      }
    });
  };

  const pendingList = useMemo(
    () => corrections.filter((c) => c.status === 'Pending'),
    [corrections],
  );
  const approvedList = useMemo(
    () => corrections.filter((c) => c.status === 'Approved'),
    [corrections],
  );
  const rejectedList = useMemo(
    () => corrections.filter((c) => c.status === 'Rejected'),
    [corrections],
  );

  const columns = [
    {
      header: 'Student',
      render: (correction: CorrectionRow) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-[color:var(--ims-ink)]">
            {correction.studentName}
          </div>
          <div className="text-xs text-[color:var(--ims-muted)]">
            {correction.studentNumber}
          </div>
        </div>
      ),
    },
    {
      header: 'Batch / Session',
      render: (correction: CorrectionRow) => (
        <div className="space-y-0.5">
          <div className="font-semibold">{correction.sessionTitle}</div>
          <div className="text-xs text-[color:var(--ims-muted)]">
            {correction.batchCode} | #{correction.sessionNumber ?? '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Transition',
      render: (correction: CorrectionRow) => (
        <div className="text-sm">
          <span className="font-semibold">
            {recordBadge(correction.oldStatus)}
          </span>
          <span className="text-[color:var(--ims-muted)]"> &rarr; </span>
          <span className="font-semibold">
            {recordBadge(correction.newStatus)}
          </span>
          <p className="mt-1 text-xs text-[color:var(--ims-muted)] italic">
            Reason: "{correction.reason}"
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (correction: CorrectionRow) => statusBadge(correction.status),
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Requested By',
      render: (correction: CorrectionRow) => (
        <span className="text-sm text-[color:var(--ims-muted)]">
          {correction.requestedByLabel}
        </span>
      ),
    },
    {
      header: 'Requested At',
      className: 'text-right',
      render: (correction: CorrectionRow) => (
        <span className="text-sm text-[color:var(--ims-muted)]">
          {new Date(correction.requestedAt).toLocaleString()}
        </span>
      ),
      headerClassName: 'text-right w-[180px]',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (correction: CorrectionRow) =>
        correction.status === 'Pending' ? (
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
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
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
          <span className="text-xs text-[color:var(--ims-muted)] font-medium">
            No actions pending
          </span>
        ),
      headerClassName: 'text-right w-[220px]',
    },
  ];

  const renderCard = (correction: CorrectionRow) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold text-[var(--ims-ink)]">
              {correction.studentName}
            </p>
            <p className="text-xs text-[var(--ims-muted)]">
              {correction.studentNumber}
            </p>
          </div>
          {statusBadge(correction.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Batch</p>
            <p className="truncate">{correction.batchCode}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Session</p>
            <p className="truncate">#{correction.sessionNumber ?? '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">
              Session Title
            </p>
            <p className="truncate">{correction.sessionTitle}</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">Transition</p>
            <p className="truncate">
              <span className="font-semibold">{correction.oldStatus}</span>
              <span className="text-[color:var(--ims-muted)]"> &rarr; </span>
              <span className="font-semibold">{correction.newStatus}</span>
            </p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">Reason</p>
            <p className="line-clamp-3 text-[color:var(--ims-muted)] italic">
              "{correction.reason}"
            </p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">
              Requested By
            </p>
            <p className="truncate">{correction.requestedByLabel}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">
              Requested At
            </p>
            <p className="truncate">
              {new Date(correction.requestedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        {correction.status === 'Pending' ? (
          <div className="flex w-full flex-wrap gap-2">
            {canApprove ? (
              <Button
                type="button"
                size="sm"
                variant="primary"
                className="flex-1 gap-2"
                disabled={isPending}
                onClick={() => handleApprove(correction.id)}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve
              </Button>
            ) : null}
            {canReject ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
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
          <span className="text-xs text-[color:var(--ims-muted)]">
            Processed
          </span>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <>
      {error ? (
        <Alert
          variant="error"
          title="Correction action failed"
          description={error}
        />
      ) : null}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="pending" className="gap-2">
            Pending Review
            <Badge
              variant="outline"
              className="ml-1 bg-slate-50 font-semibold px-1.5 py-0"
            >
              {pendingList.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            Approved
            <Badge
              variant="outline"
              className="ml-1 bg-slate-50 font-semibold px-1.5 py-0"
            >
              {approvedList.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            Rejected
            <Badge
              variant="outline"
              className="ml-1 bg-slate-50 font-semibold px-1.5 py-0"
            >
              {rejectedList.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            All History
            <Badge
              variant="outline"
              className="ml-1 bg-slate-50 font-semibold px-1.5 py-0"
            >
              {corrections.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center text-sm text-[color:var(--ims-muted)]">
              All correction requests reviewed! Clear pipeline.
            </div>
          ) : (
            <ResponsiveDataTable
              data={pendingList}
              keyExtractor={(correction) => correction.id}
              emptyState={null}
              columns={columns}
              renderCard={renderCard}
            />
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center text-sm text-[color:var(--ims-muted)]">
              No approved requests in history.
            </div>
          ) : (
            <ResponsiveDataTable
              data={approvedList}
              keyExtractor={(correction) => correction.id}
              emptyState={null}
              columns={columns}
              renderCard={renderCard}
            />
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center text-sm text-[color:var(--ims-muted)]">
              No rejected requests in history.
            </div>
          ) : (
            <ResponsiveDataTable
              data={rejectedList}
              keyExtractor={(correction) => correction.id}
              emptyState={null}
              columns={columns}
              renderCard={renderCard}
            />
          )}
        </TabsContent>

        <TabsContent value="all">
          <ResponsiveDataTable
            data={corrections}
            keyExtractor={(correction) => correction.id}
            emptyState={null}
            columns={columns}
            renderCard={renderCard}
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Reject Attendance Correction</DialogTitle>
            <DialogDescription>
              Rejection keeps the original attendance value unchanged. Add a
              clear reason for the audit trail.
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleReject}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reject Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
