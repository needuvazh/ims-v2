'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarDays,
  MapPinned,
  Save,
  ShieldAlert,
} from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  FormControl,
  FormField,
  FormLabel,
  Input,
  Select,
} from '@ims/shared-ui';
import type {
  CreateVenueBlockCommand,
  UpdateVenueBlockCommand,
} from '@ims/scheduling';
import { createVenueBlockAction, updateVenueBlockAction } from '../actions';

type BranchOption = {
  id: string;
  branchName: string;
};

type ClassroomOption = {
  id: string;
  classroomName: string;
  branchId: string;
};

export type VenueBlockRecord = {
  id: string;
  branchId: string;
  classroomId: string | null;
  blockStartDate: Date;
  blockEndDate: Date;
  startTime: string | null;
  endTime: string | null;
  isFullDay: boolean;
  reasonCode: string;
  status: 'Active' | 'Cancelled';
  version: number;
  branch: {
    id: string;
    branchName: string;
  };
  classroom: {
    id: string;
    classroomName: string;
    branchId: string;
  } | null;
};

type VenueBlockFormValues = {
  branchId: string;
  classroomId: string;
  blockStartDate: string;
  blockEndDate: string;
  isFullDay: boolean;
  startTime: string;
  endTime: string;
  reasonCode: string;
  status: 'Active' | 'Cancelled';
};

function formatDateForInput(date?: Date | string | null) {
  if (!date) return '';
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? '' : value.toISOString().split('T')[0];
}

function buildInitialValues(
  initialData?: VenueBlockRecord,
): VenueBlockFormValues {
  return {
    branchId: initialData?.branchId ?? '',
    classroomId: initialData?.classroomId ?? '',
    blockStartDate: formatDateForInput(initialData?.blockStartDate),
    blockEndDate: formatDateForInput(
      initialData?.blockEndDate ?? initialData?.blockStartDate,
    ),
    isFullDay: initialData?.isFullDay ?? true,
    startTime: initialData?.startTime ?? '08:00',
    endTime: initialData?.endTime ?? '17:00',
    reasonCode: initialData?.reasonCode ?? 'MAINTENANCE',
    status: initialData?.status ?? 'Active',
  };
}

export function VenueBlockForm({
  mode,
  branches,
  classrooms,
  initialData,
}: {
  mode: 'create' | 'edit';
  branches: BranchOption[];
  classrooms: ClassroomOption[];
  initialData?: VenueBlockRecord;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<VenueBlockFormValues>(() =>
    buildInitialValues(initialData),
  );
  const [error, setError] = useState<string | null>(null);

  const selectedBranchId =
    mode === 'edit'
      ? (initialData?.branchId ?? values.branchId)
      : values.branchId;
  const classroomOptions = useMemo(
    () =>
      classrooms.filter((classroom) => classroom.branchId === selectedBranchId),
    [classrooms, selectedBranchId],
  );

  useEffect(() => {
    if (
      mode === 'create' &&
      values.classroomId &&
      !classroomOptions.some((classroom) => classroom.id === values.classroomId)
    ) {
      setValues((prev) => ({ ...prev, classroomId: '' }));
    }
  }, [classroomOptions, mode, values.classroomId]);

  useEffect(() => {
    if (!values.blockEndDate && values.blockStartDate) {
      setValues((prev) => ({ ...prev, blockEndDate: prev.blockStartDate }));
    }
  }, [values.blockEndDate, values.blockStartDate]);

  const updateField = <K extends keyof VenueBlockFormValues>(
    field: K,
    value: VenueBlockFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!selectedBranchId) {
      setError('Select a branch before saving the venue block.');
      return;
    }

    if (!values.blockStartDate) {
      setError('Select a start date for the block.');
      return;
    }

    const blockEndDate = values.blockEndDate || values.blockStartDate;
    if (blockEndDate < values.blockStartDate) {
      setError('Block to date must be on or after the block from date.');
      return;
    }

    const payloadBase = {
      classroomId: values.classroomId || null,
      blockStartDate: values.blockStartDate,
      blockEndDate,
      isFullDay: values.isFullDay,
      reasonCode: values.reasonCode.trim().toUpperCase(),
      status: values.status,
      ...(values.isFullDay
        ? {}
        : {
            startTime: values.startTime,
            endTime: values.endTime,
          }),
    };

    startTransition(async () => {
      try {
        const result =
          mode === 'create'
            ? await createVenueBlockAction({
                branchId: selectedBranchId,
                ...(payloadBase as unknown as Omit<
                  CreateVenueBlockCommand,
                  'branchId'
                >),
              })
            : initialData
              ? await updateVenueBlockAction(
                  initialData.id,
                  initialData.version,
                  payloadBase as unknown as UpdateVenueBlockCommand,
                )
              : {
                  success: false as const,
                  error: 'Venue block data is not available.',
                };

        if (!result.success) {
          toast.error(result.error || 'Unable to save venue block.');
          return;
        }

        toast.success(
          mode === 'create' ? 'Venue block created.' : 'Venue block updated.',
        );
        router.push('/scheduling/venues');
        router.refresh();
      } catch (submitError) {
        toast.error(
          submitError instanceof Error
            ? submitError.message
            : 'Unable to save venue block.',
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Save operation failed
          </div>
          <p className="mt-1">{error}</p>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
        <section className="space-y-4">
          <Card>
            <CardHeader className="border-b border-[color:var(--ims-border)] bg-[color:var(--ims-surface-hover)]">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-[color:var(--ims-brass)]" />
                Block details
              </CardTitle>
              <CardDescription>
                Choose the branch, optional classroom, and date range to block.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-card-p">
              <FormField>
                <FormLabel required>Branch</FormLabel>
                <FormControl>
                  <Select
                    value={selectedBranchId}
                    onChange={(event) =>
                      updateField('branchId', event.target.value)
                    }
                    options={branches.map((branch) => ({
                      value: branch.id,
                      label: branch.branchName,
                    }))}
                    disabled={mode === 'edit'}
                  />
                </FormControl>
              </FormField>

              <FormField>
                <FormLabel>Classroom</FormLabel>
                <FormControl>
                  <Select
                    value={values.classroomId}
                    onChange={(event) =>
                      updateField('classroomId', event.target.value)
                    }
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

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Block from date"
                  type="date"
                  value={values.blockStartDate}
                  onChange={(event) => {
                    const nextStart = event.target.value;
                    setValues((prev) => ({
                      ...prev,
                      blockStartDate: nextStart,
                      blockEndDate: prev.blockEndDate || nextStart,
                    }));
                  }}
                  required
                />
                <Input
                  label="Block to date"
                  type="date"
                  value={values.blockEndDate}
                  onChange={(event) =>
                    updateField('blockEndDate', event.target.value)
                  }
                  required
                />
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-3">
                <Checkbox
                  checked={values.isFullDay}
                  onChange={(event) =>
                    updateField('isFullDay', event.target.checked)
                  }
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[color:var(--ims-ink)]">
                    Full-day block
                  </p>
                  <p className="text-xs text-[color:var(--ims-muted)]">
                    Disable this to block a specific time window on each
                    selected day.
                  </p>
                </div>
              </div>

              {!values.isFullDay && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Start time"
                    type="time"
                    value={values.startTime}
                    onChange={(event) =>
                      updateField('startTime', event.target.value)
                    }
                    required
                  />
                  <Input
                    label="End time"
                    type="time"
                    value={values.endTime}
                    onChange={(event) =>
                      updateField('endTime', event.target.value)
                    }
                    required
                  />
                </div>
              )}

              <Input
                label="Reason code"
                value={values.reasonCode}
                onChange={(event) =>
                  updateField('reasonCode', event.target.value)
                }
                placeholder="MAINTENANCE, PRIVATE_EVENT, EXAM"
                required
              />
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="border-[color:var(--ims-border)] shadow-sm">
            <CardHeader className="border-b border-[color:var(--ims-border)] bg-[color:var(--ims-surface-hover)]">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-[color:var(--ims-brass)]" />
                Lifecycle
              </CardTitle>
              <CardDescription>
                Set the block status before saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-card-p">
              <Select
                label="Status"
                value={values.status}
                onChange={(event) =>
                  updateField(
                    'status',
                    event.target.value as VenueBlockFormValues['status'],
                  )
                }
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Cancelled', label: 'Cancelled' },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="border-[color:var(--ims-border)] bg-[color:var(--ims-ink)] text-white shadow-xl">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPinned className="h-4 w-4 text-[color:var(--ims-brass)]" />
                Scheduling note
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-card-p text-xs text-white/80">
              <p>Venue blocks are checked during batch session scheduling.</p>
              <p>
                Any session that falls inside this date range and matches the
                room or branch scope will be rejected.
              </p>
            </CardContent>
          </Card>

          <Button type="submit" loading={isPending} className="w-full">
            <Save className="h-4 w-4" />
            {mode === 'create' ? 'Create block' : 'Save changes'}
          </Button>
        </aside>
      </div>
    </form>
  );
}
