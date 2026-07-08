'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clock3, History, Search, ShieldCheck, Users, X } from 'lucide-react';
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

type SortOrder = 'asc' | 'desc';
type SortField =
  | 'createdAt'
  | 'attemptedEmail'
  | 'status'
  | 'failureReason'
  | 'browser'
  | 'ipAddress'
  | 'branchId';

type LoginHistoryRow = {
  id: string;
  createdAt: string;
  attemptedEmail: string;
  status: string;
  failureReason: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  ipAddress: string | null;
  branchId: string | null;
  userId: string | null;
};

type LoginHistoryClientListProps = {
  rows: LoginHistoryRow[];
  userNotFound: boolean;
  initialSearch: string;
  initialStatus: string;
  initialSortBy: string;
  initialSortOrder: SortOrder;
  initialPage: number;
  initialLimit: number;
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Success', label: 'Success' },
  { value: 'Failure', label: 'Failure' },
];

const SORT_FIELDS = new Set<SortField>([
  'createdAt',
  'attemptedEmail',
  'status',
  'failureReason',
  'browser',
  'ipAddress',
  'branchId',
]);

function getStatusVariant(status: string) {
  switch (status) {
    case 'Success':
      return 'success';
    case 'Failure':
      return 'error';
    default:
      return 'muted';
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

function getBrowserString(
  browser: string | null,
  os: string | null,
  device: string | null,
) {
  return [browser, os, device].filter(Boolean).join(' / ') || '—';
}

export function LoginHistoryClientList({
  rows,
  userNotFound,
  initialSearch,
  initialStatus,
  initialSortBy,
  initialSortOrder,
  initialPage,
  initialLimit,
}: LoginHistoryClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch);

  const currentSortBy =
    (searchParams.get('sortBy') as SortField | null) ??
    (SORT_FIELDS.has(initialSortBy as SortField)
      ? (initialSortBy as SortField)
      : 'createdAt');
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
      20,
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

  const filteredRows = useMemo(() => {
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    return [...rows]
      .filter((row) => {
        if (currentStatus && row.status !== currentStatus) {
          return false;
        }

        if (!q) {
          return true;
        }

        return [
          row.attemptedEmail,
          row.failureReason,
          row.browser,
          row.os,
          row.device,
          row.ipAddress,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((left, right) => {
        const direction = currentSortOrder === 'asc' ? 1 : -1;

        if (!SORT_FIELDS.has(currentSortBy)) {
          return (
            compareNullableText(left.createdAt, right.createdAt) * direction
          );
        }

        switch (currentSortBy) {
          case 'createdAt':
            return (
              compareNullableText(left.createdAt, right.createdAt) * direction
            );
          case 'attemptedEmail':
            return (
              compareNullableText(left.attemptedEmail, right.attemptedEmail) *
              direction
            );
          case 'status':
            return compareNullableText(left.status, right.status) * direction;
          case 'failureReason':
            return (
              compareNullableText(left.failureReason, right.failureReason) *
              direction
            );
          case 'browser':
            return (
              compareNullableText(
                getBrowserString(left.browser, left.os, left.device),
                getBrowserString(right.browser, right.os, right.device),
              ) * direction
            );
          case 'ipAddress':
            return (
              compareNullableText(left.ipAddress, right.ipAddress) * direction
            );
          case 'branchId':
            return (
              compareNullableText(left.branchId, right.branchId) * direction
            );
          default:
            return (
              compareNullableText(left.createdAt, right.createdAt) * direction
            );
        }
      });
  }, [rows, currentSortBy, currentSortOrder, currentStatus, searchParams]);

  const displayTotal = filteredRows.length;
  const totalPages = Math.max(Math.ceil(displayTotal / currentLimit), 1);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice(
    (safePage - 1) * currentLimit,
    safePage * currentLimit,
  );

  const stats = {
    total: rows.length,
    success: rows.filter((row) => row.status === 'Success').length,
    failure: rows.filter((row) => row.status === 'Failure').length,
  };

  const columns = [
    {
      header: 'Time',
      sortable: true,
      sortDirection: currentSortBy === 'createdAt' ? currentSortOrder : null,
      onSort: () => handleSort('createdAt'),
      render: (row: LoginHistoryRow) => (
        <span className="text-xs text-[color:var(--ims-muted)]">
          {new Date(row.createdAt).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      ),
      headerClassName: 'w-[170px]',
    },
    {
      header: 'Email',
      sortable: true,
      sortDirection:
        currentSortBy === 'attemptedEmail' ? currentSortOrder : null,
      onSort: () => handleSort('attemptedEmail'),
      render: (row: LoginHistoryRow) => (
        <span className="font-medium text-slate-800">{row.attemptedEmail}</span>
      ),
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (row: LoginHistoryRow) => (
        <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
      ),
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Reason',
      sortable: true,
      sortDirection:
        currentSortBy === 'failureReason' ? currentSortOrder : null,
      onSort: () => handleSort('failureReason'),
      render: (row: LoginHistoryRow) => (
        <span className="text-sm text-[color:var(--ims-muted)]">
          {row.failureReason ?? '—'}
        </span>
      ),
    },
    {
      header: 'Browser',
      sortable: true,
      sortDirection: currentSortBy === 'browser' ? currentSortOrder : null,
      onSort: () => handleSort('browser'),
      render: (row: LoginHistoryRow) => (
        <span className="text-sm text-[color:var(--ims-muted)]">
          {getBrowserString(row.browser, row.os, row.device)}
        </span>
      ),
    },
    {
      header: 'IP',
      sortable: true,
      sortDirection: currentSortBy === 'ipAddress' ? currentSortOrder : null,
      onSort: () => handleSort('ipAddress'),
      render: (row: LoginHistoryRow) => (
        <span className="text-sm text-[color:var(--ims-muted)]">
          {row.ipAddress ?? '—'}
        </span>
      ),
      headerClassName: 'w-[130px]',
    },
    {
      header: 'Branch',
      sortable: true,
      sortDirection: currentSortBy === 'branchId' ? currentSortOrder : null,
      onSort: () => handleSort('branchId'),
      render: (row: LoginHistoryRow) => (
        <span className="text-sm text-[color:var(--ims-muted)]">
          {row.branchId ?? '—'}
        </span>
      ),
      headerClassName: 'w-[130px]',
    },
    {
      header: 'Open',
      className: 'text-right',
      render: (row: LoginHistoryRow) =>
        row.userId ? (
          <Link
            href={`/iam/users/${row.userId}`}
            className="font-semibold text-[color:var(--ims-brass)] hover:underline"
          >
            User
          </Link>
        ) : (
          '—'
        ),
      headerClassName: 'text-right w-[100px]',
    },
  ];

  const renderCard = (row: LoginHistoryRow) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {new Date(row.createdAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">
              {row.attemptedEmail}
            </p>
          </div>
          <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">Reason</p>
            <p className="truncate">{row.failureReason ?? '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">Browser</p>
            <p className="truncate">
              {getBrowserString(row.browser, row.os, row.device)}
            </p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">IP</p>
            <p className="truncate">{row.ipAddress ?? '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <p className="truncate">{row.branchId ?? '—'}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        {row.userId ? (
          <Link
            href={`/iam/users/${row.userId}`}
            className="text-sm font-semibold text-[color:var(--ims-brass)] hover:underline"
          >
            Open user
          </Link>
        ) : (
          <span className="text-sm text-[color:var(--ims-muted)]">—</span>
        )}
      </CardFooter>
    </Card>
  );

  const hasVisibleFilters = Boolean(searchValue || currentStatus);

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <History className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Login History
          </h1>
          <p className="mt-1 text-sm text-[var(--ims-muted)]">
            Track authentication attempts and security events.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Attempts"
          value={stats.total}
          description="Visible login events"
          icon={<History className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Successful"
          value={stats.success}
          description="Authenticated sessions"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Failed"
          value={stats.failure}
          description="Blocked attempts"
          icon={<Clock3 className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          title="Unique Users"
          value={new Set(rows.map((r) => r.userId).filter(Boolean)).size}
          description="Distinct accounts"
          icon={<Users className="h-5 w-5" />}
          tone="amber"
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
              placeholder="Search by email, reason, browser, or IP..."
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
            Status
          </FormLabel>
          <Select
            value={currentStatus}
            onChange={(event) =>
              updateParams({ status: event.target.value, page: '1' })
            }
            options={STATUS_OPTIONS}
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
              { value: 'createdAt', label: 'Time' },
              { value: 'attemptedEmail', label: 'Email' },
              { value: 'status', label: 'Status' },
              { value: 'failureReason', label: 'Reason' },
              { value: 'browser', label: 'Browser' },
              { value: 'ipAddress', label: 'IP' },
              { value: 'branchId', label: 'Branch' },
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

      {userNotFound ? (
        <EmptyState
          icon={<History className="h-6 w-6" />}
          title="User not found"
          description="The specified user ID or email does not exist."
        />
      ) : (
        <>
          <ResponsiveDataTable
            data={paginatedRows}
            columns={columns}
            renderCard={renderCard}
            keyExtractor={(row) => row.id}
            emptyState={
              <EmptyState
                icon={<History className="h-6 w-6" />}
                title="No login events found"
                description="No login history matches the current search or filter criteria."
              />
            }
          />

          {totalPages > 1 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalCount={displayTotal}
              limit={currentLimit}
            />
          )}
        </>
      )}
    </div>
  );
}
