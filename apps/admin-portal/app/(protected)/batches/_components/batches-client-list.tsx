'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Layers,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  EmptyState,
  FormLabel,
  Input,
  Pagination,
  ResponsiveDataTable,
  Select,
  StatCard,
} from '@ims/shared-ui';

interface BatchListItem {
  id: string;
  branchId: string;
  batchCode: string;
  batchNameEnglish: string;
  batchNameArabic: string;
  startDate: string;
  endDate: string;
  capacity: number;
  currentEnrollmentCount: number;
  status: string;
  course: {
    nameEnglish: string;
  };
}

interface CourseOption {
  id: string;
  nameEnglish: string;
}

interface BranchOption {
  id: string;
  branchName: string;
}

interface BatchesClientListProps {
  batches: BatchListItem[];
  courses: CourseOption[];
  branches: BranchOption[];
  total: number;
  kpis: {
    total: number;
    open: number;
    inProgress: number;
    cancelled: number;
  };
  currentPage: number;
  canCreate: boolean;
  defaultSearch: string;
  defaultCourseId: string;
  defaultBranchId: string;
  defaultStatus: string;
  defaultSortBy: string;
  defaultSortOrder: 'asc' | 'desc';
}

type SortOrder = 'asc' | 'desc';

export function BatchesClientList({
  batches,
  courses,
  branches,
  total,
  kpis,
  currentPage,
  canCreate,
  defaultSearch,
  defaultCourseId,
  defaultBranchId,
  defaultStatus,
  defaultSortBy,
  defaultSortOrder,
}: BatchesClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / 10);

  const currentSortBy =
    searchParams.get('sortBy') ?? defaultSortBy ?? 'startDate';
  const currentSortOrder =
    (searchParams.get('sortOrder') as SortOrder | null) ?? defaultSortOrder;

  const [searchValue, setSearchValue] = useState(defaultSearch);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'OpenForEnrollment':
        return <Badge variant="success">Open</Badge>;
      case 'InProgress':
        return <Badge variant="info">In Progress</Badge>;
      case 'Completed':
        return <Badge variant="default">Completed</Badge>;
      case 'Cancelled':
        return <Badge variant="error">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBranchName = (branchId: string) =>
    branches.find((branch) => branch.id === branchId)?.branchName ||
    'Unknown Branch';

  const requestedCourseId = searchParams.get('courseId') || '';
  const requestedBranchId = searchParams.get('branchId') || '';
  const requestedStatus = searchParams.get('status') || '';

  const currentCourseId = courses.some(
    (course) => course.id === requestedCourseId,
  )
    ? requestedCourseId
    : courses.some((course) => course.id === defaultCourseId)
      ? defaultCourseId
      : '';
  const currentBranchId = branches.some(
    (branch) => branch.id === requestedBranchId,
  )
    ? requestedBranchId
    : branches.some((branch) => branch.id === defaultBranchId)
      ? defaultBranchId
      : '';
  const statusOptions = [
    'Draft',
    'OpenForEnrollment',
    'InProgress',
    'Completed',
    'Cancelled',
  ];
  const currentStatus = statusOptions.includes(requestedStatus)
    ? requestedStatus
    : statusOptions.includes(defaultStatus)
      ? defaultStatus
      : '';

  const columns = [
    {
      header: 'Batch #',
      sortable: true,
      sortDirection: currentSortBy === 'batchCode' ? currentSortOrder : null,
      onSort: () => handleSort('batchCode'),
      render: (batch: BatchListItem) => (
        <span className="font-mono font-medium text-slate-800">
          {batch.batchCode}
        </span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Batch Name',
      sortable: true,
      sortDirection:
        currentSortBy === 'batchNameEnglish' ? currentSortOrder : null,
      onSort: () => handleSort('batchNameEnglish'),
      render: (batch: BatchListItem) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-800">
            {batch.batchNameEnglish}
          </div>
          <div
            className="text-xs text-[var(--ims-muted)] font-arabic text-right"
            dir="rtl"
          >
            {batch.batchNameArabic}
          </div>
        </div>
      ),
    },
    {
      header: 'Course',
      sortable: true,
      sortDirection: currentSortBy === 'courseName' ? currentSortOrder : null,
      onSort: () => handleSort('courseName'),
      render: (batch: BatchListItem) => (
        <span className="text-[color:var(--ims-muted)]">
          {batch.course?.nameEnglish || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Branch',
      render: (batch: BatchListItem) => (
        <span className="text-[color:var(--ims-muted)]">
          {getBranchName(batch.branchId)}
        </span>
      ),
    },
    {
      header: 'Dates',
      sortable: true,
      sortDirection: currentSortBy === 'startDate' ? currentSortOrder : null,
      onSort: () => handleSort('startDate'),
      render: (batch: BatchListItem) => (
        <span className="text-xs text-[color:var(--ims-muted)]">
          {new Date(batch.startDate).toLocaleDateString()} -{' '}
          {new Date(batch.endDate).toLocaleDateString()}
        </span>
      ),
      headerClassName: 'w-[180px]',
    },
    {
      header: 'Enrolled / Cap',
      sortable: true,
      sortDirection:
        currentSortBy === 'currentEnrollmentCount' ? currentSortOrder : null,
      onSort: () => handleSort('currentEnrollmentCount'),
      render: (batch: BatchListItem) => (
        <span className="text-[color:var(--ims-muted)]">
          {batch.currentEnrollmentCount} / {batch.capacity}
        </span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Status',
      className: 'text-center',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (batch: BatchListItem) => getStatusBadge(batch.status),
      headerClassName: 'w-[120px] text-center',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (batch: BatchListItem) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/batches/${batch.id}`)}
          title="Manage Batch"
        >
          <ArrowRight className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
        </Button>
      ),
      headerClassName: 'w-[100px] text-right',
    },
  ];

  const renderCard = (batch: BatchListItem) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {batch.batchCode}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">
              {batch.batchNameEnglish}
            </p>
          </div>
          {getStatusBadge(batch.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Course</p>
            <p className="truncate">{batch.course?.nameEnglish || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <p className="truncate">{getBranchName(batch.branchId)}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Arabic Name</p>
            <p className="truncate text-right font-arabic" dir="rtl">
              {batch.batchNameArabic}
            </p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Dates</p>
            <p className="truncate">
              {new Date(batch.startDate).toLocaleDateString()} -{' '}
              {new Date(batch.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">
              Enrolled / Capacity
            </p>
            <p className="truncate">
              {batch.currentEnrollmentCount} / {batch.capacity}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[11px]"
          onClick={() => router.push(`/batches/${batch.id}`)}
        >
          <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> Manage Batch
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-page-title font-bold tracking-tight text-[var(--ims-ink)]">
            <Layers className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Batches
          </h1>
          <p className="max-w-2xl text-sm text-[var(--ims-muted)]">
            Manage course scheduling, classroom allocations, and trainer
            assignments.
          </p>
        </div>

        {canCreate && (
          <Button
            onClick={() => router.push('/batches/new')}
            className="h-10 w-full gap-1.5 sm:w-auto sm:px-4"
          >
            <Plus className="h-4 w-4" />
            Create Batch
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Batches"
          value={kpis.total}
          description="Schedules configured globally or in branch"
          icon={<Layers className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Open for Enrollment"
          value={kpis.open}
          description="Batches accepting new registrations"
          icon={<Users className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="In Progress"
          value={kpis.inProgress}
          description="Active learning sessions currently running"
          icon={<Calendar className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          title="Cancelled / Suspended"
          value={kpis.cancelled}
          description="Batches cancelled, suspended or in draft"
          icon={<AlertCircle className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 sm:col-span-2 xl:col-span-1">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Search
          </FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search batches by code, English name or Arabic name..."
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
            Course
          </FormLabel>
          <Select
            value={currentCourseId}
            onChange={(e) =>
              updateParams({ courseId: e.target.value, page: '1' })
            }
            options={[
              { value: '', label: 'All Courses' },
              ...courses.map((course) => ({
                value: course.id,
                label: course.nameEnglish,
              })),
            ]}
            className="h-12"
            placeholder="All Courses"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Branch
          </FormLabel>
          <Select
            value={currentBranchId}
            onChange={(e) =>
              updateParams({ branchId: e.target.value, page: '1' })
            }
            options={[
              { value: '', label: 'All Branches' },
              ...branches.map((branch) => ({
                value: branch.id,
                label: branch.branchName,
              })),
            ]}
            className="h-12"
            placeholder="All Branches"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Status
          </FormLabel>
          <Select
            value={currentStatus}
            onChange={(e) =>
              updateParams({ status: e.target.value, page: '1' })
            }
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Draft', label: 'Draft' },
              { value: 'OpenForEnrollment', label: 'Open' },
              { value: 'InProgress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>
      </div>

      <ResponsiveDataTable
        data={batches}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(batch) => batch.id}
        emptyState={
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title="No batches found"
            description="No batches match your current filter criteria."
          />
        }
      />

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
