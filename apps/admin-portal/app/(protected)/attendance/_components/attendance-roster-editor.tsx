'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ClipboardList,
  Loader2,
  MessageSquarePlus,
  Save,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@ims/shared-ui';

type AttendanceSessionStatus =
  | 'Draft'
  | 'Open'
  | 'Submitted'
  | 'Locked'
  | 'Reopened'
  | 'Cancelled';
type AttendanceRecordStatus =
  | 'Present'
  | 'Absent'
  | 'Late'
  | 'Excused'
  | 'Unmarked';

type AttendanceRosterRecord = {
  id: string;
  status: AttendanceRecordStatus;
  remarks: string | null;
  lateMinutes: number | null;
  markedAt: string | Date | null;
  correctionStatus:
    | 'Pending'
    | 'Approved'
    | 'Rejected'
    | 'Cancelled'
    | 'None'
    | null;
  enrollment: {
    id: string;
    studentProfile: {
      id: string;
      studentNumber: string;
      person: {
        firstName: string;
        lastName: string;
      };
    };
  };
};

type AttendanceRosterEditorProps = {
  sessionId: string;
  sessionStatus: AttendanceSessionStatus;
  sessionTitleEnglish: string;
  sessionTitleArabic: string | null;
  sessionNumber: number | null;
  batchCode: string;
  branchName: string;
  attendanceDate: string | Date;
  records: AttendanceRosterRecord[];
  canMarkAttendance: boolean;
  canGenerateRoster: boolean;
  canRequestCorrection: boolean;
};

type RowState = {
  attendanceRecordId: string;
  status: AttendanceRecordStatus;
  remarks: string;
  lateMinutes: string;
  studentName: string;
  studentNumber: string;
  enrollmentId: string;
  markedAt: string | Date | null;
  correctionStatus:
    | 'Pending'
    | 'Approved'
    | 'Rejected'
    | 'Cancelled'
    | 'None'
    | null;
};

type CorrectionDraft = {
  attendanceRecordId: string;
  currentStatus: AttendanceRecordStatus;
  newStatus: AttendanceRecordStatus;
  reason: string;
  studentName: string;
};

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-OM', { timeZone: 'Asia/Muscat' });
}

function isEditableSession(status: AttendanceSessionStatus) {
  return status === 'Draft' || status === 'Open' || status === 'Reopened';
}

function statusBadge(status: AttendanceRecordStatus) {
  if (status === 'Present') return <Badge variant="success">Present</Badge>;
  if (status === 'Late') return <Badge variant="info">Late</Badge>;
  if (status === 'Excused') return <Badge variant="outline">Excused</Badge>;
  if (status === 'Absent') return <Badge variant="error">Absent</Badge>;
  return <Badge variant="default">Unmarked</Badge>;
}

function sessionBadge(status: AttendanceSessionStatus) {
  if (status === 'Open' || status === 'Draft')
    return <Badge variant="info">{status}</Badge>;
  if (status === 'Submitted') return <Badge variant="success">{status}</Badge>;
  if (status === 'Locked') return <Badge variant="default">{status}</Badge>;
  if (status === 'Reopened') return <Badge variant="outline">{status}</Badge>;
  return <Badge variant="error">{status}</Badge>;
}

function toPayload(rows: RowState[]) {
  return {
    records: rows.map((row) => ({
      attendanceRecordId: row.attendanceRecordId,
      status: row.status,
      remarks: row.remarks.trim() ? row.remarks.trim() : null,
      lateMinutes: row.lateMinutes.trim() ? Number(row.lateMinutes) : null,
      isManualOverride: false,
    })),
  };
}

async function postAttendanceAction(path: string, body?: unknown) {
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
        'Unable to complete attendance action.',
    );
  }

  return payload.data;
}

const attendanceStatuses: AttendanceRecordStatus[] = [
  'Present',
  'Absent',
  'Late',
  'Excused',
  'Unmarked',
];

export function AttendanceRosterEditor({
  sessionId,
  sessionStatus,
  sessionTitleEnglish,
  sessionTitleArabic,
  sessionNumber,
  batchCode,
  branchName,
  attendanceDate,
  records,
  canMarkAttendance,
  canGenerateRoster,
  canRequestCorrection,
}: AttendanceRosterEditorProps) {
  const router = useRouter();
  const [rows, setRows] = useState<RowState[]>(() =>
    records.map((record) => ({
      attendanceRecordId: record.id,
      status: record.status,
      remarks: record.remarks ?? '',
      lateMinutes: record.lateMinutes?.toString() ?? '',
      studentName: `${record.enrollment.studentProfile.person.firstName} ${record.enrollment.studentProfile.person.lastName}`,
      studentNumber: record.enrollment.studentProfile.studentNumber,
      enrollmentId: record.enrollment.id,
      markedAt: record.markedAt,
      correctionStatus: record.correctionStatus,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [correctionDraft, setCorrectionDraft] =
    useState<CorrectionDraft | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionTargetStatus, setCorrectionTargetStatus] =
    useState<AttendanceRecordStatus>('Present');
  const [isPending, startTransition] = useTransition();

  const editable = isEditableSession(sessionStatus) && canMarkAttendance;

  const stats = useMemo(() => {
    const present = rows.filter((row) => row.status === 'Present').length;
    const late = rows.filter((row) => row.status === 'Late').length;
    const excused = rows.filter((row) => row.status === 'Excused').length;
    const absent = rows.filter((row) => row.status === 'Absent').length;
    const unmarked = rows.filter((row) => row.status === 'Unmarked').length;

    return {
      total: rows.length,
      marked: rows.length - unmarked,
      present,
      late,
      excused,
      absent,
      unmarked,
    };
  }, [rows]);

  const updateRow = (attendanceRecordId: string, patch: Partial<RowState>) => {
    setRows((current) =>
      current.map((row) =>
        row.attendanceRecordId === attendanceRecordId
          ? { ...row, ...patch }
          : row,
      ),
    );
  };

  const validateRows = (forSubmit: boolean) => {
    if (rows.length === 0) {
      return 'Generate the attendance roster before marking attendance.';
    }

    for (const row of rows) {
      if (forSubmit && row.status === 'Unmarked') {
        return `Resolve unmarked attendance for ${row.studentName} before submitting.`;
      }
      if (
        row.status === 'Late' &&
        (!row.lateMinutes.trim() || Number(row.lateMinutes) <= 0)
      ) {
        return `Late minutes are required for ${row.studentName}.`;
      }
      if (row.status === 'Excused' && !row.remarks.trim()) {
        return `A reason is required for ${row.studentName} when marking Excused.`;
      }
    }

    return null;
  };

  const handleGenerateRoster = () => {
    setError(null);
    if (!canGenerateRoster) {
      setError(
        'You do not have permission to generate the roster for this session.',
      );
      return;
    }

    startTransition(async () => {
      try {
        await postAttendanceAction(
          `/api/v1/attendance/sessions/${sessionId}/roster`,
        );
        toast.success('Attendance roster generated.');
        router.refresh();
      } catch (submissionError) {
        toast.error(
          submissionError instanceof Error
            ? submissionError.message
            : 'Failed to generate roster.',
        );
      }
    });
  };

  const handleSaveDraft = () => {
    setError(null);
    if (!editable) {
      setError(
        'This attendance session is locked or cannot be edited in its current state.',
      );
      return;
    }

    const validationError = validateRows(false);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      try {
        await postAttendanceAction(
          `/api/v1/attendance/sessions/${sessionId}/mark`,
          toPayload(rows),
        );
        toast.success('Attendance draft saved.');
        router.refresh();
      } catch (submissionError) {
        toast.error(
          submissionError instanceof Error
            ? submissionError.message
            : 'Failed to save attendance draft.',
        );
      }
    });
  };

  const handleSubmit = () => {
    setError(null);
    if (!editable) {
      setError(
        'This attendance session is locked or cannot be submitted in its current state.',
      );
      return;
    }

    const validationError = validateRows(true);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      try {
        await postAttendanceAction(
          `/api/v1/attendance/sessions/${sessionId}/mark`,
          toPayload(rows),
        );
        await postAttendanceAction(
          `/api/v1/attendance/sessions/${sessionId}/submit`,
          {
            allowUnmarked: false,
            reason: null,
          },
        );
        toast.success('Attendance submitted successfully.');
        router.refresh();
      } catch (submissionError) {
        toast.error(
          submissionError instanceof Error
            ? submissionError.message
            : 'Failed to submit attendance.',
        );
      }
    });
  };

  const openCorrectionDialog = (row: RowState) => {
    setError(null);
    if (row.correctionStatus === 'Pending') {
      setError(
        'A correction is already pending for this record. Wait for approval or rejection before requesting another one.',
      );
      return;
    }
    setCorrectionDraft({
      attendanceRecordId: row.attendanceRecordId,
      currentStatus: row.status,
      newStatus:
        attendanceStatuses.find((status) => status !== row.status) ?? 'Present',
      reason: '',
      studentName: row.studentName,
    });
    setCorrectionReason('');
    setCorrectionTargetStatus(
      attendanceStatuses.find((status) => status !== row.status) ?? 'Present',
    );
  };

  const handleRequestCorrection = () => {
    if (!correctionDraft) return;
    const reason = correctionReason.trim();
    if (reason.length < 5) {
      setError('Enter a correction reason with at least 5 characters.');
      return;
    }
    if (correctionTargetStatus === correctionDraft.currentStatus) {
      setError('Choose a different target status for the correction.');
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await postAttendanceAction('/api/v1/attendance/corrections', {
          attendanceRecordId: correctionDraft.attendanceRecordId,
          newStatus: correctionTargetStatus,
          reason,
        });
        toast.success('Attendance correction requested.');
        setCorrectionDraft(null);
        setCorrectionReason('');
        router.refresh();
      } catch (submissionError) {
        toast.error(
          submissionError instanceof Error
            ? submissionError.message
            : 'Failed to request correction.',
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert
          variant="error"
          title="Attendance action failed"
          description={error}
        />
      )}

      <Card>
        <CardHeader className="border-b border-[color:var(--ims-border)] bg-[color:var(--ims-surface-hover)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ClipboardList className="h-4 w-4 text-[color:var(--ims-brass)]" />
                Mark Attendance
              </CardTitle>
              <CardDescription>
                Use the roster below to record Present, Absent, Late, or Excused
                for each enrolled student.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {sessionBadge(sessionStatus)}
              <Badge variant="outline">
                {editable ? 'Editable' : 'Read only'}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-4 sm:p-5 lg:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                Session
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--ims-ink)]">
                {sessionTitleEnglish}
              </p>
              {sessionTitleArabic ? (
                <p className="mt-1 text-sm text-[color:var(--ims-muted)] font-arabic">
                  {sessionTitleArabic}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-[color:var(--ims-muted)]">
                #{sessionNumber ?? '—'} | {batchCode}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                Branch
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--ims-ink)]">
                {branchName}
              </p>
              <p className="mt-2 text-xs text-[color:var(--ims-muted)]">
                Attendance date: {formatDateTime(attendanceDate)}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                Marked
              </p>
              <p className="mt-2 text-3xl font-semibold text-[color:var(--ims-ink)]">
                {stats.marked}
              </p>
              <p className="mt-2 text-xs text-[color:var(--ims-muted)]">
                of {stats.total} roster rows
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                Unmarked
              </p>
              <p className="mt-2 text-3xl font-semibold text-[color:var(--ims-ink)]">
                {stats.unmarked}
              </p>
              <p className="mt-2 text-xs text-[color:var(--ims-muted)]">
                Resolve before submit
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Present {stats.present}</Badge>
            <Badge variant="info">Late {stats.late}</Badge>
            <Badge variant="outline">Excused {stats.excused}</Badge>
            <Badge variant="error">Absent {stats.absent}</Badge>
          </div>

          {records.length === 0 ? (
            <Alert
              variant="info"
              title="Roster not generated yet"
              description="Generate the attendance roster first so the session loads one row per active enrollment."
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateRoster}
              disabled={isPending || !canGenerateRoster || !canMarkAttendance}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Roster
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isPending || !editable || rows.length === 0}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Draft
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={isPending || !editable || rows.length === 0}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Attendance
            </Button>
          </div>

          {!editable && (
            <Alert
              variant="warning"
              title="This session is not editable"
              description="Submitted, locked, or cancelled sessions must be changed through the correction or reopen workflow."
            />
          )}

          {records.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Enrollment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px]">Late Mins</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-right">Marked At</TableHead>
                    {canRequestCorrection ? (
                      <TableHead className="text-right">Actions</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.attendanceRecordId}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-[color:var(--ims-ink)]">
                            {row.studentName}
                          </div>
                          <div className="text-xs text-[color:var(--ims-muted)]">
                            {row.studentNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[color:var(--ims-muted)]">
                        {row.enrollmentId}
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <Select
                          value={row.status}
                          disabled={!editable}
                          onChange={(event) =>
                            updateRow(row.attendanceRecordId, {
                              status: event.target
                                .value as AttendanceRecordStatus,
                            })
                          }
                          options={[
                            { value: 'Present', label: 'Present' },
                            { value: 'Absent', label: 'Absent' },
                            { value: 'Late', label: 'Late' },
                            { value: 'Excused', label: 'Excused' },
                            { value: 'Unmarked', label: 'Unmarked' },
                          ]}
                        />
                        <div className="mt-2">{statusBadge(row.status)}</div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={row.lateMinutes}
                          disabled={!editable || row.status !== 'Late'}
                          onChange={(event) =>
                            updateRow(row.attendanceRecordId, {
                              lateMinutes: event.target.value,
                            })
                          }
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={row.remarks}
                          disabled={!editable}
                          onChange={(event) =>
                            updateRow(row.attendanceRecordId, {
                              remarks: event.target.value,
                            })
                          }
                          rows={2}
                          placeholder={
                            row.status === 'Excused'
                              ? 'Reason required for excused attendance'
                              : 'Optional internal note'
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm text-[color:var(--ims-muted)]">
                        {formatDateTime(row.markedAt)}
                      </TableCell>
                      {canRequestCorrection ? (
                        <TableCell className="text-right">
                          {row.correctionStatus === 'Pending' ? (
                            <Badge variant="info">Correction Pending</Badge>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={() => openCorrectionDialog(row)}
                            >
                              <MessageSquarePlus className="h-4 w-4" />
                              Request Correction
                            </Button>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-xs text-[color:var(--ims-muted)]">
            Late attendance requires positive late minutes. Excused attendance
            requires a reason. Unmarked rows must be resolved before submission.
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(correctionDraft)}
        onOpenChange={(open) => !open && setCorrectionDraft(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Request Attendance Correction</DialogTitle>
            <DialogDescription>
              Create a pending correction for {correctionDraft?.studentName}.
              The request will go to the correction queue for approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                  Current Status
                </p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--ims-ink)]">
                  {correctionDraft?.currentStatus ?? '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                  Target Status
                </p>
                <div className="mt-2">
                  <Select
                    value={correctionTargetStatus}
                    onChange={(event) =>
                      setCorrectionTargetStatus(
                        event.target.value as AttendanceRecordStatus,
                      )
                    }
                    options={attendanceStatuses
                      .filter(
                        (status) => status !== correctionDraft?.currentStatus,
                      )
                      .map((status) => ({ value: status, label: status }))}
                  />
                </div>
              </div>
            </div>

            <Textarea
              label="Reason"
              value={correctionReason}
              onChange={(event) => setCorrectionReason(event.target.value)}
              rows={4}
              placeholder="Explain why the attendance status should be corrected."
              helperText="Minimum 5 characters."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCorrectionDraft(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleRequestCorrection}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
