'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CalendarDays,
  Save,
  Plus,
  X,
  Globe,
  MapPin,
  Calendar,
  HelpCircle,
  CheckCircle,
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
  Input,
  Select,
  Textarea,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ims/shared-ui';

type Holiday = {
  id: string;
  businessCalendarId: string;
  branchId: string | null;
  date: string | Date;
  name: string;
  nameLocalized: { en: string; ar: string };
  holidayType: string;
  affectsScheduling: boolean;
  status: string;
  description: string | null;
};

type BranchOption = {
  id: string;
  name: string;
};

export function HolidayManager({
  calendarId,
  holidays,
  branches,
}: {
  calendarId: string;
  holidays: Holiday[];
  branches: BranchOption[];
}) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [holidayType, setHolidayType] = useState('Public');
  const [targetBranchId, setTargetBranchId] = useState<string>('global'); // 'global' or branch UUID
  const [affectsScheduling, setAffectsScheduling] = useState(true);
  const [status, setStatus] = useState<'Draft' | 'Active'>('Active');
  const [description, setDescription] = useState('');

  const branchMap = useMemo(
    () => new Map(branches.map((b) => [b.id, b.name])),
    [branches],
  );

  const resetForm = () => {
    setName('');
    setDate('');
    setHolidayType('Public');
    setTargetBranchId('global');
    setAffectsScheduling(true);
    setStatus('Active');
    setDescription('');
    setError(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const payload = {
      date,
      name,
      nameLocalized: { en: name, ar: name }, // Auto-default localized english/arabic to primary name
      holidayType,
      branchId: targetBranchId === 'global' ? null : targetBranchId,
      affectsScheduling,
      status,
      description: description || null,
    };

    try {
      const response = await fetch(
        `/api/v1/scheduling/calendars/${calendarId}/holidays`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(
          json?.detail || json?.messageEnglish || 'Unable to register holiday.',
        );
      }

      toast.success(`Holiday "${name}" registered successfully.`);
      router.refresh();
      setIsAdding(false);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to register holiday.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateVal: string | Date) => {
    return new Date(dateVal).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card className="border-[color:var(--ims-border)] bg-white overflow-hidden shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 pb-4">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
            Calendar Holidays
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Manage holidays and operational closures.
          </CardDescription>
        </div>
        {!isAdding && (
          <Button
            size="sm"
            onClick={() => setIsAdding(true)}
            className="gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add Holiday
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {error && (
          <div className="p-4 border-b border-rose-100 bg-rose-50/30">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {isAdding && (
          <form
            onSubmit={submit}
            className="p-6 border-b border-slate-100 bg-slate-50/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Register New Holiday
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Holiday Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. National Day"
                required
              />
              <Input
                label="Holiday Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Select
                label="Holiday Type"
                value={holidayType}
                onChange={(e) => setHolidayType(e.target.value)}
                options={[
                  { value: 'Public', label: 'Public Holiday' },
                  { value: 'Academic', label: 'Academic Closure' },
                  { value: 'National', label: 'National Holiday' },
                  { value: 'Religious', label: 'Religious Holiday' },
                  { value: 'Other', label: 'Other Closure' },
                ]}
              />
              <Select
                label="Holiday Scope"
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                options={[
                  { value: 'global', label: 'Global (Institute-Level)' },
                  ...branches.map((b) => ({
                    value: b.id,
                    label: `Local — ${b.name}`,
                  })),
                ]}
              />
            </div>

            <Textarea
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context or instructions for this closure..."
              rows={2}
            />

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-6">
                <Checkbox
                  label="Block Scheduled Sessions"
                  checked={affectsScheduling}
                  onChange={(e) => setAffectsScheduling(e.target.checked)}
                  className="text-xs font-semibold"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    Status:
                  </span>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as 'Draft' | 'Active')
                    }
                    className="text-xs font-bold border border-slate-200 rounded-md py-1 px-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    resetForm();
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isSaving}
                  className="shadow-sm"
                >
                  <Save className="h-4 w-4 mr-1.5" /> Save Holiday
                </Button>
              </div>
            </div>
          </form>
        )}

        <div className="max-h-[400px] overflow-y-auto">
          {holidays.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <Calendar className="h-10 w-10 text-slate-300 stroke-[1.5] mb-2" />
              <h5 className="text-sm font-semibold text-slate-800">
                No Holidays Registered
              </h5>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Active baselines inherit standard working hours. Add a holiday
                to trigger conflict validation checks.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="px-6 py-3">Holiday Details</TableHead>
                  <TableHead className="py-3">Scope</TableHead>
                  <TableHead className="py-3">Type</TableHead>
                  <TableHead className="py-3">Impact</TableHead>
                  <TableHead className="px-6 py-3 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow
                    key={h.id}
                    className="hover:bg-slate-50/30 transition-colors"
                  >
                    <TableCell className="px-6 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-xs">
                          {h.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {formatDate(h.date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      {h.branchId === null ? (
                        <Badge
                          variant="muted"
                          className="bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1 w-fit text-[9px] font-bold"
                        >
                          <Globe className="h-3 w-3" /> Global
                        </Badge>
                      ) : (
                        <Badge
                          variant="muted"
                          className="bg-amber-50 text-amber-700 border-amber-100 flex items-center gap-1 w-fit text-[9px] font-bold"
                        >
                          <MapPin className="h-3 w-3" />{' '}
                          {branchMap.get(h.branchId) || 'Local Branch'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="text-xs font-semibold text-slate-600">
                        {h.holidayType}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      {h.affectsScheduling ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                          Blocks Classes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                          No Impact
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-3.5 text-right">
                      <Badge
                        variant={h.status === 'Active' ? 'success' : 'muted'}
                        className="px-2 py-0.5 text-[10px] font-bold"
                      >
                        {h.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
