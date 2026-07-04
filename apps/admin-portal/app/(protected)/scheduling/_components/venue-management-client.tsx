'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CalendarDays, MapPinned, Save, ShieldAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  FormControl,
  FormField,
  FormLabel,
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
import type { CreateVenueBlockCommand } from '@ims/scheduling';
import { createVenueBlockAction } from '../actions';

type BranchOption = {
  id: string;
  branchName: string;
};

type ClassroomOption = {
  id: string;
  classroomName: string;
  branchId: string;
};

type VenueBlockRow = {
  id: string;
  blockDate: string;
  startTime: string | null;
  endTime: string | null;
  isFullDay: boolean;
  reasonCode: string;
  status: string;
  branch: {
    id: string;
    branchName: string;
  };
  classroom: {
    id: string;
    classroomName: string;
  } | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusBadge(status: string) {
  return status === 'Active' ? <Badge variant="success">Active</Badge> : <Badge variant="muted">{status}</Badge>;
}

export function VenueManagementClient({
  branches,
  classrooms,
  venueBlocks,
  defaultBranchId,
}: {
  branches: BranchOption[];
  classrooms: ClassroomOption[];
  venueBlocks: VenueBlockRow[];
  defaultBranchId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? '');
  const [classroomId, setClassroomId] = useState('');
  const [blockDate, setBlockDate] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reasonCode, setReasonCode] = useState('MAINTENANCE');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const classroomOptions = useMemo(
    () => classrooms.filter((classroom) => classroom.branchId === branchId),
    [branchId, classrooms],
  );

  useEffect(() => {
    if (!classroomOptions.some((classroom) => classroom.id === classroomId)) {
      setClassroomId('');
    }
  }, [classroomOptions, classroomId]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!branchId) {
      setError('Select a branch before saving the block.');
      return;
    }
    if (!blockDate) {
      setError('Select a block date.');
      return;
    }

    const payload = {
      branchId,
      classroomId: classroomId || null,
      blockDate,
      isFullDay,
      reasonCode: reasonCode.trim().toUpperCase(),
      status: 'Active',
      ...(isFullDay
        ? {}
        : {
            startTime,
            endTime,
          }),
    } as Omit<CreateVenueBlockCommand, 'blockDate'> & { blockDate: string };

    startTransition(async () => {
      try {
        const result = await createVenueBlockAction(payload as any);
        if (!result.success) {
          toast.error(result.error || 'Unable to create the venue block.');
          return;
        }

        toast.success('Venue block created.');
        setBlockDate('');
        setClassroomId('');
        setNotes('');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to create the venue block.');
      }
    });
  };

  const totalBlocks = venueBlocks.length;
  const fullDayBlocks = venueBlocks.filter((block) => block.isFullDay).length;
  const partialDayBlocks = totalBlocks - fullDayBlocks;
  const branchWideBlocks = venueBlocks.filter((block) => !block.classroom).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-[color:var(--ims-border)] shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-widest">Active blocks</CardDescription>
              <CardTitle className="text-2xl">{totalBlocks}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-[color:var(--ims-border)] shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-widest">Full-day</CardDescription>
              <CardTitle className="text-2xl">{fullDayBlocks}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-[color:var(--ims-border)] shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-widest">Partial-day</CardDescription>
              <CardTitle className="text-2xl">{partialDayBlocks}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-[color:var(--ims-border)] shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-widest">Branch-wide</CardDescription>
              <CardTitle className="text-2xl">{branchWideBlocks}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-[color:var(--ims-border)]">
          <CardHeader className="border-b border-[color:var(--ims-border)] bg-[color:var(--ims-surface-hover)]">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-[color:var(--ims-brass)]" />
              Venue blocks
            </CardTitle>
            <CardDescription>Hard blocks for classrooms or whole branches.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {venueBlocks.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<MapPinned className="h-6 w-6" />}
                  title="No venue blocks"
                  description="Create the first maintenance or reservation block to start protecting classroom availability."
                />
              </div>
            ) : (
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venueBlocks.map((block) => (
                      <TableRow key={block.id}>
                        <TableCell>
                          <div className="font-medium text-[color:var(--ims-ink)]">{formatDate(block.blockDate)}</div>
                          <div className="text-xs text-[color:var(--ims-muted)]">{block.isFullDay ? 'Full-day block' : 'Timed block'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-[color:var(--ims-ink)]">{block.branch.branchName}</div>
                          <div className="text-xs text-[color:var(--ims-muted)]">
                            {block.classroom?.classroomName ?? 'Branch-wide'}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">
                          {block.isFullDay ? (
                            <span>All day</span>
                          ) : (
                            <span>
                              {block.startTime} - {block.endTime}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[14rem]">
                          <div className="truncate font-medium text-[color:var(--ims-ink)]" title={block.reasonCode}>
                            {block.reasonCode}
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(block.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit border-[color:var(--ims-border)] shadow-sm">
        <CardHeader className="border-b border-[color:var(--ims-border)] bg-[color:var(--ims-surface-hover)]">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-[color:var(--ims-brass)]" />
            Create venue block
          </CardTitle>
          <CardDescription>Block a room or an entire branch for maintenance, events, or closures.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-card-p">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Unable to save block
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <FormField>
              <FormLabel required>Branch</FormLabel>
              <FormControl>
                <Select
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  options={branches.map((branch) => ({ value: branch.id, label: branch.branchName }))}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel>Classroom</FormLabel>
              <FormControl>
                <Select
                  value={classroomId}
                  onChange={(event) => setClassroomId(event.target.value)}
                  options={[
                    { value: '', label: 'Entire branch' },
                    ...classroomOptions.map((classroom) => ({
                      value: classroom.id,
                      label: classroom.classroomName,
                    })),
                  ]}
                />
              </FormControl>
            </FormField>

            <Input label="Block date" type="date" value={blockDate} onChange={(event) => setBlockDate(event.target.value)} required />

            <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-3">
              <Checkbox checked={isFullDay} onChange={(event) => setIsFullDay(event.target.checked)} />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[color:var(--ims-ink)]">Full-day block</p>
                <p className="text-xs text-[color:var(--ims-muted)]">Disable to block only part of the working day.</p>
              </div>
            </div>

            {!isFullDay && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Start time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
                <Input label="End time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
              </div>
            )}

            <Input
              label="Reason code"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
              placeholder="MAINTENANCE, PRIVATE_EVENT, EXAM"
              required
            />

            <Textarea
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional internal note for the scheduling team."
            />

            <Button type="submit" loading={isPending} className="w-full">
              <Save className="h-4 w-4" />
              Save block
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
