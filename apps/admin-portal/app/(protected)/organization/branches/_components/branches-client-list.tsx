'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Clock3,
  Eye,
  Edit2,
  MapPin,
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
  | 'branchCode'
  | 'branchName'
  | 'managerName'
  | 'city'
  | 'country'
  | 'effectiveStartDate'
  | 'status';

type BranchItem = {
  id: string;
  branchCode: string;
  branchName: string;
  branchManagerId: string | null;
  city: string | null;
  country: string | null;
  status: string;
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
};

type UserOption = { id: string; fullName: string };
type InstituteOption = { id: string; name: string };

type BranchesClientListProps = {
  branches: BranchItem[];
  users: UserOption[];
  institutes: InstituteOption[];
  initialSearch: string;
  initialStatus: string;
  initialSortBy: string;
  initialSortOrder: SortOrder;
  initialPage: number;
  initialLimit: number;
};

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Configured', label: 'Configured' },
  { value: 'Active', label: 'Active' },
  { value: 'UnderMaintenance', label: 'Under Maintenance' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Archived', label: 'Archived' },
];

const SORT_FIELDS = new Set<SortField>([
  'branchCode',
  'branchName',
  'managerName',
  'city',
  'country',
  'effectiveStartDate',
  'status',
]);

function getStatusVariant(status: string) {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Draft':
    case 'Configured':
      return 'outline';
    case 'UnderMaintenance':
      return 'warning';
    case 'Suspended':
    case 'Closed':
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

export function BranchesClientList({
  branches,
  users,
  institutes,
  initialSearch,
  initialStatus,
  initialSortBy,
  initialSortOrder,
  initialPage,
  initialLimit,
}: BranchesClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch);

  const managerById = useMemo(
    () => new Map(users.map((user) => [user.id, user.fullName])),
    [users],
  );
  const instituteCount = institutes.length;

  const currentSortBy =
    (searchParams.get('sortBy') as SortField | null) ??
    (SORT_FIELDS.has(initialSortBy as SortField)
      ? (initialSortBy as SortField)
      : 'branchName');
  const currentSortOrder =
    (searchParams.get('sortOrder') as SortOrder | null) ?? initialSortOrder;
  const currentStatus = searchParams.get('status') ?? initialStatus ?? '';
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

  const filteredBranches = useMemo(() => {
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    return [...branches]
      .filter((branch) => {
        if (currentStatus && branch.status !== currentStatus) {
          return false;
        }

        if (!q) {
          return true;
        }

        const managerName = branch.branchManagerId
          ? (managerById.get(branch.branchManagerId) ?? '')
          : '';
        return [
          branch.branchCode,
          branch.branchName,
          branch.city,
          branch.country,
          managerName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((left, right) => {
        const direction = currentSortOrder === 'asc' ? 1 : -1;

        if (!SORT_FIELDS.has(currentSortBy)) {
          return (
            compareNullableText(left.branchName, right.branchName) * direction
          );
        }

        const leftManager = left.branchManagerId
          ? (managerById.get(left.branchManagerId) ?? '')
          : '';
        const rightManager = right.branchManagerId
          ? (managerById.get(right.branchManagerId) ?? '')
          : '';

        switch (currentSortBy) {
          case 'branchCode':
            return (
              compareNullableText(left.branchCode, right.branchCode) * direction
            );
          case 'branchName':
            return (
              compareNullableText(left.branchName, right.branchName) * direction
            );
          case 'managerName':
            return compareNullableText(leftManager, rightManager) * direction;
          case 'city':
            return compareNullableText(left.city, right.city) * direction;
          case 'country':
            return compareNullableText(left.country, right.country) * direction;
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
              compareNullableText(left.branchName, right.branchName) * direction
            );
        }
      });
  }, [
    branches,
    currentSortBy,
    currentSortOrder,
    currentStatus,
    managerById,
    searchParams,
  ]);

  const total = filteredBranches.length;
  const totalPages = Math.max(Math.ceil(total / currentLimit), 1);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBranches = filteredBranches.slice(
    (safePage - 1) * currentLimit,
    safePage * currentLimit,
  );

  const stats = {
    total: branches.length,
    active: branches.filter((branch) => branch.status === 'Active').length,
    configured: branches.filter((branch) => branch.status === 'Configured')
      .length,
    suspended: branches.filter((branch) => branch.status === 'Suspended')
      .length,
  };

  const columns = [
    {
      header: 'Code',
      sortable: true,
      sortDirection: currentSortBy === 'branchCode' ? currentSortOrder : null,
      onSort: () => handleSort('branchCode'),
      render: (branch: BranchItem) => (
        <span className="font-mono text-xs font-semibold text-slate-600">
          {branch.branchCode}
        </span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Branch',
      sortable: true,
      sortDirection: currentSortBy === 'branchName' ? currentSortOrder : null,
      onSort: () => handleSort('branchName'),
      render: (branch: BranchItem) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-800">
            {branch.branchName}
          </div>
          <div className="text-xs text-[color:var(--ims-muted)]">
            {branch.city
              ? `${branch.city}, ${branch.country || '—'}`
              : branch.country || '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Manager',
      sortable: true,
      sortDirection: currentSortBy === 'managerName' ? currentSortOrder : null,
      onSort: () => handleSort('managerName'),
      render: (branch: BranchItem) => (
        <span className="text-sm text-slate-700">
          {branch.branchManagerId
            ? (managerById.get(branch.branchManagerId) ?? '—')
            : '—'}
        </span>
      ),
    },
    {
      header: 'Location',
      sortable: true,
      sortDirection: currentSortBy === 'city' ? currentSortOrder : null,
      onSort: () => handleSort('city'),
      render: (branch: BranchItem) => (
        <span className="text-sm text-slate-700">{branch.city || '—'}</span>
      ),
    },
    {
      header: 'Dates',
      sortable: true,
      sortDirection:
        currentSortBy === 'effectiveStartDate' ? currentSortOrder : null,
      onSort: () => handleSort('effectiveStartDate'),
      render: (branch: BranchItem) => (
        <div className="text-xs">
          <div>
            Start: {formatDateForDisplay(branch.effectiveStartDate) || '—'}
          </div>
          <div className="text-[color:var(--ims-muted)]">
            End: {formatDateForDisplay(branch.effectiveEndDate) || 'Indefinite'}
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
      render: (branch: BranchItem) => (
        <Badge variant={getStatusVariant(branch.status)}>{branch.status}</Badge>
      ),
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (branch: BranchItem) => (
        <div className="flex items-center justify-end gap-2">
          <SimpleTooltip content="View Details" side="top">
            <Link href={`/organization/branches/${branch.id}`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          </SimpleTooltip>
          <SimpleTooltip content="Edit Branch" side="top">
            <Link href={`/organization/branches/${branch.id}/edit`}>
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

  const renderCard = (branch: BranchItem) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {branch.branchCode}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">
              {branch.branchName}
            </p>
          </div>
          <Badge variant={getStatusVariant(branch.status)}>
            {branch.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Manager</p>
            <p className="truncate">
              {branch.branchManagerId
                ? (managerById.get(branch.branchManagerId) ?? '—')
                : '—'}
            </p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">City</p>
            <p className="truncate">{branch.city ?? '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Country</p>
            <p className="truncate">{branch.country ?? '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Start</p>
            <p className="truncate">
              {formatDateForDisplay(branch.effectiveStartDate) || '—'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">End</p>
            <p className="truncate">
              {formatDateForDisplay(branch.effectiveEndDate) || 'Indefinite'}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <div className="flex w-full gap-2">
          <Link href={`/organization/branches/${branch.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-[11px]">
              <Eye className="mr-1.5 h-3.5 w-3.5" /> View
            </Button>
          </Link>
          <Link
            href={`/organization/branches/${branch.id}/edit`}
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

  const hasVisibleFilters = Boolean(searchValue || currentStatus);

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <Building2 className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Branches
          </h1>
          <p className="mt-1 text-sm text-[var(--ims-muted)]">
            Manage branch records, managers, and effective dates.
          </p>
        </div>
        {institutes.length > 0 && (
          <Link href="/organization/branches/create">
            <Button className="h-10 w-10 shrink-0 gap-0 px-0 sm:w-auto sm:px-4">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">Add Branch</span>
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Branches"
          value={stats.total}
          description="Visible in your scope"
          icon={<Building2 className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Active"
          value={stats.active}
          description="Operational branches"
          icon={<MapPin className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Configured"
          value={stats.configured}
          description="Ready for use"
          icon={<Users className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Suspended"
          value={stats.suspended}
          description="Needs attention"
          icon={<Clock3 className="h-5 w-5" />}
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
              placeholder="Search by branch, code, city, or manager..."
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

        <div className="min-w-0 xl:col-span-1">
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
              { value: 'branchName', label: 'Branch Name' },
              { value: 'branchCode', label: 'Branch Code' },
              { value: 'managerName', label: 'Manager' },
              { value: 'city', label: 'City' },
              { value: 'country', label: 'Country' },
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
          {currentStatus && <Badge variant="muted">Status</Badge>}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => updateParams({ q: null, status: null, page: '1' })}
          >
            Clear all
          </Button>
        </div>
      )}

      <ResponsiveDataTable
        data={paginatedBranches}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(branch) => branch.id}
        emptyState={
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No branches found"
            description={
              instituteCount === 0
                ? 'You must create an institute before adding branches.'
                : 'No branches match the current search or filter criteria.'
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
