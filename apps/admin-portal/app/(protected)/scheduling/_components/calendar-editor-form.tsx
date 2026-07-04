'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarDays, Save, Sparkles, AlertTriangle, Clock } from 'lucide-react';
import { 
  Alert, 
  Badge, 
  Button, 
  Card, 
  Checkbox, 
  Input, 
  Select 
} from '@ims/shared-ui';
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

type InstituteOption = {
  value: string;
  label: string;
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
      startTime: existing?.workingHours?.[0]?.startTime ?? '08:00',
      endTime: existing?.workingHours?.[0]?.endTime ?? '16:00',
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

export function CalendarEditorForm({
  mode,
  initialCalendar,
  instituteOptions,
}: {
  mode: 'create' | 'edit';
  initialCalendar?: BusinessCalendar;
  instituteOptions: InstituteOption[];
}) {
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

      toast.success(mode === 'create' ? 'Calendar created successfully.' : 'Calendar updated successfully.');
      const id = json?.data?.id ?? initialCalendar?.id;
      router.push(id ? `/scheduling/calendars/${id}` : '/scheduling/calendars');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save calendar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 sm:space-y-5">
      {error && (
        <Alert variant="error" className="animate-in fade-in slide-in-from-top-2 duration-300">
           <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Save operation failed
           </div>
           <p className="mt-1 opacity-90">{error}</p>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)] lg:gap-5">
        <div className="space-y-4 sm:space-y-5">
          <Card className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Identity & Context</h3>
                <p className="text-xs text-slate-500">Institute master, code, and effective range</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Institute"
                value={state.instituteId}
                onChange={(e) => updateField('instituteId', e.target.value)}
                required
                placeholder="Select institute"
                disabled={mode === 'edit'}
                options={instituteOptions}
                helperText="Loaded from the institute master"
              />
              <Input label="Calendar code" value={state.code} onChange={(e) => updateField('code', e.target.value)} required placeholder="e.g. ACAD-2026" disabled={mode === 'edit'} />
              <Input label="Primary Name" value={state.name} onChange={(e) => updateField('name', e.target.value)} required placeholder="e.g. Academic Year 2026" className="sm:col-span-2" />
              <Input label="English label" value={state.nameLocalizedEn} onChange={(e) => updateField('nameLocalizedEn', e.target.value)} required placeholder="e.g. Academic Year 2026" />
              <Input label="Arabic label" value={state.nameLocalizedAr} onChange={(e) => updateField('nameLocalizedAr', e.target.value)} required placeholder="التقويم الأكاديمي" className="text-right" dir="rtl" />
              <Input label="Effective Year" type="number" value={state.year} onChange={(e) => updateField('year', e.target.value)} required min={2000} max={2100} />
              <Input label="ISO Country" value={state.countryCode} onChange={(e) => updateField('countryCode', e.target.value.toUpperCase())} maxLength={2} required placeholder="OM" />
            </div>
          </Card>

          <Card className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Standard Weekly Pattern</h3>
                <p className="text-xs text-slate-500">Define open days and working hours</p>
              </div>
            </div>

            <div className="grid gap-3">
                {state.days.map((day, index) => (
                  <div key={day.dayOfWeek} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-shadow hover:shadow-sm md:flex-row md:items-center md:justify-between">
                    <div className="w-40">
                      <div className="font-semibold text-slate-800">{DAY_LABELS[day.dayOfWeek]}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{day.dayOfWeek}</div>
                    </div>
                    <div className="flex flex-1 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
                       <Checkbox label="Operating" checked={day.isOpen} onChange={(e) => updateDay(index, { isOpen: e.target.checked })} />
                       <div className="flex flex-wrap items-center gap-2">
                          <Input type="time" value={day.startTime} onChange={(e) => updateDay(index, { startTime: e.target.value })} disabled={!day.isOpen} className="h-9 w-28 sm:w-32" />
                          <span className="text-slate-400">—</span>
                          <Input type="time" value={day.endTime} onChange={(e) => updateDay(index, { endTime: e.target.value })} disabled={!day.isOpen} className="h-9 w-28 sm:w-32" />
                       </div>
                    </div>
                    <div className="hidden md:block">
                       <Badge variant={day.isOpen ? 'success' : 'muted'} className="opacity-80">{day.isOpen ? 'Active' : 'Closed'}</Badge>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-4 sm:space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Lifecycle & Validity</h3>
                <p className="text-xs text-slate-500">Status and effective dates</p>
              </div>
            </div>
            <div className="space-y-4">
              <Select label="Release Status" value={state.status} onChange={(e) => updateField('status', e.target.value as CalendarFormState['status'])} options={[
                { value: 'Draft', label: 'Draft — Working Copy' },
                { value: 'Active', label: 'Active — Live & Validating' },
                { value: 'Closed', label: 'Closed — Retired' },
                { value: 'Archived', label: 'Archived — Hidden' },
              ]} />
              <Input label="Effective Start" type="date" value={state.effectiveStartDate} onChange={(e) => updateField('effectiveStartDate', e.target.value)} required />
              <Input label="Effective End (Optional)" type="date" value={state.effectiveEndDate} onChange={(e) => updateField('effectiveEndDate', e.target.value)} />
            </div>
          </Card>

          <Card className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-800">Integration note</h3>
              <p className="text-sm text-slate-600">This baseline will be used for all branches within the institute.</p>
              <p className="text-sm text-slate-600">Changes here may affect existing schedules if they fall within this effective range.</p>
              <p className="text-sm font-semibold text-slate-700">Timezone: Asia/Muscat (Fixed)</p>
            </div>
            <div className="mt-5">
              <Button type="submit" loading={isSaving} className="w-full">
                <Save className="mr-2 h-4 w-4" /> {mode === 'create' ? 'Create baseline' : 'Save changes'}
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </form>
  );
}
