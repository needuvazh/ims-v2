'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge, Button, Card, CardContent, EmptyState, FormLabel, Input, Pagination, ResponsiveDataTable, Select } from '@ims/shared-ui';
import { ArrowRight, Building2, Search, UserRound, X } from 'lucide-react';

type SortOrder = 'asc' | 'desc';

interface TrainerItem {
  id: string;
  trainerCode: string;
  trainerType: string;
  specialization: string;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
  person?: {
    firstName: string;
    lastName: string;
    mobile?: string | null;
    email?: string | null;
  } | null;
  branch?: {
    id: string;
    branchName: string;
    branchCode?: string | null;
  } | null;
}

interface TrainersClientListProps {
  trainers: TrainerItem[];
  branches: Array<{ id: string; name: string; code?: string | null }>;
  total: number;
  currentPage: number;
  limit: number;
  defaultSearch: string;
  defaultBranchId: string;
  defaultStatus: string;
  defaultTrainerType: string;
  defaultSpecialization: string;
  defaultSortBy: string;
  defaultSortOrder: SortOrder;
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function TrainersClientList({
  trainers,
  branches,
  total,
  currentPage,
  limit,
  defaultSearch,
  defaultBranchId,
  defaultStatus,
  defaultTrainerType,
  defaultSpecialization,
  defaultSortBy,
  defaultSortOrder,
}: TrainersClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / limit);

  const [searchValue, setSearchValue] = useState(defaultSearch);

  const currentSortBy = searchParams.get('sortBy') ?? defaultSortBy ?? 'createdAt';
  const currentSortOrder = (searchParams.get('sortOrder') as SortOrder | null) ?? defaultSortOrder;

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
    if (searchValue === currentSearch) return;

    const timeout = setTimeout(() => {
      updateParams({ q: searchValue || null, page: '1' });
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchParams, searchValue, updateParams]);

  const handleSort = (field: string) => {
    const nextOrder: SortOrder = currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const branchOptions = useMemo(
    () => [
      { value: '', label: 'All branches' },
      ...branches.map((branch) => ({
        value: branch.id,
        label: `${branch.name}${branch.code ? ` (${branch.code})` : ''}`,
      })),
    ],
    [branches],
  );

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' },
  ];

  const trainerTypeOptions = [
    { value: '', label: 'All types' },
    { value: 'FullTime', label: 'Full time' },
    { value: 'PartTime', label: 'Part time' },
    { value: 'Freelance', label: 'Freelance' },
  ];

  const columns = [
    {
      header: 'Trainer code',
      sortable: true,
      sortDirection: currentSortBy === 'trainerCode' ? currentSortOrder : null,
      onSort: () => handleSort('trainerCode'),
      render: (trainer: TrainerItem) => <span className="font-mono text-xs font-semibold tracking-[0.18em] text-[color:var(--ims-muted)]">{trainer.trainerCode}</span>,
    },
    {
      header: 'Trainer',
      sortable: true,
      sortDirection: currentSortBy === 'fullName' ? currentSortOrder : null,
      onSort: () => handleSort('fullName'),
      render: (trainer: TrainerItem) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-[color:var(--ims-ink)]">
            {trainer.person?.firstName ?? 'Unnamed'} {trainer.person?.lastName ?? 'trainer'}
          </div>
          <div className="text-xs text-[color:var(--ims-muted)]">
            {trainer.person?.mobile || 'N/A'} · {trainer.person?.email || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      header: 'Branch',
      sortable: true,
      sortDirection: currentSortBy === 'branchName' ? currentSortOrder : null,
      onSort: () => handleSort('branchName'),
      render: (trainer: TrainerItem) => (
        <div className="space-y-0.5">
          <div className="font-medium text-[color:var(--ims-ink)]">{trainer.branch?.branchName ?? 'N/A'}</div>
          <div className="text-xs text-[color:var(--ims-muted)]">{trainer.branch?.branchCode ?? trainer.branch?.id ?? trainer.branch?.branchName ?? 'N/A'}</div>
        </div>
      ),
    },
    {
      header: 'Specialization',
      sortable: true,
      sortDirection: currentSortBy === 'specialization' ? currentSortOrder : null,
      onSort: () => handleSort('specialization'),
      render: (trainer: TrainerItem) => trainer.specialization,
    },
    {
      header: 'Type',
      sortable: true,
      sortDirection: currentSortBy === 'trainerType' ? currentSortOrder : null,
      onSort: () => handleSort('trainerType'),
      render: (trainer: TrainerItem) => <Badge variant="outline">{trainer.trainerType}</Badge>,
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (trainer: TrainerItem) => (
        <Badge
          variant={
            trainer.status === 'Active'
              ? 'success'
              : trainer.status === 'Suspended'
                ? 'warning'
                : 'muted'
          }
        >
          {trainer.status}
        </Badge>
      ),
    },
    {
      header: 'Created',
      sortable: true,
      sortDirection: currentSortBy === 'createdAt' ? currentSortOrder : null,
      onSort: () => handleSort('createdAt'),
      render: (trainer: TrainerItem) => <span className="whitespace-nowrap text-xs text-[color:var(--ims-muted)]">{formatDate(trainer.createdAt)}</span>,
    },
    {
      header: 'Actions',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (trainer: TrainerItem) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/faculty/trainers/${trainer.id}`}
            className="inline-flex h-8 items-center justify-center rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-3 text-xs font-semibold text-[color:var(--ims-ink)] transition hover:border-[color:var(--ims-brass)] hover:text-[color:var(--ims-brass)]"
          >
            View
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>
      ),
    },
  ];

  const renderCard = (trainer: TrainerItem) => (
    <Card className="transition-colors hover:border-[color:var(--ims-brass)]">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[color:var(--ims-muted)]">{trainer.trainerCode}</p>
            <p className="text-sm font-bold text-[color:var(--ims-ink)]">
              {trainer.person?.firstName ?? 'Unnamed'} {trainer.person?.lastName ?? 'trainer'}
            </p>
          </div>
          <Badge
            variant={
              trainer.status === 'Active'
                ? 'success'
                : trainer.status === 'Suspended'
                  ? 'warning'
                  : 'muted'
            }
          >
            {trainer.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-[color:var(--ims-muted)]">Branch</p>
            <p className="truncate text-[color:var(--ims-ink)]">{trainer.branch?.branchName ?? 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[color:var(--ims-muted)]">Type</p>
            <p className="truncate text-[color:var(--ims-ink)]">{trainer.trainerType}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[color:var(--ims-muted)]">Specialization</p>
            <p className="truncate text-[color:var(--ims-ink)]">{trainer.specialization}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[color:var(--ims-muted)]">Created</p>
            <p className="truncate text-[color:var(--ims-ink)]">{formatDate(trainer.createdAt)}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[color:var(--ims-muted)]">Contact</p>
            <p className="truncate text-[color:var(--ims-ink)]">{trainer.person?.mobile || 'N/A'} · {trainer.person?.email || 'N/A'}</p>
          </div>
        </div>

        <Link
          href={`/faculty/trainers/${trainer.id}`}
          className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] text-sm font-semibold text-[color:var(--ims-ink)] transition hover:border-[color:var(--ims-brass)] hover:text-[color:var(--ims-brass)]"
        >
          View profile
        </Link>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <Card className="border-[color:var(--ims-border)] bg-white/75 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
            <div className="min-w-0 xl:col-span-2">
              <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Search</FormLabel>
              <div className="relative">
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search trainers by name, code, email, or phone"
                  leftIcon={<Search className="h-4 w-4" />}
                  className="h-12 pr-10"
                />
                {searchValue ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchValue('');
                      updateParams({ q: null, page: '1' });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[color:var(--ims-muted)] transition hover:bg-[color:var(--ims-accent-soft)] hover:text-[color:var(--ims-ink)]"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <Select
              label="Branch"
              placeholder="All branches"
              value={searchParams.get('branchId') ?? defaultBranchId}
              onValueChange={(value) => updateParams({ branchId: value || null, page: '1' })}
              options={branchOptions}
            />

            <Select
              label="Status"
              placeholder="All statuses"
              value={searchParams.get('status') ?? defaultStatus}
              onValueChange={(value) => updateParams({ status: value || null, page: '1' })}
              options={statusOptions}
            />

            <Select
              label="Type"
              placeholder="All types"
              value={searchParams.get('trainerType') ?? defaultTrainerType}
              onValueChange={(value) => updateParams({ trainerType: value || null, page: '1' })}
              options={trainerTypeOptions}
            />

            <div className="min-w-0">
              <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Specialization</FormLabel>
              <Input
                value={searchParams.get('specialization') ?? defaultSpecialization}
                onChange={(event) => updateParams({ specialization: event.target.value || null, page: '1' })}
                placeholder="Narrow by specialization"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[color:var(--ims-muted)]">
              Showing {total} trainer{total === 1 ? '' : 's'} across the current branch scope.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateParams({
                  q: null,
                  branchId: null,
                  status: null,
                  trainerType: null,
                  specialization: null,
                  page: '1',
                })}
              >
                Clear filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {trainers.length === 0 ? (
        <EmptyState
          title="No trainers found"
          description="Try widening your search, changing the branch, or clearing the filters."
          icon={<UserRound className="h-6 w-6" />}
        />
      ) : (
        <ResponsiveDataTable
          data={trainers}
          columns={columns}
          renderCard={renderCard}
          keyExtractor={(trainer) => trainer.id}
          breakpoint="lg"
        />
      )}

      {totalPages > 1 ? (
        <Pagination page={currentPage} totalPages={totalPages} totalCount={total} limit={limit} />
      ) : null}
    </div>
  );
}
