'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Textarea,
} from '@ims/shared-ui';
import { BookOpen, Clock, Award, Pencil } from 'lucide-react';

type BranchOption = {
  id: string;
  branchName: string;
  branchCode: string;
};

type CourseOption = {
  id: string;
  courseCode: string;
  nameEnglish: string;
  status: string;
};

type QualificationRecord = {
  id: string;
  qualificationName: string;
  institution: string;
  yearCompleted: number;
  status: 'Active' | 'Inactive';
  effectiveStartDate: string | Date;
  effectiveEndDate?: string | Date | null;
  version: number;
};

type AvailabilityRecord = {
  id: string;
  branchId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  status: 'Active' | 'Inactive';
  effectiveStartDate: string | Date;
  effectiveEndDate?: string | Date | null;
  version: number;
};

type AuthorizationRecord = {
  id: string;
  courseId: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Expired';
  effectiveStartDate: string | Date;
  effectiveEndDate?: string | Date | null;
  reason?: string | null;
  version: number;
  course?: {
    courseCode: string;
    nameEnglish: string;
    status?: string | null;
  } | null;
};

type TrainerProfileRecord = {
  id: string;
  branchId: string;
  trainerCode: string;
  trainerType: 'FullTime' | 'PartTime' | 'Freelance';
  specialization: string;
  qualificationSummary?: string | null;
  status: 'Active' | 'Inactive' | 'Suspended';
  effectiveStartDate: string | Date;
  effectiveEndDate?: string | Date | null;
  version: number;
};

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function dateValue(input: string | Date | null | undefined) {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function drawerClassName() {
  return '!left-auto !right-0 !top-0 !translate-x-0 !translate-y-0 h-full max-h-screen w-full max-w-[32rem] rounded-none border-l border-[color:var(--ims-border)] p-0';
}

function DrawerShell({
  title,
  description,
  open,
  onOpenChange,
  trigger,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="shrink-0">{trigger}</div>
      <DialogContent className={drawerClassName()}>
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b border-slate-100 px-5 py-5">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TrainerQualificationDrawerAction({
  trainerId,
  trainerName,
}: {
  trainerId: string;
  trainerName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [qualificationName, setQualificationName] = useState('');
  const [institution, setInstitution] = useState('');
  const [yearCompleted, setYearCompleted] = useState(
    String(new Date().getFullYear()),
  );
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [effectiveStartDate, setEffectiveStartDate] = useState(todayValue());
  const [effectiveEndDate, setEffectiveEndDate] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (
      !qualificationName.trim() ||
      !institution.trim() ||
      !yearCompleted.trim() ||
      !effectiveStartDate
    ) {
      setError('Complete all required qualification fields.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/faculty/trainers/${trainerId}/qualifications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qualificationName: qualificationName.trim(),
            institution: institution.trim(),
            yearCompleted: Number(yearCompleted),
            status,
            effectiveStartDate,
            effectiveEndDate: effectiveEndDate || null,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.messageEnglish || 'Unable to save qualification.');
      }
      setOpen(false);
      router.refresh();
      setQualificationName('');
      setInstitution('');
      setYearCompleted(String(new Date().getFullYear()));
      setStatus('Active');
      setEffectiveStartDate(todayValue());
      setEffectiveEndDate('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save qualification.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={setOpen}
      title="Add Qualification"
      description={`Record education and credential evidence for ${trainerName}.`}
      trigger={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Award className="mr-2 h-4 w-4" />
          Add Qualification
        </Button>
      }
    >
      <form onSubmit={submit} className="flex h-full flex-col" noValidate>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {error ? <Alert variant="error" description={error} /> : null}
          <Input
            label="Qualification name"
            required
            value={qualificationName}
            onChange={(event) => setQualificationName(event.target.value)}
            placeholder="e.g. B.Sc. in Engineering"
          />
          <Input
            label="Institution"
            required
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
            placeholder="e.g. Sultan Qaboos University"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Year completed"
              type="number"
              min={1900}
              max={new Date().getFullYear() + 1}
              required
              value={yearCompleted}
              onChange={(event) => setYearCompleted(event.target.value)}
            />
            <Select
              label="Status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              value={status}
              onValueChange={(value) =>
                setStatus(value as 'Active' | 'Inactive')
              }
            />
            <Input
              label="Effective start date"
              type="date"
              required
              value={effectiveStartDate}
              onChange={(event) => setEffectiveStartDate(event.target.value)}
            />
            <Input
              label="Effective end date"
              type="date"
              value={effectiveEndDate}
              onChange={(event) => setEffectiveEndDate(event.target.value)}
              helperText="Leave blank if the qualification remains valid."
            />
          </div>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSaving}>
            Save Qualification
          </Button>
        </DialogFooter>
      </form>
    </DrawerShell>
  );
}

export function TrainerProfileEditDrawerAction({
  trainer,
  trainerName,
  branchOptions,
}: {
  trainer: TrainerProfileRecord;
  trainerName: string;
  branchOptions: BranchOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [branchId, setBranchId] = useState(trainer.branchId);
  const [trainerCode, setTrainerCode] = useState(trainer.trainerCode);
  const [trainerType, setTrainerType] = useState(trainer.trainerType);
  const [specialization, setSpecialization] = useState(trainer.specialization);
  const [qualificationSummary, setQualificationSummary] = useState(
    trainer.qualificationSummary ?? '',
  );
  const [status, setStatus] = useState(trainer.status);
  const [effectiveStartDate, setEffectiveStartDate] = useState(
    dateValue(trainer.effectiveStartDate),
  );
  const [effectiveEndDate, setEffectiveEndDate] = useState(
    dateValue(trainer.effectiveEndDate),
  );

  const branchOptionsList = branchOptions.map((branch) => ({
    value: branch.id,
    label: `${branch.branchName} (${branch.branchCode})`,
  }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (
      !branchId ||
      !trainerCode.trim() ||
      !trainerType ||
      !specialization.trim() ||
      !effectiveStartDate
    ) {
      setError('Complete all required trainer fields.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/faculty/trainers/${trainer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          trainerCode: trainerCode.trim(),
          trainerType,
          specialization: specialization.trim(),
          qualificationSummary: qualificationSummary.trim() || null,
          status,
          effectiveStartDate,
          effectiveEndDate: effectiveEndDate || null,
          version: trainer.version,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body.messageEnglish || 'Unable to update trainer information.',
        );
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update trainer information.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={setOpen}
      title="Edit Trainer Information"
      description={`Update trainer profile fields for ${trainerName}. Personal IAM details remain read-only.`}
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit Trainer
        </Button>
      }
    >
      <form onSubmit={submit} className="flex h-full flex-col" noValidate>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {error ? <Alert variant="error" description={error} /> : null}
          <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ims-muted)]">
              IAM person
            </p>
            <p className="mt-1 font-medium text-[color:var(--ims-ink)]">
              {trainerName}
            </p>
            <p className="text-xs text-[color:var(--ims-muted)]">
              Personal identity is managed in IAM and is not editable here.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Branch"
              required
              options={branchOptionsList}
              value={branchId}
              onValueChange={setBranchId}
              helperText="Scope is restricted to the branches allowed for the current user."
            />
            <Input
              label="Trainer code"
              required
              value={trainerCode}
              onChange={(event) => setTrainerCode(event.target.value)}
            />
            <Select
              label="Trainer type"
              required
              options={[
                { value: 'FullTime', label: 'Full Time' },
                { value: 'PartTime', label: 'Part Time' },
                { value: 'Freelance', label: 'Freelance' },
              ]}
              value={trainerType}
              onValueChange={(value) =>
                setTrainerType(value as TrainerProfileRecord['trainerType'])
              }
            />
            <Select
              label="Status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Suspended', label: 'Suspended' },
              ]}
              value={status}
              onValueChange={(value) =>
                setStatus(value as TrainerProfileRecord['status'])
              }
            />
            <Input
              label="Specialization"
              required
              value={specialization}
              onChange={(event) => setSpecialization(event.target.value)}
              className="sm:col-span-2"
            />
            <Textarea
              label="Qualification summary"
              value={qualificationSummary}
              onChange={(event) => setQualificationSummary(event.target.value)}
              className="sm:col-span-2"
              helperText="Optional high-level summary displayed on the trainer profile."
            />
            <Input
              label="Effective start date"
              type="date"
              required
              value={effectiveStartDate}
              onChange={(event) => setEffectiveStartDate(event.target.value)}
            />
            <Input
              label="Effective end date"
              type="date"
              value={effectiveEndDate}
              onChange={(event) => setEffectiveEndDate(event.target.value)}
              helperText="Leave blank if the trainer profile stays active indefinitely."
            />
          </div>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSaving}>
            Update Trainer
          </Button>
        </DialogFooter>
      </form>
    </DrawerShell>
  );
}

export function TrainerQualificationEditDrawerAction({
  trainerId,
  trainerName,
  qualification,
}: {
  trainerId: string;
  trainerName: string;
  qualification: QualificationRecord;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [qualificationName, setQualificationName] = useState(
    qualification.qualificationName,
  );
  const [institution, setInstitution] = useState(qualification.institution);
  const [yearCompleted, setYearCompleted] = useState(
    String(qualification.yearCompleted),
  );
  const [status, setStatus] = useState<'Active' | 'Inactive'>(
    qualification.status,
  );
  const [effectiveStartDate, setEffectiveStartDate] = useState(
    dateValue(qualification.effectiveStartDate),
  );
  const [effectiveEndDate, setEffectiveEndDate] = useState(
    dateValue(qualification.effectiveEndDate),
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (
      !qualificationName.trim() ||
      !institution.trim() ||
      !yearCompleted.trim() ||
      !effectiveStartDate
    ) {
      setError('Complete all required qualification fields.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/faculty/trainers/${trainerId}/qualifications/${qualification.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qualificationName: qualificationName.trim(),
            institution: institution.trim(),
            yearCompleted: Number(yearCompleted),
            status,
            effectiveStartDate,
            effectiveEndDate: effectiveEndDate || null,
            version: qualification.version,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body.messageEnglish || 'Unable to update qualification.',
        );
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update qualification.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={setOpen}
      title="Edit Qualification"
      description={`Update credential details for ${trainerName}.`}
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      }
    >
      <form onSubmit={submit} className="flex h-full flex-col" noValidate>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {error ? <Alert variant="error" description={error} /> : null}
          <Input
            label="Qualification name"
            required
            value={qualificationName}
            onChange={(event) => setQualificationName(event.target.value)}
          />
          <Input
            label="Institution"
            required
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Year completed"
              type="number"
              min={1900}
              max={new Date().getFullYear() + 1}
              required
              value={yearCompleted}
              onChange={(event) => setYearCompleted(event.target.value)}
            />
            <Select
              label="Status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              value={status}
              onValueChange={(value) =>
                setStatus(value as 'Active' | 'Inactive')
              }
            />
            <Input
              label="Effective start date"
              type="date"
              required
              value={effectiveStartDate}
              onChange={(event) => setEffectiveStartDate(event.target.value)}
            />
            <Input
              label="Effective end date"
              type="date"
              value={effectiveEndDate}
              onChange={(event) => setEffectiveEndDate(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSaving}>
            Update Qualification
          </Button>
        </DialogFooter>
      </form>
    </DrawerShell>
  );
}

export function TrainerAvailabilityDrawerAction({
  trainerId,
  trainerName,
  branchOptions,
  defaultBranchId,
}: {
  trainerId: string;
  trainerName: string;
  branchOptions: BranchOption[];
  defaultBranchId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const initialBranchId = useMemo(
    () =>
      branchOptions.find((branch) => branch.id === defaultBranchId)?.id ??
      branchOptions[0]?.id ??
      '',
    [branchOptions, defaultBranchId],
  );
  const [branchId, setBranchId] = useState(initialBranchId);
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [effectiveStartDate, setEffectiveStartDate] = useState(todayValue());
  const [effectiveEndDate, setEffectiveEndDate] = useState('');

  const branchOptionsList = branchOptions.map((branch) => ({
    value: branch.id,
    label: `${branch.branchName} (${branch.branchCode})`,
  }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (
      !branchId ||
      !dayOfWeek ||
      !startTime ||
      !endTime ||
      !effectiveStartDate
    ) {
      setError('Complete all required availability fields.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/faculty/trainers/${trainerId}/availability`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchId,
            dayOfWeek,
            startTime,
            endTime,
            status,
            effectiveStartDate,
            effectiveEndDate: effectiveEndDate || null,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.messageEnglish || 'Unable to save availability.');
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save availability.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={setOpen}
      title="Add Availability"
      description={`Define weekly availability windows for ${trainerName}.`}
      trigger={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Clock className="mr-2 h-4 w-4" />
          Add Availability
        </Button>
      }
    >
      <form onSubmit={submit} className="flex h-full flex-col" noValidate>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {error ? <Alert variant="error" description={error} /> : null}
          <Select
            label="Branch"
            required
            options={branchOptionsList}
            value={branchId}
            placeholder="Select branch"
            onValueChange={setBranchId}
            helperText="Only branches within the current IAM scope are shown."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Day of week"
              required
              options={[
                { value: 'Monday', label: 'Monday' },
                { value: 'Tuesday', label: 'Tuesday' },
                { value: 'Wednesday', label: 'Wednesday' },
                { value: 'Thursday', label: 'Thursday' },
                { value: 'Friday', label: 'Friday' },
                { value: 'Saturday', label: 'Saturday' },
                { value: 'Sunday', label: 'Sunday' },
              ]}
              value={dayOfWeek}
              onValueChange={setDayOfWeek}
            />
            <Select
              label="Status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              value={status}
              onValueChange={(value) =>
                setStatus(value as 'Active' | 'Inactive')
              }
            />
            <Input
              label="Start time"
              type="time"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
            <Input
              label="End time"
              type="time"
              required
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
            <Input
              label="Effective start date"
              type="date"
              required
              value={effectiveStartDate}
              onChange={(event) => setEffectiveStartDate(event.target.value)}
            />
            <Input
              label="Effective end date"
              type="date"
              value={effectiveEndDate}
              onChange={(event) => setEffectiveEndDate(event.target.value)}
              helperText="Leave blank if the availability continues indefinitely."
            />
          </div>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSaving}>
            Save Availability
          </Button>
        </DialogFooter>
      </form>
    </DrawerShell>
  );
}

export function TrainerAvailabilityEditDrawerAction({
  trainerId,
  trainerName,
  branchOptions,
  availability,
}: {
  trainerId: string;
  trainerName: string;
  branchOptions: BranchOption[];
  availability: AvailabilityRecord;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [branchId, setBranchId] = useState(availability.branchId);
  const [dayOfWeek, setDayOfWeek] = useState(availability.dayOfWeek);
  const [startTime, setStartTime] = useState(availability.startTime);
  const [endTime, setEndTime] = useState(availability.endTime);
  const [status, setStatus] = useState<'Active' | 'Inactive'>(
    availability.status,
  );
  const [effectiveStartDate, setEffectiveStartDate] = useState(
    dateValue(availability.effectiveStartDate),
  );
  const [effectiveEndDate, setEffectiveEndDate] = useState(
    dateValue(availability.effectiveEndDate),
  );

  const branchOptionsList = branchOptions.map((branch) => ({
    value: branch.id,
    label: `${branch.branchName} (${branch.branchCode})`,
  }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (
      !branchId ||
      !dayOfWeek ||
      !startTime ||
      !endTime ||
      !effectiveStartDate
    ) {
      setError('Complete all required availability fields.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/faculty/trainers/${trainerId}/availability/${availability.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchId,
            dayOfWeek,
            startTime,
            endTime,
            status,
            effectiveStartDate,
            effectiveEndDate: effectiveEndDate || null,
            version: availability.version,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body.messageEnglish || 'Unable to update availability.',
        );
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update availability.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={setOpen}
      title="Edit Availability"
      description={`Update availability windows for ${trainerName}.`}
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      }
    >
      <form onSubmit={submit} className="flex h-full flex-col" noValidate>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {error ? <Alert variant="error" description={error} /> : null}
          <Select
            label="Branch"
            required
            options={branchOptionsList}
            value={branchId}
            onValueChange={setBranchId}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Day of week"
              required
              options={[
                { value: 'Monday', label: 'Monday' },
                { value: 'Tuesday', label: 'Tuesday' },
                { value: 'Wednesday', label: 'Wednesday' },
                { value: 'Thursday', label: 'Thursday' },
                { value: 'Friday', label: 'Friday' },
                { value: 'Saturday', label: 'Saturday' },
                { value: 'Sunday', label: 'Sunday' },
              ]}
              value={dayOfWeek}
              onValueChange={setDayOfWeek}
            />
            <Select
              label="Status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              value={status}
              onValueChange={(value) =>
                setStatus(value as 'Active' | 'Inactive')
              }
            />
            <Input
              label="Start time"
              type="time"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
            <Input
              label="End time"
              type="time"
              required
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
            <Input
              label="Effective start date"
              type="date"
              required
              value={effectiveStartDate}
              onChange={(event) => setEffectiveStartDate(event.target.value)}
            />
            <Input
              label="Effective end date"
              type="date"
              value={effectiveEndDate}
              onChange={(event) => setEffectiveEndDate(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSaving}>
            Update Availability
          </Button>
        </DialogFooter>
      </form>
    </DrawerShell>
  );
}

export function TrainerAuthorizationDrawerAction({
  trainerId,
  trainerName,
  courseOptions,
}: {
  trainerId: string;
  trainerName: string;
  courseOptions: CourseOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const initialCourseId = useMemo(
    () => courseOptions[0]?.id ?? '',
    [courseOptions],
  );
  const [courseId, setCourseId] = useState(initialCourseId);
  const [status, setStatus] = useState<
    'Active' | 'Inactive' | 'Suspended' | 'Expired'
  >('Active');
  const [effectiveStartDate, setEffectiveStartDate] = useState(todayValue());
  const [effectiveEndDate, setEffectiveEndDate] = useState('');
  const [reason, setReason] = useState('');

  const courseOptionsList = courseOptions.map((course) => ({
    value: course.id,
    label: `${course.courseCode} · ${course.nameEnglish}${course.status ? ` (${course.status})` : ''}`,
  }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!courseId || !effectiveStartDate) {
      setError('Choose a course and effective start date.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/faculty/trainers/${trainerId}/authorizations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            status,
            effectiveStartDate,
            effectiveEndDate: effectiveEndDate || null,
            reason: reason.trim() || null,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.messageEnglish || 'Unable to save authorization.');
      }
      setOpen(false);
      router.refresh();
      setCourseId(initialCourseId);
      setStatus('Active');
      setEffectiveStartDate(todayValue());
      setEffectiveEndDate('');
      setReason('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save authorization.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={setOpen}
      title="Assign Course"
      description={`Authorize a course that ${trainerName} can teach.`}
      trigger={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Assign Course
        </Button>
      }
    >
      <form onSubmit={submit} className="flex h-full flex-col" noValidate>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {error ? <Alert variant="error" description={error} /> : null}
          <Select
            label="Course"
            required
            options={courseOptionsList}
            value={courseId}
            placeholder="Select course"
            onValueChange={setCourseId}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Suspended', label: 'Suspended' },
                { value: 'Expired', label: 'Expired' },
              ]}
              value={status}
              onValueChange={(value) =>
                setStatus(
                  value as 'Active' | 'Inactive' | 'Suspended' | 'Expired',
                )
              }
            />
            <Input
              label="Effective start date"
              type="date"
              required
              value={effectiveStartDate}
              onChange={(event) => setEffectiveStartDate(event.target.value)}
            />
            <Input
              label="Effective end date"
              type="date"
              value={effectiveEndDate}
              onChange={(event) => setEffectiveEndDate(event.target.value)}
              helperText="Leave blank if the course authorization stays open-ended."
            />
            <Textarea
              label="Reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Optional note or approval reference"
              helperText="Optional note to explain why the authorization was added."
              className="sm:col-span-2"
            />
          </div>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSaving}>
            Save Authorization
          </Button>
        </DialogFooter>
      </form>
    </DrawerShell>
  );
}

export function TrainerAuthorizationEditDrawerAction({
  trainerId,
  trainerName,
  authorization,
}: {
  trainerId: string;
  trainerName: string;
  authorization: AuthorizationRecord;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<
    'Active' | 'Inactive' | 'Suspended' | 'Expired'
  >(authorization.status);
  const [effectiveStartDate, setEffectiveStartDate] = useState(
    dateValue(authorization.effectiveStartDate),
  );
  const [effectiveEndDate, setEffectiveEndDate] = useState(
    dateValue(authorization.effectiveEndDate),
  );
  const [reason, setReason] = useState(authorization.reason ?? '');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!effectiveStartDate) {
      setError('Choose an effective start date.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/faculty/trainers/${trainerId}/authorizations/${authorization.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            effectiveStartDate,
            effectiveEndDate: effectiveEndDate || null,
            reason: reason.trim() || null,
            version: authorization.version,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body.messageEnglish || 'Unable to update authorization.',
        );
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update authorization.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={setOpen}
      title="Edit Authorization"
      description={`Update course authorization for ${trainerName}.`}
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      }
    >
      <form onSubmit={submit} className="flex h-full flex-col" noValidate>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {error ? <Alert variant="error" description={error} /> : null}
          <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-4 text-sm text-[color:var(--ims-ink)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ims-muted)]">
              Course
            </p>
            <p className="mt-1 font-medium">
              {authorization.course?.courseCode ?? authorization.courseId}
            </p>
            {authorization.course?.nameEnglish ? (
              <p className="text-xs text-[color:var(--ims-muted)]">
                {authorization.course.nameEnglish}
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Suspended', label: 'Suspended' },
                { value: 'Expired', label: 'Expired' },
              ]}
              value={status}
              onValueChange={(value) =>
                setStatus(
                  value as 'Active' | 'Inactive' | 'Suspended' | 'Expired',
                )
              }
            />
            <Input
              label="Effective start date"
              type="date"
              required
              value={effectiveStartDate}
              onChange={(event) => setEffectiveStartDate(event.target.value)}
            />
            <Input
              label="Effective end date"
              type="date"
              value={effectiveEndDate}
              onChange={(event) => setEffectiveEndDate(event.target.value)}
            />
            <Textarea
              label="Reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="sm:col-span-2"
            />
          </div>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSaving}>
            Update Authorization
          </Button>
        </DialogFooter>
      </form>
    </DrawerShell>
  );
}
