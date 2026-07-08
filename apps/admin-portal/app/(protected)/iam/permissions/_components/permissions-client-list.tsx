'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  Key,
  KeyRound,
  Search,
  ShieldCheck,
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

type SortOrder = 'asc' | 'desc';
type SortField =
  | 'permissionCode'
  | 'moduleCode'
  | 'featureCode'
  | 'actionCode'
  | 'permissionType'
  | 'status';

type PermissionItem = {
  id: string;
  permissionCode: string;
  description: string | null;
  moduleCode: string;
  featureCode: string | null;
  actionCode: string | null;
  permissionType: string;
  status: string;
};

type PermissionsClientListProps = {
  permissions: PermissionItem[];
  initialSearch: string;
  initialModule: string;
  initialType: string;
  initialStatus: string;
  initialSortBy: string;
  initialSortOrder: SortOrder;
  initialPage: number;
  initialLimit: number;
};

const MODULE_OPTIONS = (permissions: PermissionItem[]) => {
  const modules = Array.from(new Set(permissions.map((p) => p.moduleCode)))
    .filter(Boolean)
    .sort();
  return modules.map((m) => ({ value: m, label: m }));
};

const TYPE_OPTIONS = (permissions: PermissionItem[]) => {
  const types = Array.from(new Set(permissions.map((p) => p.permissionType)))
    .filter(Boolean)
    .sort();
  return types.map((t) => ({ value: t, label: t }));
};

const STATUS_OPTIONS = (permissions: PermissionItem[]) => {
  const statuses = Array.from(new Set(permissions.map((p) => p.status)))
    .filter(Boolean)
    .sort();
  return statuses.map((s) => ({ value: s, label: s }));
};

const SORT_FIELDS = new Set<SortField>([
  'permissionCode',
  'moduleCode',
  'featureCode',
  'actionCode',
  'permissionType',
  'status',
]);

function getStatusVariant(status: string) {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Inactive':
    case 'Archived':
      return 'muted';
    default:
      return 'outline';
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

export function PermissionsClientList({
  permissions,
  initialSearch,
  initialModule,
  initialType,
  initialStatus,
  initialSortBy,
  initialSortOrder,
  initialPage,
  initialLimit,
}: PermissionsClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch);

  const moduleOptions = useMemo(
    () => MODULE_OPTIONS(permissions),
    [permissions],
  );
  const typeOptions = useMemo(() => TYPE_OPTIONS(permissions), [permissions]);
  const statusOptions = useMemo(
    () => STATUS_OPTIONS(permissions),
    [permissions],
  );

  const currentSortBy =
    (searchParams.get('sortBy') as SortField | null) ??
    (SORT_FIELDS.has(initialSortBy as SortField)
      ? (initialSortBy as SortField)
      : 'permissionCode');
  const currentSortOrder =
    (searchParams.get('sortOrder') as SortOrder | null) ?? initialSortOrder;
  const currentModule = searchParams.get('module') ?? initialModule ?? '';
  const currentType = searchParams.get('type') ?? initialType ?? '';
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

  const filteredPermissions = useMemo(() => {
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    return [...permissions]
      .filter((perm) => {
        if (currentModule && perm.moduleCode !== currentModule) {
          return false;
        }

        if (currentType && perm.permissionType !== currentType) {
          return false;
        }

        if (currentStatus && perm.status !== currentStatus) {
          return false;
        }

        if (!q) {
          return true;
        }

        return [
          perm.permissionCode,
          perm.description,
          perm.featureCode,
          perm.actionCode,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((left, right) => {
        const direction = currentSortOrder === 'asc' ? 1 : -1;

        if (!SORT_FIELDS.has(currentSortBy)) {
          return (
            compareNullableText(left.permissionCode, right.permissionCode) *
            direction
          );
        }

        switch (currentSortBy) {
          case 'permissionCode':
            return (
              compareNullableText(left.permissionCode, right.permissionCode) *
              direction
            );
          case 'moduleCode':
            return (
              compareNullableText(left.moduleCode, right.moduleCode) * direction
            );
          case 'featureCode':
            return (
              compareNullableText(left.featureCode, right.featureCode) *
              direction
            );
          case 'actionCode':
            return (
              compareNullableText(left.actionCode, right.actionCode) * direction
            );
          case 'permissionType':
            return (
              compareNullableText(left.permissionType, right.permissionType) *
              direction
            );
          case 'status':
            return compareNullableText(left.status, right.status) * direction;
          default:
            return (
              compareNullableText(left.permissionCode, right.permissionCode) *
              direction
            );
        }
      });
  }, [
    permissions,
    currentSortBy,
    currentSortOrder,
    currentModule,
    currentType,
    currentStatus,
    searchParams,
  ]);

  const total = filteredPermissions.length;
  const totalPages = Math.max(Math.ceil(total / currentLimit), 1);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPermissions = filteredPermissions.slice(
    (safePage - 1) * currentLimit,
    safePage * currentLimit,
  );

  const stats = {
    total: permissions.length,
    active: permissions.filter((perm) => perm.status === 'Active').length,
    modules: moduleOptions.length,
    types: typeOptions.length,
  };

  const columns = [
    {
      header: 'Permission Code',
      sortable: true,
      sortDirection:
        currentSortBy === 'permissionCode' ? currentSortOrder : null,
      onSort: () => handleSort('permissionCode'),
      render: (perm: PermissionItem) => (
        <div className="space-y-1">
          <Link
            href={`/iam/permissions/${perm.id}`}
            className="font-mono text-xs font-semibold text-[color:var(--ims-brand-600)] hover:underline"
          >
            {perm.permissionCode}
          </Link>
          {perm.description && (
            <div className="text-xs text-[color:var(--ims-muted)]">
              {perm.description}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Module',
      sortable: true,
      sortDirection: currentSortBy === 'moduleCode' ? currentSortOrder : null,
      onSort: () => handleSort('moduleCode'),
      render: (perm: PermissionItem) => (
        <span className="text-sm text-slate-700">{perm.moduleCode}</span>
      ),
      headerClassName: 'w-[140px]',
    },
    {
      header: 'Feature',
      sortable: true,
      sortDirection: currentSortBy === 'featureCode' ? currentSortOrder : null,
      onSort: () => handleSort('featureCode'),
      render: (perm: PermissionItem) => (
        <span className="text-sm text-slate-700">
          {perm.featureCode || '—'}
        </span>
      ),
      headerClassName: 'w-[140px]',
    },
    {
      header: 'Action',
      sortable: true,
      sortDirection: currentSortBy === 'actionCode' ? currentSortOrder : null,
      onSort: () => handleSort('actionCode'),
      render: (perm: PermissionItem) => (
        <span className="text-sm text-slate-700">{perm.actionCode || '—'}</span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Type',
      sortable: true,
      sortDirection:
        currentSortBy === 'permissionType' ? currentSortOrder : null,
      onSort: () => handleSort('permissionType'),
      render: (perm: PermissionItem) => (
        <span className="text-sm text-slate-700">{perm.permissionType}</span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (perm: PermissionItem) => (
        <Badge variant={getStatusVariant(perm.status)}>{perm.status}</Badge>
      ),
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (perm: PermissionItem) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/iam/permissions/${perm.id}`)}
          title="View permission"
        >
          <Eye className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
        </Button>
      ),
      headerClassName: 'w-[96px] text-right',
    },
  ];

  const renderCard = (perm: PermissionItem) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {perm.moduleCode}
            </p>
            <Link
              href={`/iam/permissions/${perm.id}`}
              className="font-mono text-sm font-semibold text-[color:var(--ims-brand-600)] hover:underline"
            >
              {perm.permissionCode}
            </Link>
          </div>
          <Badge variant={getStatusVariant(perm.status)}>{perm.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Feature</p>
            <p className="truncate">{perm.featureCode || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Action</p>
            <p className="truncate">{perm.actionCode || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Type</p>
            <p className="truncate">{perm.permissionType}</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">Description</p>
            <p className="truncate">
              {perm.description || 'No description provided'}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[11px]"
          onClick={() => router.push(`/iam/permissions/${perm.id}`)}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" /> View Details
        </Button>
      </CardFooter>
    </Card>
  );

  const hasVisibleFilters = Boolean(
    searchValue || currentModule || currentType || currentStatus,
  );

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <ShieldCheck className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Permissions
          </h1>
          <p className="mt-1 text-sm text-[var(--ims-muted)]">
            Manage system permissions, modules, and access controls.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Permissions"
          value={stats.total}
          description="System-wide permissions"
          icon={<Key className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Active"
          value={stats.active}
          description="Currently enabled"
          icon={<KeyRound className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Modules"
          value={stats.modules}
          description="Distinct modules"
          icon={<Users className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Types"
          value={stats.types}
          description="Permission categories"
          icon={<ShieldCheck className="h-5 w-5" />}
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
              placeholder="Search by code, feature, or description..."
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
            Module
          </FormLabel>
          <Select
            value={currentModule}
            onChange={(event) =>
              updateParams({ module: event.target.value, page: '1' })
            }
            options={[{ value: '', label: 'All Modules' }, ...moduleOptions]}
            className="h-12"
            placeholder="All Modules"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Type
          </FormLabel>
          <Select
            value={currentType}
            onChange={(event) =>
              updateParams({ type: event.target.value, page: '1' })
            }
            options={[{ value: '', label: 'All Types' }, ...typeOptions]}
            className="h-12"
            placeholder="All Types"
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
            options={[{ value: '', label: 'All Statuses' }, ...statusOptions]}
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
              { value: 'permissionCode', label: 'Permission Code' },
              { value: 'moduleCode', label: 'Module' },
              { value: 'featureCode', label: 'Feature' },
              { value: 'actionCode', label: 'Action' },
              { value: 'permissionType', label: 'Type' },
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
          {currentModule && <Badge variant="muted">Module</Badge>}
          {currentType && <Badge variant="muted">Type</Badge>}
          {currentStatus && <Badge variant="muted">Status</Badge>}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() =>
              updateParams({
                q: null,
                module: null,
                type: null,
                status: null,
                page: '1',
              })
            }
          >
            Clear all
          </Button>
        </div>
      )}

      <ResponsiveDataTable
        data={paginatedPermissions}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(perm) => perm.id}
        emptyState={
          <EmptyState
            icon={<KeyRound className="h-6 w-6" />}
            title="No permissions found"
            description="No permissions match the current search or filter criteria."
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
