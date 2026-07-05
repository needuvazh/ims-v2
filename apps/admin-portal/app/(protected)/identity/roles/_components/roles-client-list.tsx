'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, Search, Shield as ShieldIcon, ShieldPlus, X } from 'lucide-react';
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
} from '@ims/shared-ui';

type SortOrder = 'asc' | 'desc';

interface RoleItem {
  id: string;
  roleCode: string;
  roleName: string;
  description: string | null;
  status: 'Active' | 'Archived';
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  permissionsCount: number;
}

interface RolesClientListProps {
  roles: RoleItem[];
  initialSearch: string;
  initialStatus: string;
  initialSortBy: string;
  initialSortOrder: SortOrder;
  initialPage: number;
  initialLimit: number;
}

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Archived', label: 'Archived' },
];

const SORT_FIELDS = new Set(['roleCode', 'roleName', 'effectiveStartDate', 'permissionsCount', 'status']);

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return collator.compare(a ?? '', b ?? '');
}

function getStatusVariant(status: RoleItem['status']) {
  return status === 'Active' ? 'success' : 'muted';
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Open ended';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Open ended';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function RolesClientList({
  roles,
  initialSearch,
  initialStatus,
  initialSortBy,
  initialSortOrder,
  initialPage,
  initialLimit,
}: RolesClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch);

  const currentSortBy = searchParams.get('sortBy') ?? initialSortBy ?? 'roleName';
  const currentSortOrder = (searchParams.get('sortOrder') as SortOrder | null) ?? initialSortOrder;
  const currentStatus = searchParams.get('status') ?? initialStatus ?? '';
  const currentPage = Math.max(parseInt(searchParams.get('page') ?? String(initialPage), 10) || 1, 1);
  const currentLimit = Math.max(parseInt(searchParams.get('limit') ?? String(initialLimit), 10) || initialLimit || 10, 1);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const nextSearch = searchParams.get('q') || '';
    setSearchValue((current) => (current === nextSearch ? current : nextSearch));
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
    const nextOrder: SortOrder = currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const filteredRoles = useMemo(() => {
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const status = searchParams.get('status') || '';

    return roles
      .filter((role) => {
        if (status && role.status !== status) {
          return false;
        }

        if (!q) {
          return true;
        }

        return [role.roleCode, role.roleName, role.description].some((value) => value?.toLowerCase().includes(q));
      })
      .sort((left, right) => {
        const direction = currentSortOrder === 'asc' ? 1 : -1;

        if (!SORT_FIELDS.has(currentSortBy)) {
          return compareText(left.roleName, right.roleName) * direction;
        }

        switch (currentSortBy) {
          case 'roleCode':
            return compareText(left.roleCode, right.roleCode) * direction;
          case 'effectiveStartDate':
            return (new Date(left.effectiveStartDate).getTime() - new Date(right.effectiveStartDate).getTime()) * direction;
          case 'permissionsCount':
            return (left.permissionsCount - right.permissionsCount) * direction;
          case 'status':
            return compareText(left.status, right.status) * direction;
          case 'roleName':
          default:
            return compareText(left.roleName, right.roleName) * direction;
        }
      });
  }, [currentSortBy, currentSortOrder, roles, searchParams]);

  const total = filteredRoles.length;
  const totalPages = Math.max(Math.ceil(total / currentLimit), 1);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRoles = filteredRoles.slice((safePage - 1) * currentLimit, safePage * currentLimit);

  const columns = [
    {
      header: 'Code',
      sortable: true,
      sortDirection: currentSortBy === 'roleCode' ? currentSortOrder : null,
      onSort: () => handleSort('roleCode'),
      render: (role: RoleItem) => <span className="font-mono text-xs font-semibold text-slate-600">{role.roleCode}</span>,
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Role',
      sortable: true,
      sortDirection: currentSortBy === 'roleName' ? currentSortOrder : null,
      onSort: () => handleSort('roleName'),
      render: (role: RoleItem) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-800">{role.roleName}</div>
          <div className="line-clamp-1 text-xs text-[color:var(--ims-muted)]">{role.description || 'No description provided'}</div>
        </div>
      ),
    },
    {
      header: 'Validity',
      sortable: true,
      sortDirection: currentSortBy === 'effectiveStartDate' ? currentSortOrder : null,
      onSort: () => handleSort('effectiveStartDate'),
      render: (role: RoleItem) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          <div>Start: {formatDate(role.effectiveStartDate)}</div>
          <div className="text-[10px] text-slate-400">End: {formatDate(role.effectiveEndDate)}</div>
        </div>
      ),
    },
    {
      header: 'Permissions',
      sortable: true,
      sortDirection: currentSortBy === 'permissionsCount' ? currentSortOrder : null,
      onSort: () => handleSort('permissionsCount'),
      render: (role: RoleItem) => <Badge variant="default">{role.permissionsCount}</Badge>,
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (role: RoleItem) => <Badge variant={getStatusVariant(role.status)}>{role.status}</Badge>,
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (role: RoleItem) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/iam/roles/${role.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
      headerClassName: 'text-right w-[110px]',
    },
  ];

  const renderCard = (role: RoleItem) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">{role.roleCode}</p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">{role.roleName}</p>
          </div>
          <Badge variant={getStatusVariant(role.status)}>{role.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Validity</p>
            <p className="truncate">{formatDate(role.effectiveStartDate)}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Permissions</p>
            <p className="truncate">{role.permissionsCount}</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">Description</p>
            <p className="line-clamp-2 text-slate-600">{role.description || 'No description provided'}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <Link href={`/iam/roles/${role.id}`} className="w-full">
          <Button variant="outline" size="sm" className="w-full text-[11px]">
            <Eye className="mr-1.5 h-3.5 w-3.5" /> View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-page-title font-bold tracking-tight text-[var(--ims-ink)]">
            <ShieldIcon className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            IAM Roles
          </h1>
          <p className="max-w-2xl text-sm text-[var(--ims-muted)]">
            Manage access roles, validity windows, and assigned permissions.
          </p>
        </div>

        <Link href="/iam/roles/create" className="w-full sm:w-auto">
          <Button className="h-10 w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 sm:w-auto sm:px-4">
            <ShieldPlus className="h-4 w-4" />
            Add Role
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Search
          </FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search roles by name, code, or description..."
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
            onChange={(event) => updateParams({ status: event.target.value, page: '1' })}
            options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<ShieldIcon className="h-6 w-6" />}
          title="No roles found"
          description="No roles match the current search or filter criteria."
        />
      ) : (
        <>
          <ResponsiveDataTable
            data={paginatedRoles}
            columns={columns}
            renderCard={renderCard}
            keyExtractor={(role) => role.id}
            emptyState={null}
          />

          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalCount={total}
            limit={currentLimit}
          />
        </>
      )}
    </div>
  );
}
