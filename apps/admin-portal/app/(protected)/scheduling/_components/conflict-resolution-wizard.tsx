'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  MapPin,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormControl,
  FormField,
  FormLabel,
  Input,
  Select,
  Textarea,
} from '@ims/shared-ui';
import { resolveConflictAction } from '../actions';

type ConflictSession = {
  id: string;
  batchId: string;
  branchId: string;
  batchCode: string;
  batchNameEnglish: string;
  courseName: string;
  titleEnglish: string;
  titleArabic: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  branchName: string;
  classroomId: string | null;
  classroomName: string | null;
  scheduleStatus: string;
  conflictType: string | null;
  overrideReason: string | null;
  isConflictIgnored: boolean;
};

type ClassroomOption = {
  id: string;
  classroomName: string;
  branchId: string;
};

type ResolutionAction = 'RESCHEDULE' | 'CHANGE_VENUE' | 'CANCEL';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function conflictLabel(conflictType: string | null) {
  switch (conflictType) {
    case 'HOLIDAY':
      return 'Holiday';
    case 'VENUE':
      return 'Venue';
    case 'TRAINER_OVERLAP':
      return 'Trainer overlap';
    case 'CLASSROOM_OVERLAP':
      return 'Classroom overlap';
    case 'OPERATING_HOURS':
      return 'Operating hours';
    default:
      return 'Conflict';
  }
}

export function ConflictResolutionWizard({
  session,
  open,
  onOpenChange,
  classrooms,
  onResolved,
}: {
  session: ConflictSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classrooms: ClassroomOption[];
  onResolved?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<ResolutionAction>('RESCHEDULE');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [classroomId, setClassroomId] = useState('');
  const [notes, setNotes] = useState('');

  const classroomOptions = useMemo(() => {
    if (!session) return classrooms;
    return classrooms.filter(
      (classroom) => classroom.branchId === session.branchId,
    );
  }, [classrooms, session]);

  useEffect(() => {
    if (!session) return;
    setScheduledDate(session.sessionDate.split('T')[0]);
    setStartTime(session.startTime);
    setEndTime(session.endTime);
    setClassroomId(session.classroomId ?? classroomOptions[0]?.id ?? '');
    setActionType('RESCHEDULE');
    setNotes('');
  }, [session, classroomOptions]);

  if (!session) return null;

  const submit = () => {
    startTransition(async () => {
      try {
        const payload =
          actionType === 'RESCHEDULE'
            ? {
                scheduledDate: scheduledDate,
                startTime,
                endTime,
              }
            : actionType === 'CHANGE_VENUE'
              ? {
                  classroomId,
                }
              : {};

        const result = await resolveConflictAction(
          session.id,
          actionType,
          payload,
        );
        if (!result.success) {
          toast.error(result.error || 'Unable to resolve the conflict.');
          return;
        }

        toast.success(
          actionType === 'CANCEL'
            ? 'Session cancelled.'
            : 'Conflict resolved and session returned to Published.',
        );
        onResolved?.();
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Unable to resolve the conflict.',
        );
      }
    });
  };

  const needsTimeWindow = actionType === 'RESCHEDULE';
  const needsClassroom = actionType === 'CHANGE_VENUE';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto top-0 h-full w-full max-w-[44rem] translate-x-0 translate-y-0 rounded-none border-l border-[color:var(--ims-border)] p-0 sm:rounded-l-3xl">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-[color:var(--ims-border)] bg-[color:var(--ims-surface-hover)] px-6 py-5">
            <DialogHeader className="mb-0">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-[color:var(--ims-brass)]" />
                Conflict resolution wizard
              </DialogTitle>
              <DialogDescription>
                Adjust the session in place, move it to another room, or cancel
                the slot.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1fr_18rem]">
            <div className="space-y-6 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                    Batch
                  </p>
                  <p className="mt-1 font-semibold text-[color:var(--ims-ink)]">
                    {session.batchCode}
                  </p>
                  <p className="text-sm text-[color:var(--ims-muted)]">
                    {session.batchNameEnglish}
                  </p>
                </div>
                <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                    Status
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      variant={
                        session.scheduleStatus === 'Conflict'
                          ? 'error'
                          : 'success'
                      }
                    >
                      {session.scheduleStatus}
                    </Badge>
                    {session.conflictType && (
                      <Badge variant="outline">
                        {conflictLabel(session.conflictType)}
                      </Badge>
                    )}
                    {session.isConflictIgnored && (
                      <Badge variant="success">Override active</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-[color:var(--ims-border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-[color:var(--ims-ink)]">
                      {session.titleEnglish}
                    </h4>
                    <p
                      className="text-sm font-arabic text-[color:var(--ims-muted)]"
                      dir="rtl"
                    >
                      {session.titleArabic}
                    </p>
                  </div>
                  <Badge variant="muted">{session.courseName}</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex items-center gap-2 text-sm text-[color:var(--ims-muted)]">
                    <CalendarDays className="h-4 w-4" />
                    <span>{formatDate(session.sessionDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[color:var(--ims-muted)]">
                    <Clock3 className="h-4 w-4" />
                    <span>
                      {session.startTime} - {session.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[color:var(--ims-muted)]">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {session.classroomName ?? 'No classroom assigned'}
                    </span>
                  </div>
                </div>

                {session.overrideReason && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      Existing override reason
                    </div>
                    <p className="leading-relaxed">{session.overrideReason}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-2xl border border-[color:var(--ims-border)] p-4">
                <FormField>
                  <FormLabel>Resolution action</FormLabel>
                  <FormControl>
                    <Select
                      value={actionType}
                      onChange={(event) =>
                        setActionType(event.target.value as ResolutionAction)
                      }
                      options={[
                        { value: 'RESCHEDULE', label: 'Reschedule session' },
                        { value: 'CHANGE_VENUE', label: 'Change classroom' },
                        { value: 'CANCEL', label: 'Cancel session' },
                      ]}
                    />
                  </FormControl>
                </FormField>

                {needsTimeWindow && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                      label="New date"
                      type="date"
                      value={scheduledDate}
                      onChange={(event) => setScheduledDate(event.target.value)}
                      required
                    />
                    <Input
                      label="Start time"
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      required
                    />
                    <Input
                      label="End time"
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      required
                    />
                  </div>
                )}

                {needsClassroom && (
                  <FormField>
                    <FormLabel>Replacement classroom</FormLabel>
                    <FormControl>
                      <Select
                        value={classroomId}
                        onChange={(event) => setClassroomId(event.target.value)}
                        options={[
                          { value: '', label: 'Select a classroom' },
                          ...classroomOptions.map((classroom) => ({
                            value: classroom.id,
                            label: classroom.classroomName,
                          })),
                        ]}
                      />
                    </FormControl>
                  </FormField>
                )}

                <Textarea
                  label="Coordinator notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Optional context for the scheduling log."
                />
              </div>
            </div>

            <aside className="border-t border-[color:var(--ims-border)] bg-[color:var(--ims-surface-hover)] px-6 py-5 lg:border-l lg:border-t-0">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[color:var(--ims-border)] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                    Resolution notes
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-[color:var(--ims-muted)]">
                    <li>
                      Reschedule moves the session back to Published after
                      validation passes.
                    </li>
                    <li>
                      Change venue only swaps the classroom and rechecks
                      conflicts.
                    </li>
                    <li>
                      Cancel preserves audit history and removes the session
                      from active delivery.
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-white p-4 text-sm text-[color:var(--ims-muted)]">
                  <p className="font-semibold text-[color:var(--ims-ink)]">
                    Branch context
                  </p>
                  <p className="mt-1">{session.branchName}</p>
                </div>
              </div>

              <DialogFooter className="mt-6 border-t border-[color:var(--ims-border)] pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button type="button" onClick={submit} loading={isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Apply resolution
                </Button>
              </DialogFooter>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
