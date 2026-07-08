'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  MapPinned,
  Plus,
  Eye,
  Edit2,
  Search,
  X,
  ShieldAlert,
  Clock,
  Ban,
  Building2,
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

interface VenueBlockListItem {
  id: string;
  blockStartDate: string | Date;
  blockEndDate: string | Date;
  isFullDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reasonCode: string;
  status: 'Active' | 'Cancelled';
  branch: {
    id: string;
    branchName: string;
  };
  classroom: {
    id: string;
    classroomName: string;
  } | null;
}

interface VenuesClientListProps {
  venueBlocks: VenueBlockListItem[];
  branches: Array<{ id: string; branchName: string }>;
  classrooms: Array<{ id: string; classroomName: string; branchId: string }>;
  total: number;
  currentPage: number;
  kpis: {
    total: number;
    active: number;
    cancelled: number;
    branchWide: number;
  };
}

type SortOrder = 'asc' | 'desc';

export function VenuesClientList({
  venueBlocks,
  branches,
  classrooms,
  total,
  currentPage,
  kpis,
}: VenuesClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / 10);

  const currentSortBy = searchParams.get('sortBy') ?? 'blockPeriod';
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
      case 'Cancelled':
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

  const renderBlockPeriod = (
    startDateInput: string | Date,
    endDateInput: string | Date,
  ) => {
    const startDate = new Date(startDateInput);
    const endDate = new Date(endDateInput);
    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(startDate);
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Perform client-side sorting of the current page of blocks
  const sortedBlocks = [...venueBlocks].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    if (currentSortBy === 'blockPeriod') {
      aVal = new Date(a.blockStartDate).getTime();
      bVal = new Date(b.blockStartDate).getTime();
    } else if (currentSortBy === 'scope') {
      aVal = a.branch.branchName + (a.classroom?.classroomName ?? '');
      bVal = b.branch.branchName + (b.classroom?.classroomName ?? '');
    } else if (currentSortBy === 'reason') {
      aVal = a.reasonCode;
      bVal = b.reasonCode;
    } else if (currentSortBy === 'status') {
      aVal = a.status;
      bVal = b.status;
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
      header: 'Block Period',
      sortable: true,
      sortDirection: currentSortBy === 'blockPeriod' ? currentSortOrder : null,
      onSort: () => handleSort('blockPeriod'),
      render: (block: VenueBlockListItem) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[color:var(--ims-ink)]">
            {renderBlockPeriod(block.blockStartDate, block.blockEndDate)}
          </span>
          <span className="text-xs text-[color:var(--ims-muted)]">
            {block.isFullDay ? 'Full-day block' : 'Timed block'}
          </span>
        </div>
      ),
    },
    {
      header: 'Scope',
      sortable: true,
      sortDirection: currentSortBy === 'scope' ? currentSortOrder : null,
      onSort: () => handleSort('scope'),
      render: (block: VenueBlockListItem) => (
        <div className="flex flex-col">
          <span className="font-medium text-[color:var(--ims-ink)]">
            {block.branch.branchName}
          </span>
          <span className="text-xs text-[color:var(--ims-muted)]">
            {block.classroom?.classroomName ?? 'Branch-wide'}
          </span>
        </div>
      ),
    },
    {
      header: 'Time',
      render: (block: VenueBlockListItem) => (
        <span className="font-mono text-xs text-[color:var(--ims-muted)]">
          {block.isFullDay
            ? 'All day'
            : `${block.startTime} - ${block.endTime}`}
        </span>
      ),
    },
    {
      header: 'Reason',
      sortable: true,
      sortDirection: currentSortBy === 'reason' ? currentSortOrder : null,
      onSort: () => handleSort('reason'),
      render: (block: VenueBlockListItem) => (
        <div
          className="truncate font-semibold text-[color:var(--ims-ink)] max-w-[15rem]"
          title={block.reasonCode}
        >
          {block.reasonCode}
        </div>
      ),
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (block: VenueBlockListItem) => (
        <Badge variant={getStatusBadgeVariant(block.status)}>
          {block.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (block: VenueBlockListItem) => (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"
          onClick={() => router.push(`/scheduling/venues/${block.id}/edit`)}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const renderCard = (block: VenueBlockListItem) => (
    <Card className="hover:border-[var(--ims-brass)] transition-colors">
      <CardHeader className="p-card-p border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)] font-mono">
              {block.isFullDay ? 'Full-Day' : 'Timed'}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)] truncate max-w-[12rem]">
              {block.reasonCode}
            </p>
          </div>
          <Badge variant={getStatusBadgeVariant(block.status)}>
            {block.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-card-p space-y-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">
              Campus Scope
            </p>
            <p className="truncate">
              {block.branch.branchName}
              <span className="block text-[10px] text-[color:var(--ims-muted)]">
                {block.classroom?.classroomName ?? 'Branch-wide'}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Period</p>
            <p className="text-xs">
              {renderBlockPeriod(block.blockStartDate, block.blockEndDate)}
              <span className="block text-[10px] font-mono text-[color:var(--ims-muted)]">
                {block.isFullDay
                  ? 'All day'
                  : `${block.startTime} - ${block.endTime}`}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[11px] text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"
          onClick={() => router.push(`/scheduling/venues/${block.id}/edit`)}
        >
          <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit Block
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
            <MapPinned className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Venue Management
          </h1>
        </div>
        <Button
          onClick={() => router.push('/scheduling/venues/new')}
          className="h-10 w-10 shrink-0 gap-0 px-0 sm:w-auto sm:px-4"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only">New block</span>
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Blocks"
          value={kpis.total}
          description="Total active or cancelled restrictions"
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Active Blocks"
          value={kpis.active}
          description="Venue blocks currently in effect"
          icon={<Ban className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Cancelled Blocks"
          value={kpis.cancelled}
          description="Cancelled or inactive blocks"
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Branch Wide"
          value={kpis.branchWide}
          description="Blocks affecting an entire branch"
          icon={<Building2 className="h-5 w-5" />}
          tone="sky"
        />
      </div>

      {/* Search and Filters */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))]">
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
              placeholder="Search by branch, classroom or reason..."
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
            Branch
          </FormLabel>
          <Select
            value={searchParams.get('branchId') || ''}
            onChange={(e) =>
              updateParams({ branchId: e.target.value, page: '1' })
            }
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
            Classroom
          </FormLabel>
          <Select
            value={searchParams.get('classroomId') || ''}
            onChange={(e) =>
              updateParams({ classroomId: e.target.value, page: '1' })
            }
            options={[
              { value: '', label: 'All Classrooms' },
              ...classrooms.map((c) => ({
                value: c.id,
                label: c.classroomName,
              })),
            ]}
            className="h-12"
            placeholder="All Classrooms"
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
              { value: 'Active', label: 'Active' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>
      </div>

      {/* Venues Data */}
      <ResponsiveDataTable
        data={sortedBlocks}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(block) => block.id}
        emptyState={
          <EmptyState
            icon={<MapPinned className="h-6 w-6" />}
            title="No venue blocks found"
            description="No blocked venues match your current filter criteria."
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
