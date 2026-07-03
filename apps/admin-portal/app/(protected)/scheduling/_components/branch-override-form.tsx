'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarDays, Layers3, Save, Info } from 'lucide-react';
import { 
  Alert, 
  Button, 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  Checkbox, 
  Input, 
  Select, 
  Textarea,
  Badge
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
      startTime: base?.workingHours?.[0]?.startTime ?? '08:00',
      endTime: base?.workingHours?.[0]?.endTime ?? '16:00',
    };
  });
}

export function BranchOverrideForm({ 
  calendar, 
  branches, 
  defaultBranchId 
}: { 
  calendar: BusinessCalendar; 
  branches: Array<{ id: string; name: string }>; 
  defaultBranchId?: string | null 
}) {
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

  const selectedBranchLabel = useMemo(() => 
    branches.find((branch) => branch.id === branchId)?.name ?? 'Selected branch', 
    [branchId, branches]
  );

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

      toast.success(`Override saved for ${selectedBranchLabel}`);
      router.refresh();
      setDays(buildDays(calendar));
      setNotes('');
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save override.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      
      <Card className="border-[color:var(--ims-border)] shadow-md ring-1 ring-[color:var(--ims-border)] overflow-hidden">
        <CardHeader className="bg-[color:var(--ims-surface-hover)] border-b border-[color:var(--ims-border)]">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-[color:var(--ims-brass)]" /> 
            Create Branch Exception
          </CardTitle>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4">
              <Select 
                label="Target Branch" 
                value={branchId} 
                onChange={(e) => setBranchId(e.target.value)} 
                options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} 
                required 
              />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Year" type="number" value={year} onChange={(e) => setYear(e.target.value)} required min={2000} max={2100} />
                <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} options={[
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Active', label: 'Active' },
                ]} />
              </div>
              <Input label="Override label" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramadan Hours 2026" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Start" type="date" value={effectiveStartDate} onChange={(e) => setEffectiveStartDate(e.target.value)} required />
                <Input label="End" type="date" value={effectiveEndDate} onChange={(e) => setEffectiveEndDate(e.target.value)} />
              </div>
            </div>

            <Textarea 
              label="Administrative Notes" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={2} 
              placeholder="Reason for this exception..." 
              className="text-sm"
            />

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[color:var(--ims-muted)]">
                 <Info className="h-3 w-3" /> Sparse Delta Selection
              </div>
              <div className="grid gap-2">
                {days.map((day, index) => (
                  <div key={day.dayOfWeek} className={`flex flex-col gap-3 p-3 rounded-xl border transition-all ${day.enabled ? 'border-[color:var(--ims-brass)] bg-[color:var(--ims-accent-soft)]' : 'border-[color:var(--ims-border)] bg-[color:var(--ims-background)] opacity-60'}`}>
                    <div className="flex items-center justify-between">
                       <Checkbox 
                         label={DAY_LABELS[day.dayOfWeek]} 
                         checked={day.enabled} 
                         onChange={(e) => updateDay(index, { enabled: e.target.checked })} 
                         className="font-bold text-[color:var(--ims-ink)]"
                       />
                       {day.enabled && <Badge variant="success" className="text-[9px] h-4">Override active</Badge>}
                    </div>
                    
                    {day.enabled && (
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2">
                          <Input type="time" value={day.startTime} onChange={(e) => updateDay(index, { startTime: e.target.value })} className="h-8 text-xs px-2" />
                          <span className="text-[10px] text-[color:var(--ims-muted)]">to</span>
                          <Input type="time" value={day.endTime} onChange={(e) => updateDay(index, { endTime: e.target.value })} className="h-8 text-xs px-2" />
                        </div>
                        <Checkbox 
                          label="Open" 
                          checked={day.isOpen} 
                          onChange={(e) => updateDay(index, { isOpen: e.target.checked })} 
                          className="text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-[color:var(--ims-surface-hover)] border-t border-[color:var(--ims-border)] pt-4">
            <Button type="submit" loading={isSaving} className="w-full shadow-lg">
              <Save className="h-4 w-4 mr-2" /> Commit Exception
            </Button>
          </CardFooter>
        </form>
      </Card>
      <p className="text-[10px] text-center text-[color:var(--ims-muted)] px-4">
        Unselected days will continue to inherit institute baseline rules for {selectedBranchLabel}.
      </p>
    </div>
  );
}
