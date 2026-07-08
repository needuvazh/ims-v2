'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, Eye, Edit2, Plus, Search, X } from 'lucide-react';
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
} from '@ims/shared-ui';

type SortOrder = 'asc' | 'desc';

interface InstituteItem {
  id: string;
  instituteCode: string;
  instituteName: string;
  registrationNumber: string | null;
  taxNumber: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  website: string | null;
  country: string | null;
  status: 'Draft' | 'Active' | 'Inactive' | 'Archived';
}

interface InstitutesClientListProps {
  institutes: InstituteItem[];
  initialSearch: string;
  initialStatus: string;
  initialSortBy: string;
  initialSortOrder: SortOrder;
  initialPage: number;
  initialLimit: number;
}

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Archived', label: 'Archived' },
];

const SORT_FIELDS = new Set([
  'instituteCode',
  'instituteName',
  'registrationNumber',
  'primaryEmail',
  'country',
  'status',
]);

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function compareNullableText(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  return collator.compare(a ?? '', b ?? '');
}

function getStatusVariant(status: InstituteItem['status']) {
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

export function InstitutesClientList({
  institutes,
  initialSearch,
  initialStatus,
  initialSortBy,
  initialSortOrder,
  initialPage,
  initialLimit,
}: InstitutesClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch);

  const currentSortBy =
    searchParams.get('sortBy') ?? initialSortBy ?? 'instituteName';
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

  const handleSort = (field: string) => {
    const nextOrder: SortOrder =
      currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const filteredInstitutes = useMemo(() => {
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const status = searchParams.get('status') || '';

    return institutes
      .filter((institute) => {
        if (status && institute.status !== status) {
          return false;
        }

        if (!q) {
          return true;
        }

        return [
          institute.instituteCode,
          institute.instituteName,
          institute.registrationNumber,
          institute.taxNumber,
          institute.primaryEmail,
          institute.primaryPhone,
          institute.country,
        ].some((value) => value?.toLowerCase().includes(q));
      })
      .sort((left, right) => {
        const direction = currentSortOrder === 'asc' ? 1 : -1;

        if (!SORT_FIELDS.has(currentSortBy)) {
          return (
            compareNullableText(left.instituteName, right.instituteName) *
            direction
          );
        }

        switch (currentSortBy) {
          case 'instituteCode':
            return (
              compareNullableText(left.instituteCode, right.instituteCode) *
              direction
            );
          case 'registrationNumber':
            return (
              compareNullableText(
                left.registrationNumber,
                right.registrationNumber,
              ) * direction
            );
          case 'primaryEmail':
            return (
              compareNullableText(left.primaryEmail, right.primaryEmail) *
              direction
            );
          case 'country':
            return compareNullableText(left.country, right.country) * direction;
          case 'status':
            return compareNullableText(left.status, right.status) * direction;
          case 'instituteName':
          default:
            return (
              compareNullableText(left.instituteName, right.instituteName) *
              direction
            );
        }
      });
  }, [currentSortBy, currentSortOrder, institutes, searchParams]);

  const total = filteredInstitutes.length;
  const totalPages = Math.max(Math.ceil(total / currentLimit), 1);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedInstitutes = filteredInstitutes.slice(
    (safePage - 1) * currentLimit,
    safePage * currentLimit,
  );

  const columns = [
    {
      header: 'Code',
      sortable: true,
      sortDirection:
        currentSortBy === 'instituteCode' ? currentSortOrder : null,
      onSort: () => handleSort('instituteCode'),
      render: (inst: InstituteItem) => (
        <span className="font-mono text-xs font-semibold text-slate-600">
          {inst.instituteCode}
        </span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Institute',
      sortable: true,
      sortDirection:
        currentSortBy === 'instituteName' ? currentSortOrder : null,
      onSort: () => handleSort('instituteName'),
      render: (inst: InstituteItem) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-800">
            {inst.instituteName}
          </div>
          <div className="text-xs text-[color:var(--ims-muted)]">
            {inst.website || 'No website listed'}
          </div>
        </div>
      ),
    },
    {
      header: 'Registration / Tax No',
      sortable: true,
      sortDirection:
        currentSortBy === 'registrationNumber' ? currentSortOrder : null,
      onSort: () => handleSort('registrationNumber'),
      render: (inst: InstituteItem) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          <div>Reg: {inst.registrationNumber || '—'}</div>
          <div className="text-[10px] text-slate-400">
            Tax: {inst.taxNumber || '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Email / Phone',
      sortable: true,
      sortDirection: currentSortBy === 'primaryEmail' ? currentSortOrder : null,
      onSort: () => handleSort('primaryEmail'),
      render: (inst: InstituteItem) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          <div className="truncate">{inst.primaryEmail || '—'}</div>
          <div className="text-[10px] text-slate-400">
            {inst.primaryPhone || '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Country',
      sortable: true,
      sortDirection: currentSortBy === 'country' ? currentSortOrder : null,
      onSort: () => handleSort('country'),
      render: (inst: InstituteItem) => (
        <span className="text-sm text-slate-700">{inst.country || '—'}</span>
      ),
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (inst: InstituteItem) => (
        <Badge variant={getStatusVariant(inst.status)}>{inst.status}</Badge>
      ),
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (inst: InstituteItem) => (
        <div className="flex items-center justify-end gap-2">
          <SimpleTooltip content="View Details" side="top">
            <Link href={`/organization/institutes/${inst.id}`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          </SimpleTooltip>

          <SimpleTooltip content="Edit Institute" side="top">
            <Link href={`/organization/institutes/${inst.id}/edit`}>
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
      headerClassName: 'text-right w-[120px]',
    },
  ];

  const renderCard = (inst: InstituteItem) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {inst.instituteCode}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">
              {inst.instituteName}
            </p>
          </div>
          <Badge variant={getStatusVariant(inst.status)}>{inst.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">
              Registration
            </p>
            <p className="truncate">{inst.registrationNumber || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Tax No</p>
            <p className="truncate">{inst.taxNumber || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Email</p>
            <p className="truncate">{inst.primaryEmail || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Phone</p>
            <p className="truncate">{inst.primaryPhone || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">Country</p>
            <p className="truncate">{inst.country || '—'}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <div className="flex w-full gap-2">
          <Link href={`/organization/institutes/${inst.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-[11px]">
              <Eye className="mr-1.5 h-3.5 w-3.5" /> View
            </Button>
          </Link>
          <Link
            href={`/organization/institutes/${inst.id}/edit`}
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

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-page-title font-bold tracking-tight text-[var(--ims-ink)]">
            <Building2 className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Institutes
          </h1>
          <p className="max-w-2xl text-sm text-[var(--ims-muted)]">
            Manage institute records, status, and contact details.
          </p>
        </div>

        <Link
          href="/organization/institutes/create"
          className="w-full sm:w-auto"
        >
          <Button className="h-10 w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 sm:w-auto sm:px-4">
            <Plus className="h-4 w-4" />
            Add Institute
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
              placeholder="Search institutes by name, code, email, or phone..."
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
            options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No institutes found"
          description="No institutes match the current search or filter criteria."
        />
      ) : (
        <>
          <ResponsiveDataTable
            data={paginatedInstitutes}
            columns={columns}
            renderCard={renderCard}
            keyExtractor={(inst) => inst.id}
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
