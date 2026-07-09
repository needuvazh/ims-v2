'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Eye,
  LayoutDashboard,
  MapPinned,
  Sparkles,
  AlertTriangle,
  Search,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
  EmptyState,
  FormLabel,
  Input,
  Select,
  ResponsiveDataTable,
  StatCard,
} from '@ims/shared-ui';
import { ConflictResolutionWizard } from './conflict-resolution-wizard';

type ConflictSessionRow = {
  id: string;
  batchId: string;
  batchCode: string;
  batchNameEnglish: string;
  courseName: string;
  titleEnglish: string;
  titleArabic: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  branchId: string;
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

type SortOrder = 'asc' | 'desc';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function conflictLabel(conflictType: string | null) {
  if (!conflictType) return 'None';
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

export function ConflictDashboardClient({
  sessions,
  classrooms,
  branches,
  counts,
}: {
  sessions: ConflictSessionRow[];
  classrooms: ClassroomOption[];
  branches: Array<{ id: string; branchName: string }>;
  counts: {
    conflict: number;
    warning: number;
    holiday: number;
    venue: number;
    overlap: number;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [selectedSession, setSelectedSession] =
    useState<ConflictSessionRow | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');

  const currentSortBy = searchParams.get('sortBy') ?? 'timing';
  const currentSortOrder =
    (searchParams.get('sortOrder') as SortOrder | null) ?? 'asc';

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const nextSearch = searchParams.get('q') || '';
    setSearchValue((current) =>
      current === nextSearch ? current : nextSearch,
    );
  }, [searchParams]);

  useEffect(() => {
    const currentSearch = searchParams.get('q') || '';
    if (searchValue === currentSearch) {
      return;
    }

    const timeout = setTimeout(() => {
      updateParams({ q: searchValue || null });
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchParams, searchValue, updateParams]);

  const handleSort = (field: string) => {
    const nextOrder: SortOrder =
      currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder });
  };

  const openWizard = (session: ConflictSessionRow) => {
    setSelectedSession(session);
    setWizardOpen(true);
  };

  // Client-side sorting for conflicts dashboard list
  const sortedSessions = [...sessions].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    if (currentSortBy === 'sessionName') {
      aVal = a.titleEnglish;
      bVal = b.titleEnglish;
    } else if (currentSortBy === 'timing') {
      aVal = new Date(a.sessionDate).getTime();
      bVal = new Date(b.sessionDate).getTime();
    } else if (currentSortBy === 'scope') {
      aVal = a.branchName + (a.classroomName ?? '');
      bVal = b.branchName + (b.classroomName ?? '');
    } else if (currentSortBy === 'status') {
      aVal = a.scheduleStatus;
      bVal = b.scheduleStatus;
    }

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (typeof aVal === 'string') {
      return currentSortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return currentSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
  });

  const columns = [
    {
      header: 'Session',
      sortable: true,
      sortDirection: currentSortBy === 'sessionName' ? currentSortOrder : null,
      onSort: () => handleSort('sessionName'),
      render: (session: ConflictSessionRow) => (
        <div>
          <div className="font-semibold text-[color:var(--ims-ink)]">
            {session.titleEnglish}
          </div>
          <div
            className="text-xs font-arabic text-[color:var(--ims-muted)]"
            dir="rtl"
          >
            {session.titleArabic}
          </div>
          <div className="mt-1 text-xs text-[color:var(--ims-muted)] font-mono">
            {session.batchCode} · {session.courseName}
          </div>
        </div>
      ),
    },
    {
      header: 'Timing',
      sortable: true,
      sortDirection: currentSortBy === 'timing' ? currentSortOrder : null,
      onSort: () => handleSort('timing'),
      render: (session: ConflictSessionRow) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-[color:var(--ims-muted)]">
            <CalendarDays className="h-4 w-4 shrink-0 text-indigo-500" />
            {formatDate(session.sessionDate)}
          </div>
          <div className="flex items-center gap-2 text-sm text-[color:var(--ims-muted)]">
            <Clock3 className="h-4 w-4 shrink-0 text-indigo-500" />
            {session.startTime} - {session.endTime}
          </div>
        </div>
      ),
    },
    {
      header: 'Scope',
      sortable: true,
      sortDirection: currentSortBy === 'scope' ? currentSortOrder : null,
      onSort: () => handleSort('scope'),
      render: (session: ConflictSessionRow) => (
        <div>
          <div className="font-medium text-[color:var(--ims-ink)]">
            {session.branchName}
          </div>
          <div className="text-xs text-[color:var(--ims-muted)]">
            {session.classroomName ?? 'Branch-wide block'}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (session: ConflictSessionRow) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={
              session.scheduleStatus === 'Conflict' ? 'error' : 'success'
            }
          >
            {session.scheduleStatus}
          </Badge>
          {session.isConflictIgnored && (
            <Badge variant="success">Override</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Issue',
      render: (session: ConflictSessionRow) => (
        <div className="space-y-1">
          {session.conflictType ? (
            <Badge variant="outline">{conflictLabel(session.conflictType)}</Badge>
          ) : (
            <span className="text-xs text-slate-400">None</span>
          )}
          {session.overrideReason && (
            <p
              className="max-w-[18rem] truncate text-xs text-[color:var(--ims-muted)]"
              title={session.overrideReason}
            >
              {session.overrideReason}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (session: ConflictSessionRow) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => openWizard(session)}
            className="h-8 gap-1.5"
          >
            Resolve
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/batches/${session.batchId}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const renderCard = (session: ConflictSessionRow) => (
    <Card className="hover:border-[var(--ims-brass)] transition-colors">
      <CardHeader className="p-card-p border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)] font-mono">
              {session.batchCode}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)] truncate max-w-[12rem]">
              {session.titleEnglish}
            </p>
          </div>
          <div className="flex gap-1">
            <Badge
              variant={
                session.scheduleStatus === 'Conflict' ? 'error' : 'success'
              }
            >
              {session.scheduleStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-card-p space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">
              Scope & Room
            </p>
            <p className="truncate">
              {session.branchName}
              <span className="block text-[10px] text-[color:var(--ims-muted)]">
                {session.classroomName ?? 'Branch-wide'}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Timing</p>
            <p>
              {formatDate(session.sessionDate)}
              <span className="block text-[10px] font-mono text-[color:var(--ims-muted)]">
                {session.startTime} - {session.endTime}
              </span>
            </p>
          </div>
          <div className="col-span-2 space-y-1 border-t border-slate-100 pt-2">
            <p className="font-semibold text-[var(--ims-muted)]">Issue</p>
            <div className="flex items-center gap-2">
              {session.conflictType ? (
                <Badge variant="outline">
                  {conflictLabel(session.conflictType)}
                </Badge>
              ) : (
                <span className="text-xs text-slate-400">None</span>
              )}
              {session.overrideReason && (
                <span className="text-[11px] text-[color:var(--ims-muted)] truncate max-w-[14rem]">
                  {session.overrideReason}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 text-[11px] gap-1.5"
          onClick={() => openWizard(session)}
        >
          Resolve <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-[11px]"
          onClick={() => router.push(`/batches/${session.batchId}`)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" /> Batch Detail
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Page Header */}
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <AlertTriangle className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Conflict Dashboard
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/scheduling/venues')}
          className="h-10 shrink-0 gap-1.5 px-3 sm:px-4"
        >
          <MapPinned className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Venue management</span>
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 sm:gap-5">
        <StatCard
          title="Conflicts"
          value={counts.conflict}
          description="Sessions waiting on intervention"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          title="Warnings"
          value={counts.warning}
          description="Published sessions with overrides"
          icon={<LayoutDashboard className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Holiday"
          value={counts.holiday}
          description="Holiday-driven invalidations"
          icon={<MapPinned className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          title="Venue"
          value={counts.venue}
          description="Venue-driven invalidations"
          icon={<MapPinned className="h-5 w-5" />}
          tone="orange"
        />
        <StatCard
          title="Overlap"
          value={counts.overlap}
          description="Trainer/classroom overlaps"
          icon={<LayoutDashboard className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      {/* Search and Filters */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Search
          </FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
              }}
              placeholder="Search conflicts by batch, session title or reason..."
              leftIcon={<Search className="h-4 w-4" />}
              className="h-12 pr-10"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  updateParams({ q: null });
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-[color:var(--ims-muted)] transition-colors hover:text-[color:var(--ims-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Branch
          </FormLabel>
          <Select
            value={searchParams.get('branchId') || ''}
            onChange={(e) => updateParams({ branchId: e.target.value })}
            options={[
              { value: '', label: 'All Branches' },
              ...branches.map((b) => ({ value: b.id, label: b.branchName })),
            ]}
            className="h-12"
            placeholder="All Branches"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Severity
          </FormLabel>
          <Select
            value={searchParams.get('severity') || ''}
            onChange={(e) => updateParams({ severity: e.target.value })}
            options={[
              { value: '', label: 'All Severities' },
              { value: 'Conflict', label: 'Conflict' },
              { value: 'Warning', label: 'Warning' },
              { value: 'Published', label: 'Published' },
            ]}
            className="h-12"
            placeholder="All Severities"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Type
          </FormLabel>
          <Select
            value={searchParams.get('conflictType') || ''}
            onChange={(e) => updateParams({ conflictType: e.target.value })}
            options={[
              { value: '', label: 'All Types' },
              { value: 'HOLIDAY', label: 'Holiday' },
              { value: 'VENUE', label: 'Venue' },
              { value: 'TRAINER_OVERLAP', label: 'Trainer overlap' },
              { value: 'CLASSROOM_OVERLAP', label: 'Classroom overlap' },
              { value: 'OPERATING_HOURS', label: 'Operating hours' },
            ]}
            className="h-12"
            placeholder="All Types"
          />
        </div>
      </div>

      {/* Conflicts Data */}
      <ResponsiveDataTable
        data={sortedSessions}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(session) => session.id}
        emptyState={
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title="No schedule conflicts"
            description="Nothing currently needs resolution for the selected filters."
          />
        }
      />

      <ConflictResolutionWizard
        session={selectedSession}
        open={wizardOpen}
        classrooms={classrooms}
        onOpenChange={setWizardOpen}
        onResolved={() => router.refresh()}
      />
    </div>
  );
}
