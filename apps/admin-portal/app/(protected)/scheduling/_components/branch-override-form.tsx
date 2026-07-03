'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarDays, Layers3, Save } from 'lucide-react';
import { Alert, Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Checkbox, Input, Select, Textarea } from '@ims/shared-ui';
import type { BusinessCalendar, DayOfWeek } from '@ims/scheduling';

const DAY_ORDER: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

type OverrideDayState = {
  dayOfWeek: DayOfWeek;
  enabled: boolean;
  isOpen: boolean;
  startTime: string;
  endTime: string;
};

function buildDays(calendar?: BusinessCalendar) {
  const byDay = new Map(calendar?.operatingDays.map((day) => [day.dayOfWeek, day]));
  return DAY_ORDER.map((dayOfWeek) => {
    const base = byDay.get(dayOfWeek);
    return {
      dayOfWeek,
      enabled: false,
      isOpen: base?.isOpen ?? false,
      startTime: base?.workingHours?.[0]?.startTime ?? '09:00',
      endTime: base?.workingHours?.[0]?.endTime ?? '17:00',
    };
  });
}

export function BranchOverrideForm({ calendar, branches, defaultBranchId }: { calendar: BusinessCalendar; branches: Array<{ id: string; name: string }>; defaultBranchId?: string | null }) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? '');
  const [year, setYear] = useState(String(calendar.year));
  const [effectiveStartDate, setEffectiveStartDate] = useState(calendar.effectiveStartDate.toISOString().split('T')[0]);
  const [effectiveEndDate, setEffectiveEndDate] = useState(calendar.effectiveEndDate ? calendar.effectiveEndDate.toISOString().split('T')[0] : '');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Active' | 'Closed' | 'Archived'>('Draft');
  const [days, setDays] = useState<OverrideDayState[]>(() => buildDays(calendar));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBranchLabel = useMemo(() => branches.find((branch) => branch.id === branchId)?.name ?? 'Selected branch', [branchId, branches]);

  const updateDay = (index: number, patch: Partial<OverrideDayState>) => {
    setDays((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const payload = {
      branchId,
      year: Number(year),
      effectiveStartDate,
      effectiveEndDate: effectiveEndDate || null,
      status,
      name: name || null,
      notes: notes || null,
      operatingDays: days
        .filter((day) => day.enabled)
        .map((day) => ({
          dayOfWeek: day.dayOfWeek,
          isOpen: day.isOpen,
          workingHours: day.isOpen ? [{ startTime: day.startTime, endTime: day.endTime }] : [],
        })),
    };

    try {
      const response = await fetch(`/api/v1/scheduling/calendars/${calendar.id}/branch-overrides`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.detail || json?.messageEnglish || 'Unable to save override.');
      }

      toast.success('Branch override saved.');
      router.refresh();
      setDays(buildDays(calendar));
      setNotes('');
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save override.');
      toast.error(err instanceof Error ? err.message : 'Unable to save override.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <Alert variant="error" title="Override failed">{error}</Alert>}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers3 className="h-5 w-5" /> Branch / year override</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} required />
            <Input label="Year" type="number" value={year} onChange={(e) => setYear(e.target.value)} required min={2000} max={2100} />
            <Input label="Effective start" type="date" value={effectiveStartDate} onChange={(e) => setEffectiveStartDate(e.target.value)} required />
            <Input label="Effective end" type="date" value={effectiveEndDate} onChange={(e) => setEffectiveEndDate(e.target.value)} />
            <Input label="Override label" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional label for this branch year" />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} options={[
              { value: 'Draft', label: 'Draft' },
              { value: 'Active', label: 'Active' },
              { value: 'Closed', label: 'Closed' },
              { value: 'Archived', label: 'Archived' },
            ]} />
          </div>

          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={`Notes for ${selectedBranchLabel}. Leave a day unchecked to inherit institute defaults.`} />

          <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--ims-ink)]">
              <CalendarDays className="h-4 w-4 text-[color:var(--ims-brass)]" /> Days to override
            </div>
            <div className="space-y-3">
              {days.map((day, index) => (
                <div key={day.dayOfWeek} className="grid gap-3 rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-accent-soft)] p-3 md:grid-cols-[160px_180px_1fr_1fr] md:items-center">
                  <div>
                    <div className="font-medium text-[color:var(--ims-ink)]">{DAY_LABELS[day.dayOfWeek]}</div>
                    <div className="text-xs text-[color:var(--ims-muted)]">Unchecked means inherited</div>
                  </div>
                  <Checkbox label="Override this day" checked={day.enabled} onChange={(e) => updateDay(index, { enabled: e.target.checked })} />
                  <Input label="Start" type="time" value={day.startTime} onChange={(e) => updateDay(index, { startTime: e.target.value })} disabled={!day.enabled || !day.isOpen} />
                  <Input label="End" type="time" value={day.endTime} onChange={(e) => updateDay(index, { endTime: e.target.value })} disabled={!day.enabled || !day.isOpen} />
                  <div className="md:col-start-3 md:col-span-2">
                    <Checkbox label="Open day" checked={day.isOpen} disabled={!day.enabled} onChange={(e) => updateDay(index, { isOpen: e.target.checked })} description="Closed override days remove working hours for that branch/year only." />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={isSaving}><Save className="h-4 w-4" /> Save override</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
