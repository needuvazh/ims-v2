'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarDays, Save, Sparkles } from 'lucide-react';
import { Alert, Badge, Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Checkbox, Input, Select, Textarea } from '@ims/shared-ui';
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

type DayState = {
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  startTime: string;
  endTime: string;
};

type CalendarFormState = {
  instituteId: string;
  code: string;
  name: string;
  nameLocalizedEn: string;
  nameLocalizedAr: string;
  year: string;
  countryCode: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  status: 'Draft' | 'Active' | 'Closed' | 'Archived';
  days: DayState[];
};

function formatDateInput(date?: string | Date | null) {
  if (!date) return '';
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? '' : value.toISOString().split('T')[0];
}

function buildDays(initial?: BusinessCalendar['operatingDays']) {
  const byDay = new Map(initial?.map((day) => [day.dayOfWeek, day]));
  return DAY_ORDER.map((dayOfWeek) => {
    const existing = byDay.get(dayOfWeek);
    return {
      dayOfWeek,
      isOpen: existing?.isOpen ?? false,
      startTime: existing?.workingHours?.[0]?.startTime ?? '09:00',
      endTime: existing?.workingHours?.[0]?.endTime ?? '17:00',
    };
  });
}

function buildState(initial?: BusinessCalendar): CalendarFormState {
  return {
    instituteId: initial?.instituteId ?? '',
    code: initial?.code ?? '',
    name: initial?.name ?? '',
    nameLocalizedEn: initial?.nameLocalized?.en ?? '',
    nameLocalizedAr: initial?.nameLocalized?.ar ?? '',
    year: initial?.year ? String(initial.year) : String(new Date().getFullYear()),
    countryCode: initial?.countryCode ?? 'OM',
    effectiveStartDate: formatDateInput(initial?.effectiveStartDate),
    effectiveEndDate: formatDateInput(initial?.effectiveEndDate),
    status: initial?.status ?? 'Draft',
    days: buildDays(initial?.operatingDays),
  };
}

export function CalendarEditorForm({ mode, initialCalendar }: { mode: 'create' | 'edit'; initialCalendar?: BusinessCalendar }) {
  const router = useRouter();
  const [state, setState] = useState<CalendarFormState>(() => buildState(initialCalendar));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(
    () => (mode === 'create' ? '/api/v1/scheduling/calendars' : `/api/v1/scheduling/calendars/${initialCalendar?.id ?? ''}`),
    [mode, initialCalendar?.id],
  );

  const updateField = <K extends keyof CalendarFormState>(key: K, value: CalendarFormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const updateDay = (index: number, patch: Partial<DayState>) => {
    setState((prev) => {
      const next = [...prev.days];
      next[index] = { ...next[index], ...patch };
      return { ...prev, days: next };
    });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const payload = {
      instituteId: state.instituteId,
      code: state.code,
      name: state.name,
      nameLocalized: { en: state.nameLocalizedEn, ar: state.nameLocalizedAr },
      year: Number(state.year),
      countryCode: state.countryCode,
      timezone: 'Asia/Muscat',
      effectiveStartDate: state.effectiveStartDate,
      effectiveEndDate: state.effectiveEndDate || null,
      status: state.status,
      operatingDays: state.days.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        isOpen: day.isOpen,
        workingHours: day.isOpen ? [{ startTime: day.startTime, endTime: day.endTime }] : [],
      })),
      ...(mode === 'edit' && initialCalendar ? { version: initialCalendar.version } : {}),
    };

    try {
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (!response.ok) {
        const detail = json?.detail || json?.messageEnglish || 'Unable to save calendar.';
        throw new Error(detail);
      }

      toast.success(mode === 'create' ? 'Calendar created.' : 'Calendar updated.');
      const id = json?.data?.id ?? initialCalendar?.id;
      router.push(id ? `/scheduling/calendars/${id}` : '/scheduling/calendars');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save calendar.');
      toast.error(err instanceof Error ? err.message : 'Unable to save calendar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <Alert variant="error" title="Save failed">{error}</Alert>}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Institute calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Institute ID" value={state.instituteId} onChange={(e) => updateField('instituteId', e.target.value)} required placeholder="UUID" disabled={mode === 'edit'} />
            <Input label="Calendar code" value={state.code} onChange={(e) => updateField('code', e.target.value)} required placeholder="ASTI-2026" disabled={mode === 'edit'} />
            <Input label="Calendar name" value={state.name} onChange={(e) => updateField('name', e.target.value)} required placeholder="Academic Calendar 2026" />
            <Input label="Year" type="number" value={state.year} onChange={(e) => updateField('year', e.target.value)} required min={2000} max={2100} />
            <Input label="English label" value={state.nameLocalizedEn} onChange={(e) => updateField('nameLocalizedEn', e.target.value)} required placeholder="Academic Calendar 2026" />
            <Input label="Arabic label" value={state.nameLocalizedAr} onChange={(e) => updateField('nameLocalizedAr', e.target.value)} required placeholder="التقويم الأكاديمي 2026" />
            <Input label="Country code" value={state.countryCode} onChange={(e) => updateField('countryCode', e.target.value.toUpperCase())} maxLength={2} required />
            <Select label="Status" value={state.status} onChange={(e) => updateField('status', e.target.value as CalendarFormState['status'])} options={[
              { value: 'Draft', label: 'Draft' },
              { value: 'Active', label: 'Active' },
              { value: 'Closed', label: 'Closed' },
              { value: 'Archived', label: 'Archived' },
            ]} />
            <Input label="Effective start" type="date" value={state.effectiveStartDate} onChange={(e) => updateField('effectiveStartDate', e.target.value)} required />
            <Input label="Effective end" type="date" value={state.effectiveEndDate} onChange={(e) => updateField('effectiveEndDate', e.target.value)} />
          </div>

          <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-accent-soft)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--ims-ink)]">
              <Sparkles className="h-4 w-4 text-[color:var(--ims-brass)]" /> Weekly operating pattern
            </div>
            <div className="space-y-3">
              {state.days.map((day, index) => (
                <div key={day.dayOfWeek} className="grid gap-3 rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-3 md:grid-cols-[160px_1fr_1fr_1fr] md:items-center">
                  <div>
                    <div className="font-medium text-[color:var(--ims-ink)]">{DAY_LABELS[day.dayOfWeek]}</div>
                    <div className="text-xs text-[color:var(--ims-muted)]">{day.dayOfWeek}</div>
                  </div>
                  <Checkbox label="Open" checked={day.isOpen} onChange={(e) => updateDay(index, { isOpen: e.target.checked })} description="Closed days are excluded from working-hour checks." />
                  <Input label="Start" type="time" value={day.startTime} onChange={(e) => updateDay(index, { startTime: e.target.value })} disabled={!day.isOpen} />
                  <Input label="End" type="time" value={day.endTime} onChange={(e) => updateDay(index, { endTime: e.target.value })} disabled={!day.isOpen} />
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-[color:var(--ims-muted)]">Timezone is fixed to Asia/Muscat and cannot be changed from the UI.</p>
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={isSaving}><Save className="h-4 w-4" /> {mode === 'create' ? 'Create calendar' : 'Save calendar'}</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
