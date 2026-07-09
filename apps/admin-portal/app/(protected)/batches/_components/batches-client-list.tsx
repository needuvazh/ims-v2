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
  Checkbox,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
  currentPage: number;
  canCreate: boolean;
  defaultSearch: string;
  defaultCourseId: string;
  defaultBranchId: string;
  defaultSortBy: string;
  defaultSortOrder: 'asc' | 'desc';
  group: string;
  showCompleted: boolean;
  showCancelled: boolean;
  showDraft: boolean;
  dateFrom: string;
  dateTo: string;
  tabCounts: {
    active: number;
    past: number;
    future: number;
    all: number;
  };
}

type SortOrder = 'asc' | 'desc';

export function BatchesClientList({
  batches,
  courses,
  branches,
  total,
  currentPage,
  canCreate,
  defaultSearch,
  defaultCourseId,
  defaultBranchId,
  defaultSortBy,
  defaultSortOrder,
  group,
  showCompleted,
  showCancelled,
  showDraft,
  dateFrom,
  dateTo,
  tabCounts,
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


      <Tabs
        value={group}
        onValueChange={(val) =>
          updateParams({
            group: val,
            page: '1',
            showCompleted: null,
            showCancelled: null,
            showDraft: null,
            dateFrom: null,
            dateTo: null,
          })
        }
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="active" className="gap-2">
            Active
            <Badge variant="outline" className="ml-1 px-1.5 py-0 bg-[color:var(--ims-accent-soft)]">
              {tabCounts.active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            Past
            <Badge variant="outline" className="ml-1 px-1.5 py-0 bg-[color:var(--ims-accent-soft)]">
              {tabCounts.past}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="future" className="gap-2">
            Future
            <Badge variant="outline" className="ml-1 px-1.5 py-0 bg-[color:var(--ims-accent-soft)]">
              {tabCounts.future}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="outline" className="ml-1 px-1.5 py-0 bg-[color:var(--ims-accent-soft)]">
              {tabCounts.all}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-5 space-y-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 sm:col-span-2">
            <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
              Search
            </FormLabel>
            <div className="relative">
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search batches by code, English name or Arabic name..."
                leftIcon={<Search className="h-4 w-4" />}
                className="h-11 pr-10"
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
              className="h-11"
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
              className="h-11"
              placeholder="All Branches"
            />
          </div>
        </div>

        {/* Tab specific filters */}
        {group === 'active' && (
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Status Filters:
            </span>
            <Checkbox
              label="Show Completed"
              checked={showCompleted}
              onChange={(e) =>
                updateParams({
                  showCompleted: e.target.checked ? 'true' : null,
                  page: '1',
                })
              }
            />
            <Checkbox
              label="Show Cancelled"
              checked={showCancelled}
              onChange={(e) =>
                updateParams({
                  showCancelled: e.target.checked ? 'true' : null,
                  page: '1',
                })
              }
            />
            <Checkbox
              label="Show Draft"
              checked={showDraft}
              onChange={(e) =>
                updateParams({
                  showDraft: e.target.checked ? 'true' : null,
                  page: '1',
                })
              }
            />
          </div>
        )}

        {(group === 'past' || group === 'future' || group === 'all') && (
          <div className="flex flex-col gap-4 pt-3 border-t border-slate-100 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1 max-w-2xl">
              <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Batch Dates Between
              </FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) =>
                    updateParams({
                      dateFrom: e.target.value || null,
                      page: '1',
                    })
                  }
                  className="h-11"
                />
                <span className="text-slate-400 text-sm">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) =>
                    updateParams({
                      dateTo: e.target.value || null,
                      page: '1',
                    })
                  }
                  className="h-11"
                />
                {(dateFrom || dateTo) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      updateParams({
                        dateFrom: null,
                        dateTo: null,
                        page: '1',
                      })
                    }
                    className="h-11 w-11 hover:bg-slate-100"
                    title="Clear dates filter"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center pb-2">
              <Checkbox
                label="Show Cancelled Batches"
                checked={showCancelled}
                onChange={(e) =>
                  updateParams({
                    showCancelled: e.target.checked ? 'true' : null,
                    page: '1',
                  })
                }
              />
            </div>
          </div>
        )}
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
