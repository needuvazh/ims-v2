import React from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Clock3,
  Edit2,
  Home,
  Layers3,
  MapPin,
  Sparkles,
  Info,
  History,
  AlertCircle,
  Plus,
} from 'lucide-react';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SimpleTooltip,
  AdminDetailPageLayout,
} from '@ims/shared-ui';
import { BranchOverrideForm } from '../../_components/branch-override-form';
import { HolidayManager } from '../../_components/holiday-manager';
import { WorkingDaysCalendar } from '../../_components/working-days-calendar';
import { loadCalendarDetail } from '../../data';

export const metadata = { title: 'Calendar Details | IMS Admin' };
export const dynamic = 'force-dynamic';

function formatDayHours(day: {
  isOpen: boolean;
  workingHours: { startTime: string; endTime: string }[];
}) {
  if (!day.isOpen) return 'Closed';
  return day.workingHours.length > 0
    ? day.workingHours
        .map((window) => `${window.startTime} - ${window.endTime}`)
        .join(', ')
    : 'Open (Unrestricted)';
}

export default async function CalendarDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const [{ id }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { calendar, branches, selectedBranchId, resolved, holidays } =
    await loadCalendarDetail(id, searchParams.branchId);
  const branchLabel =
    branches.find((branch) => branch.id === selectedBranchId)?.name ??
    'Default Branch';

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <AdminDetailPageLayout>
      <PageHeader
        eyebrow="Scheduling Baseline"
        title={calendar.name}
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Scheduling',
                href: '/scheduling',
                icon: <CalendarDays className="h-3.5 w-3.5 text-slate-400" />,
              },
              {
                label: 'Calendars',
                href: '/scheduling/calendars',
                icon: <Layers3 className="h-3.5 w-3.5 text-slate-400" />,
              },
              {
                label: calendar.code,
                icon: <Sparkles className="h-3.5 w-3.5 text-slate-500" />,
              },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-3">
            <Link href={`/scheduling/calendars/${calendar.id}/edit`}>
              <Button variant="secondary" size="sm">
                <Edit2 className="h-4 w-4 mr-2" /> Edit baseline
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card className="border-[color:var(--ims-border)] bg-white hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Code
            </CardDescription>
            <CardTitle className="text-base font-mono tracking-tight text-indigo-600">
              {calendar.code}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-[color:var(--ims-border)] bg-white hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Lifecycle
            </CardDescription>
            <CardTitle className="mt-1">
              <Badge
                variant={calendar.status === 'Active' ? 'success' : 'muted'}
                className="px-2.5 py-0.5 text-xs font-bold"
              >
                {calendar.status}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-[color:var(--ims-border)] bg-white hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Academic Year
            </CardDescription>
            <CardTitle className="text-base font-bold text-slate-800">
              {calendar.year}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-[color:var(--ims-border)] bg-white hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Timezone
            </CardDescription>
            <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-1.5">
              Asia/Muscat
              <SimpleTooltip content="Fixed timezone for ASTI operations">
                <span className="p-0.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 cursor-help">
                  <Info className="h-3.5 w-3.5" />
                </span>
              </SimpleTooltip>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
        <div className="space-y-6">
          <Card className="overflow-hidden border-[color:var(--ims-border)]">
            <CardHeader className="bg-[color:var(--ims-surface-hover)] border-b border-[color:var(--ims-border)] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-[color:var(--ims-brass)]" />
                  Resolved Operating Pattern
                </CardTitle>
                <CardDescription>
                  Active rules for{' '}
                  <span className="font-semibold text-[color:var(--ims-ink)]">
                    {branchLabel}
                  </span>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant={
                    resolved?.source === 'branch-override' ? 'success' : 'muted'
                  }
                >
                  {resolved?.source === 'branch-override'
                    ? 'Override Active'
                    : 'Inherited from Institute'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {resolved ? (
                <Table>
                  <TableHeader className="bg-[color:var(--ims-background)]">
                    <TableRow>
                      <TableHead className="px-card-p">Working Day</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead className="text-right px-card-p">
                        Source
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolved.resolvedOperatingDays.map((day) => {
                      const isOverridden =
                        resolved.branchOverride?.operatingDays.some(
                          (o) => o.dayOfWeek === day.dayOfWeek,
                        );
                      return (
                        <TableRow
                          key={day.dayOfWeek}
                          className="hover:bg-[color:var(--ims-background)] transition-colors"
                        >
                          <TableCell className="px-card-p font-semibold text-[color:var(--ims-ink)]">
                            {day.dayOfWeek}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {day.isOpen ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-xs font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {formatDayHours(day)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 text-xs font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Closed
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right px-card-p">
                            {isOverridden ? (
                              <Badge
                                variant="success"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                              >
                                Local Override
                              </Badge>
                            ) : (
                              <Badge
                                variant="muted"
                                className="opacity-70 tracking-tight text-[10px] uppercase font-bold"
                              >
                                Inherited
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-12 text-center">
                  <EmptyState
                    icon={<MapPin className="h-8 w-8" />}
                    title="Select a branch"
                    description="Provance-aware resolution requires a branch context. Use the side panel to pick a branch."
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {resolved && (
            <WorkingDaysCalendar
              resolvedOperatingDays={resolved.resolvedOperatingDays}
              holidays={holidays}
              selectedBranchId={selectedBranchId}
              branchLabel={branchLabel}
            />
          )}

          <HolidayManager
            calendarId={calendar.id}
            holidays={holidays}
            branches={branches}
          />

          <Card className="border-[color:var(--ims-border)]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[color:var(--ims-muted)]" />
                Baseline Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="space-y-1">
                <p className="text-[color:var(--ims-muted)] font-medium uppercase text-[10px] tracking-widest">
                  Effective Period
                </p>
                <p className="text-[color:var(--ims-ink)] font-semibold">
                  {formatDate(calendar.effectiveStartDate)} —{' '}
                  {calendar.effectiveEndDate
                    ? formatDate(calendar.effectiveEndDate)
                    : 'Indefinite'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[color:var(--ims-muted)] font-medium uppercase text-[10px] tracking-widest">
                  Created Context
                </p>
                <p className="text-[color:var(--ims-ink)] font-semibold flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />{' '}
                  {formatDate(calendar.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-[color:var(--ims-border)] shadow-md overflow-hidden ring-1 ring-[color:var(--ims-border)]">
            <CardHeader className="bg-[color:var(--ims-surface-hover)]">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Plus className="h-4 w-4" /> Resolve Branch
              </CardTitle>
              <CardDescription className="text-xs">
                Switch branch context to see local exceptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  {branches.map((b) => (
                    <Link
                      key={b.id}
                      href={`/scheduling/calendars/${calendar.id}?branchId=${b.id}`}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all text-xs font-semibold ${
                        selectedBranchId === b.id
                          ? 'border-indigo-200 bg-indigo-50/40 text-indigo-700 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <MapPin
                          className={`h-4 w-4 ${selectedBranchId === b.id ? 'text-indigo-600' : 'text-slate-400'}`}
                        />
                        {b.name}
                      </span>
                      {selectedBranchId === b.id && (
                        <Badge
                          variant="success"
                          className="h-2 w-2 rounded-full p-0 bg-indigo-600 border-none"
                        />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] p-1">
            <BranchOverrideForm
              calendar={calendar}
              branches={branches}
              defaultBranchId={selectedBranchId}
            />
          </div>
        </div>
      </div>
    </AdminDetailPageLayout>
  );
}
