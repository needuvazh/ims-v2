'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  CalendarDays,
  Plus,
  Eye,
  Edit2,
  Search,
  X,
  FileText,
  CalendarCheck,
  CalendarDays as DraftIcon,
  CalendarRange,
} from 'lucide-react';
import {
  Badge,
  Button,
  Pagination,
  StatCard,
  ResponsiveDataTable,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  EmptyState,
  FormLabel,
  Input,
  Select,
} from '@ims/shared-ui';

interface CalendarListItem {
  id: string;
  code: string;
  name: string;
  year: number;
  status: 'Draft' | 'Active' | 'Closed' | 'Archived';
  effectiveStartDate: string | Date;
  effectiveEndDate: string | Date | null;
  instituteId: string;
}

interface CalendarsClientListProps {
  calendars: CalendarListItem[];
  years: number[];
  total: number;
  currentPage: number;
  kpis: {
    total: number;
    active: number;
    draft: number;
    closed: number;
  };
}

type SortOrder = 'asc' | 'desc';

export function CalendarsClientList({
  calendars,
  years,
  total,
  currentPage,
  kpis,
}: CalendarsClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / 10);

  const currentSortBy = searchParams.get('sortBy') ?? 'year';
  const currentSortOrder =
    (searchParams.get('sortOrder') as SortOrder | null) ?? 'desc';

  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');

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
      updateParams({ q: searchValue || null, page: '1' });
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchParams, searchValue, updateParams]);

  const handleSort = (field: string) => {
    const nextOrder: SortOrder =
      currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const getStatusBadgeVariant = (s: string) => {
    switch (s) {
      case 'Active':
        return 'success';
      case 'Draft':
        return 'outline';
      case 'Closed':
        return 'warning';
      case 'Archived':
        return 'muted';
      default:
        return 'default';
    }
  };

  const formatDate = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Perform sorting on the client side since listBusinessCalendars is sorted year desc, createdAt desc on database level
  const sortedCalendars = [...calendars].sort((a, b) => {
    let aVal: any = a[currentSortBy as keyof CalendarListItem];
    let bVal: any = b[currentSortBy as keyof CalendarListItem];

    if (currentSortBy === 'effectivePeriod') {
      aVal = new Date(a.effectiveStartDate).getTime();
      bVal = new Date(b.effectiveStartDate).getTime();
    }

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (typeof aVal === 'string') {
      return currentSortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return currentSortOrder === 'asc'
        ? (aVal as any) - (bVal as any)
        : (bVal as any) - (aVal as any);
    }
  });

  const columns = [
    {
      header: 'Code',
      sortable: true,
      sortDirection: currentSortBy === 'code' ? currentSortOrder : null,
      onSort: () => handleSort('code'),
      render: (calendar: CalendarListItem) => (
        <span className="font-mono text-xs font-semibold text-[color:var(--ims-muted)] uppercase">
          {calendar.code}
        </span>
      ),
    },
    {
      header: 'Baseline Name',
      sortable: true,
      sortDirection: currentSortBy === 'name' ? currentSortOrder : null,
      onSort: () => handleSort('name'),
      render: (calendar: CalendarListItem) => (
        <div className="flex flex-col">
          <div className="font-semibold text-[color:var(--ims-ink)]">
            {calendar.name}
          </div>
          <div className="text-xs text-[color:var(--ims-muted)]">
            Inst: {calendar.instituteId.slice(0, 8)}...
          </div>
        </div>
      ),
    },
    {
      header: 'Year',
      sortable: true,
      sortDirection: currentSortBy === 'year' ? currentSortOrder : null,
      onSort: () => handleSort('year'),
      render: (calendar: CalendarListItem) => (
        <span className="font-medium">{calendar.year}</span>
      ),
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (calendar: CalendarListItem) => (
        <Badge variant={getStatusBadgeVariant(calendar.status)}>
          {calendar.status}
        </Badge>
      ),
    },
    {
      header: 'Effective Period',
      sortable: true,
      sortDirection:
        currentSortBy === 'effectivePeriod' ? currentSortOrder : null,
      onSort: () => handleSort('effectivePeriod'),
      render: (calendar: CalendarListItem) => (
        <div className="flex flex-col text-sm">
          <span className="text-[color:var(--ims-ink)]">
            {formatDate(calendar.effectiveStartDate)}
          </span>
          <span className="text-[color:var(--ims-muted)] text-xs">
            to{' '}
            {calendar.effectiveEndDate
              ? formatDate(calendar.effectiveEndDate)
              : 'Indefinite'}
          </span>
        </div>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (calendar: CalendarListItem) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => router.push(`/scheduling/calendars/${calendar.id}`)}
          >
            <Eye className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"
            onClick={() =>
              router.push(`/scheduling/calendars/${calendar.id}/edit`)
            }
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const renderCard = (calendar: CalendarListItem) => (
    <Card className="hover:border-[var(--ims-brass)] transition-colors">
      <CardHeader className="p-card-p border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)] font-mono">
              {calendar.code}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">
              {calendar.name}
            </p>
          </div>
          <Badge variant={getStatusBadgeVariant(calendar.status)}>
            {calendar.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-card-p space-y-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Year</p>
            <p>{calendar.year}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">
              Effective Period
            </p>
            <p className="text-xs">
              {formatDate(calendar.effectiveStartDate)} to{' '}
              {calendar.effectiveEndDate
                ? formatDate(calendar.effectiveEndDate)
                : 'Indefinite'}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[11px]"
          onClick={() => router.push(`/scheduling/calendars/${calendar.id}`)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" /> View Details
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[11px] text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"
          onClick={() =>
            router.push(`/scheduling/calendars/${calendar.id}/edit`)
          }
        >
          <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
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
            <CalendarDays className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Calendar Baselines
          </h1>
        </div>
        <Button
          onClick={() => router.push('/scheduling/calendars/new')}
          className="h-10 w-10 shrink-0 gap-0 px-0 sm:w-auto sm:px-4"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only">New baseline</span>
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Baselines"
          value={kpis.total}
          description="Total institute baseline calendars"
          icon={<FileText className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Active"
          value={kpis.active}
          description="Baseline calendars active in batches"
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Draft"
          value={kpis.draft}
          description="Draft or pending setup baselines"
          icon={<DraftIcon className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          title="Closed / Archived"
          value={kpis.closed}
          description="Closed or archived histories"
          icon={<CalendarRange className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      {/* Search and Filters */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_repeat(2,minmax(0,1fr))]">
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
              placeholder="Search calendars by code or name..."
              leftIcon={<Search className="h-4 w-4" />}
              className="h-12 pr-10"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  updateParams({ q: null, page: '1' });
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
            Year
          </FormLabel>
          <Select
            value={searchParams.get('year') || ''}
            onChange={(e) => updateParams({ year: e.target.value, page: '1' })}
            options={[
              { value: '', label: 'All Years' },
              ...years.map((y) => ({ value: String(y), label: String(y) })),
            ]}
            className="h-12"
            placeholder="All Years"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Status
          </FormLabel>
          <Select
            value={searchParams.get('status') || ''}
            onChange={(e) =>
              updateParams({ status: e.target.value, page: '1' })
            }
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Active', label: 'Active' },
              { value: 'Closed', label: 'Closed' },
              { value: 'Archived', label: 'Archived' },
            ]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>
      </div>

      {/* Calendars Data */}
      <ResponsiveDataTable
        data={sortedCalendars}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(calendar) => calendar.id}
        emptyState={
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="No calendars found"
            description="No institute baseline calendars match your current filter criteria."
          />
        }
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalCount={total}
          limit={10}
        />
      )}
    </div>
  );
}
