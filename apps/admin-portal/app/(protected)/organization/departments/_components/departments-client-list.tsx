'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Clock3,
  Eye,
  Edit2,
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
  SimpleTooltip,
  StatCard,
} from '@ims/shared-ui';

type SortOrder = 'asc' | 'desc';
type SortField =
  | 'departmentCode'
  | 'departmentName'
  | 'branchName'
  | 'headName'
  | 'effectiveStartDate'
  | 'status';

type DepartmentItem = {
  id: string;
  departmentCode: string;
  departmentName: string;
  branchId: string;
  departmentHeadId: string | null;
  status: string;
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
};

type BranchOption = { id: string; name: string };
type UserOption = { id: string; fullName: string };

type DepartmentsClientListProps = {
  departments: DepartmentItem[];
  branches: BranchOption[];
  users: UserOption[];
  initialSearch: string;
  initialStatus: string;
  initialBranchId: string;
  initialSortBy: string;
  initialSortOrder: SortOrder;
  initialPage: number;
  initialLimit: number;
};

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Archived', label: 'Archived' },
];

const SORT_FIELDS = new Set<SortField>([
  'departmentCode',
  'departmentName',
  'branchName',
  'headName',
  'effectiveStartDate',
  'status',
]);

function getStatusVariant(status: string) {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Draft':
      return 'outline';
    case 'Inactive':
    case 'Archived':
      return 'muted';
    default:
      return 'default';
  }
}

function compareNullableText(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  return new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  }).compare(left ?? '', right ?? '');
}

function formatDateForDisplay(date: string | null | undefined) {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

export function DepartmentsClientList({
  departments,
  branches,
  users,
  initialSearch,
  initialStatus,
  initialBranchId,
  initialSortBy,
  initialSortOrder,
  initialPage,
  initialLimit,
}: DepartmentsClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch);

  const branchById = useMemo(
    () => new Map(branches.map((b) => [b.id, b.name])),
    [branches],
  );
  const headById = useMemo(
    () => new Map(users.map((u) => [u.id, u.fullName])),
    [users],
  );
  const branchCount = branches.length;

  const currentSortBy =
    (searchParams.get('sortBy') as SortField | null) ??
    (SORT_FIELDS.has(initialSortBy as SortField)
      ? (initialSortBy as SortField)
      : 'departmentName');
  const currentSortOrder =
    (searchParams.get('sortOrder') as SortOrder | null) ?? initialSortOrder;
  const currentStatus = searchParams.get('status') ?? initialStatus ?? '';
  const currentBranchId = searchParams.get('branchId') ?? initialBranchId ?? '';
  const currentPage = Math.max(
    parseInt(searchParams.get('page') ?? String(initialPage), 10) || 1,
    1,
  );
  const currentLimit = Math.max(
    parseInt(searchParams.get('limit') ?? String(initialLimit), 10) ||
      initialLimit ||
      10,
    1,
  );

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

  const handleSort = (field: SortField) => {
    const nextOrder: SortOrder =
      currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const filteredDepartments = useMemo(() => {
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    return [...departments]
      .filter((dept) => {
        if (currentStatus && dept.status !== currentStatus) {
          return false;
        }

        if (currentBranchId && dept.branchId !== currentBranchId) {
          return false;
        }

        if (!q) {
          return true;
        }

        const branchName = branchById.get(dept.branchId) ?? '';
        const headName = dept.departmentHeadId
          ? (headById.get(dept.departmentHeadId) ?? '')
          : '';
        return [dept.departmentCode, dept.departmentName, branchName, headName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((left, right) => {
        const direction = currentSortOrder === 'asc' ? 1 : -1;

        if (!SORT_FIELDS.has(currentSortBy)) {
          return (
            compareNullableText(left.departmentName, right.departmentName) *
            direction
          );
        }

        const leftBranch = branchById.get(left.branchId) ?? '';
        const rightBranch = branchById.get(right.branchId) ?? '';
        const leftHead = left.departmentHeadId
          ? (headById.get(left.departmentHeadId) ?? '')
          : '';
        const rightHead = right.departmentHeadId
          ? (headById.get(right.departmentHeadId) ?? '')
          : '';

        switch (currentSortBy) {
          case 'departmentCode':
            return (
              compareNullableText(left.departmentCode, right.departmentCode) *
              direction
            );
          case 'departmentName':
            return (
              compareNullableText(left.departmentName, right.departmentName) *
              direction
            );
          case 'branchName':
            return compareNullableText(leftBranch, rightBranch) * direction;
          case 'headName':
            return compareNullableText(leftHead, rightHead) * direction;
          case 'effectiveStartDate':
            return (
              compareNullableText(
                left.effectiveStartDate,
                right.effectiveStartDate,
              ) * direction
            );
          case 'status':
            return compareNullableText(left.status, right.status) * direction;
          default:
            return (
              compareNullableText(left.departmentName, right.departmentName) *
              direction
            );
        }
      });
  }, [
    currentSortBy,
    currentSortOrder,
    currentStatus,
    currentBranchId,
    departments,
    branchById,
    headById,
    searchParams,
  ]);

  const total = filteredDepartments.length;
  const totalPages = Math.max(Math.ceil(total / currentLimit), 1);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDepartments = filteredDepartments.slice(
    (safePage - 1) * currentLimit,
    safePage * currentLimit,
  );

  const stats = {
    total: departments.length,
    active: departments.filter((dept) => dept.status === 'Active').length,
    draft: departments.filter((dept) => dept.status === 'Draft').length,
    inactive: departments.filter(
      (dept) => dept.status === 'Inactive' || dept.status === 'Archived',
    ).length,
  };

  const columns = [
    {
      header: 'Code',
      sortable: true,
      sortDirection:
        currentSortBy === 'departmentCode' ? currentSortOrder : null,
      onSort: () => handleSort('departmentCode'),
      render: (dept: DepartmentItem) => (
        <span className="font-mono text-xs font-semibold text-slate-600">
          {dept.departmentCode}
        </span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Department',
      sortable: true,
      sortDirection:
        currentSortBy === 'departmentName' ? currentSortOrder : null,
      onSort: () => handleSort('departmentName'),
      render: (dept: DepartmentItem) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-800">
            {dept.departmentName}
          </div>
          <div className="text-xs text-[color:var(--ims-muted)]">
            {branchById.get(dept.branchId) ?? '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Head',
      sortable: true,
      sortDirection: currentSortBy === 'headName' ? currentSortOrder : null,
      onSort: () => handleSort('headName'),
      render: (dept: DepartmentItem) => (
        <span className="text-sm text-slate-700">
          {dept.departmentHeadId
            ? (headById.get(dept.departmentHeadId) ?? '—')
            : '—'}
        </span>
      ),
    },
    {
      header: 'Dates',
      sortable: true,
      sortDirection:
        currentSortBy === 'effectiveStartDate' ? currentSortOrder : null,
      onSort: () => handleSort('effectiveStartDate'),
      render: (dept: DepartmentItem) => (
        <div className="text-xs">
          <div>
            Start: {formatDateForDisplay(dept.effectiveStartDate) || '—'}
          </div>
          <div className="text-[color:var(--ims-muted)]">
            End: {formatDateForDisplay(dept.effectiveEndDate) || 'Indefinite'}
          </div>
        </div>
      ),
      headerClassName: 'w-[180px]',
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (dept: DepartmentItem) => (
        <Badge variant={getStatusVariant(dept.status)}>{dept.status}</Badge>
      ),
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (dept: DepartmentItem) => (
        <div className="flex items-center justify-end gap-2">
          <SimpleTooltip content="View Details" side="top">
            <Link href={`/organization/departments/${dept.id}`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          </SimpleTooltip>
          <SimpleTooltip content="Edit Department" side="top">
            <Link href={`/organization/departments/${dept.id}/edit`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </Link>
          </SimpleTooltip>
        </div>
      ),
      headerClassName: 'w-[120px] text-right',
    },
  ];

  const renderCard = (dept: DepartmentItem) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {dept.departmentCode}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">
              {dept.departmentName}
            </p>
          </div>
          <Badge variant={getStatusVariant(dept.status)}>{dept.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <p className="truncate">{branchById.get(dept.branchId) ?? '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Head</p>
            <p className="truncate">
              {dept.departmentHeadId
                ? (headById.get(dept.departmentHeadId) ?? '—')
                : '—'}
            </p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Start</p>
            <p className="truncate">
              {formatDateForDisplay(dept.effectiveStartDate) || '—'}
            </p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">End</p>
            <p className="truncate">
              {formatDateForDisplay(dept.effectiveEndDate) || 'Indefinite'}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <div className="flex w-full gap-2">
          <Link
            href={`/organization/departments/${dept.id}`}
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full text-[11px]">
              <Eye className="mr-1.5 h-3.5 w-3.5" /> View
            </Button>
          </Link>
          <Link
            href={`/organization/departments/${dept.id}/edit`}
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full text-[11px]">
              <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );

  const hasVisibleFilters = Boolean(
    searchValue || currentStatus || currentBranchId,
  );

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <Layers className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Departments
          </h1>
          <p className="mt-1 text-sm text-[var(--ims-muted)]">
            Manage department structures within branches.
          </p>
        </div>
        {branches.length > 0 && (
          <Link href="/organization/departments/create">
            <Button className="h-10 w-10 shrink-0 gap-0 px-0 sm:w-auto sm:px-4">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">Add Department</span>
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Departments"
          value={stats.total}
          description="Visible in your scope"
          icon={<Layers className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Active"
          value={stats.active}
          description="Operational departments"
          icon={<Building2 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Draft"
          value={stats.draft}
          description="Pending configuration"
          icon={<Clock3 className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Inactive"
          value={stats.inactive}
          description="Archived or suspended"
          icon={<Users className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-6">
        <div className="min-w-0 xl:col-span-2">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Search
          </FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by department, code, branch, or head..."
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
            value={currentBranchId}
            onChange={(event) =>
              updateParams({ branchId: event.target.value, page: '1' })
            }
            options={[
              { value: '', label: 'All Branches' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
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
            onChange={(event) =>
              updateParams({ status: event.target.value, page: '1' })
            }
            options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>

        <div className="min-w-0 xl:col-span-1">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Sort
          </FormLabel>
          <Select
            value={currentSortBy}
            onChange={(event) =>
              updateParams({ sortBy: event.target.value, page: '1' })
            }
            options={[
              { value: 'departmentName', label: 'Department Name' },
              { value: 'departmentCode', label: 'Department Code' },
              { value: 'branchName', label: 'Branch' },
              { value: 'headName', label: 'Department Head' },
              { value: 'effectiveStartDate', label: 'Start Date' },
              { value: 'status', label: 'Status' },
            ]}
            className="h-12"
            placeholder="Sort by"
          />
        </div>

        <div className="min-w-0 xl:col-span-1">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Order
          </FormLabel>
          <Select
            value={currentSortOrder}
            onChange={(event) =>
              updateParams({ sortOrder: event.target.value, page: '1' })
            }
            options={[
              { value: 'asc', label: 'Ascending' },
              { value: 'desc', label: 'Descending' },
            ]}
            className="h-12"
            placeholder="Order"
          />
        </div>
      </div>

      {hasVisibleFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--ims-muted)]">
          <span className="font-semibold uppercase tracking-[0.18em]">
            Active filters
          </span>
          {searchValue && <Badge variant="muted">Search</Badge>}
          {currentBranchId && <Badge variant="muted">Branch</Badge>}
          {currentStatus && <Badge variant="muted">Status</Badge>}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() =>
              updateParams({ q: null, branchId: null, status: null, page: '1' })
            }
          >
            Clear all
          </Button>
        </div>
      )}

      <ResponsiveDataTable
        data={paginatedDepartments}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(dept) => dept.id}
        emptyState={
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title="No departments found"
            description={
              branchCount === 0
                ? 'You must create a branch before adding departments.'
                : 'No departments match the current search or filter criteria.'
            }
          />
        }
      />

      {totalPages > 1 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalCount={total}
          limit={currentLimit}
        />
      )}
    </div>
  );
}
