'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Edit2, Eye, GraduationCap, Plus, Search, X } from 'lucide-react';
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

interface ClassroomItem {
  id: string;
  classroomName: string;
  branchId: string;
  branchName: string;
  capacity: number;
  location: string | null;
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
  status: string;
}

interface ClassroomsClientListProps {
  classrooms: ClassroomItem[];
  branches: Array<{ id: string; name: string }>;
  hasBranches: boolean;
  initialSearch: string;
  initialStatus: string;
  initialBranchId: string;
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

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return collator.compare(a ?? '', b ?? '');
}

function getStatusVariant(status: string) {
  return status === 'Active' ? 'success' : 'muted';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().split('T')[0];
}

export function ClassroomsClientList({
  classrooms,
  branches,
  hasBranches,
  initialSearch,
  initialStatus,
  initialBranchId,
  initialSortBy,
  initialSortOrder,
  initialPage,
  initialLimit,
}: ClassroomsClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch);

  const currentSortBy = searchParams.get('sortBy') ?? initialSortBy ?? 'classroomName';
  const currentSortOrder = (searchParams.get('sortOrder') as SortOrder | null) ?? initialSortOrder;
  const currentStatus = searchParams.get('status') ?? initialStatus ?? '';
  const currentBranchId = searchParams.get('branchId') ?? initialBranchId ?? '';
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

  const filteredClassrooms = useMemo(() => {
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const status = searchParams.get('status') || '';
    const branchId = searchParams.get('branchId') || '';

    return classrooms
      .filter((room) => {
        if (status && room.status !== status) return false;
        if (branchId && room.branchId !== branchId) return false;

        if (!q) return true;

        return [room.classroomName, room.location, room.branchName].some((value) => value?.toLowerCase().includes(q));
      })
      .sort((left, right) => {
        const direction = currentSortOrder === 'asc' ? 1 : -1;

        switch (currentSortBy) {
          case 'capacity':
            return (left.capacity - right.capacity) * direction;
          case 'branchName':
            return compareText(left.branchName, right.branchName) * direction;
          case 'location':
            return compareText(left.location, right.location) * direction;
          case 'status':
            return compareText(left.status, right.status) * direction;
          case 'classroomName':
          default:
            return compareText(left.classroomName, right.classroomName) * direction;
        }
      });
  }, [currentSortBy, currentSortOrder, classrooms, searchParams]);

  const total = filteredClassrooms.length;
  const totalPages = Math.max(Math.ceil(total / currentLimit), 1);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedClassrooms = filteredClassrooms.slice((safePage - 1) * currentLimit, safePage * currentLimit);

  const columns = [
    {
      header: 'Classroom',
      sortable: true,
      sortDirection: currentSortBy === 'classroomName' ? currentSortOrder : null,
      onSort: () => handleSort('classroomName'),
      render: (room: ClassroomItem) => <span className="font-semibold text-slate-800">{room.classroomName}</span>,
    },
    {
      header: 'Branch',
      sortable: true,
      sortDirection: currentSortBy === 'branchName' ? currentSortOrder : null,
      onSort: () => handleSort('branchName'),
      render: (room: ClassroomItem) => <span className="text-sm text-slate-700">{room.branchName}</span>,
    },
    {
      header: 'Capacity',
      sortable: true,
      sortDirection: currentSortBy === 'capacity' ? currentSortOrder : null,
      onSort: () => handleSort('capacity'),
      render: (room: ClassroomItem) => <span className="font-mono text-sm text-slate-600">{room.capacity} seats</span>,
    },
    {
      header: 'Location',
      sortable: true,
      sortDirection: currentSortBy === 'location' ? currentSortOrder : null,
      onSort: () => handleSort('location'),
      render: (room: ClassroomItem) => <span className="text-sm text-slate-700">{room.location || '—'}</span>,
    },
    {
      header: 'Validity',
      render: (room: ClassroomItem) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          <div>Start: {formatDate(room.effectiveStartDate)}</div>
          <div className="text-[10px] text-slate-400">End: {room.effectiveEndDate ? formatDate(room.effectiveEndDate) : 'Indefinite'}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (room: ClassroomItem) => <Badge variant={getStatusVariant(room.status)}>{room.status}</Badge>,
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (room: ClassroomItem) => (
        <div className="flex items-center justify-end gap-2">
          <SimpleTooltip content="View Details" side="top">
            <Link href={`/organization/classrooms/${room.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          </SimpleTooltip>

          <SimpleTooltip content="Edit Classroom" side="top">
            <Link href={`/organization/classrooms/${room.id}/edit`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                <Edit2 className="h-4 w-4" />
              </Button>
            </Link>
          </SimpleTooltip>
        </div>
      ),
      headerClassName: 'text-right w-[120px]',
    },
  ];

  const renderCard = (room: ClassroomItem) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">{room.branchName}</p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">{room.classroomName}</p>
          </div>
          <Badge variant={getStatusVariant(room.status)}>{room.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Capacity</p>
            <p className="truncate">{room.capacity} seats</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Location</p>
            <p className="truncate">{room.location || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Start</p>
            <p className="truncate">{formatDate(room.effectiveStartDate)}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">End</p>
            <p className="truncate">{room.effectiveEndDate ? formatDate(room.effectiveEndDate) : 'Indefinite'}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <div className="flex w-full gap-2">
          <Link href={`/organization/classrooms/${room.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-[11px]">
              <Eye className="mr-1.5 h-3.5 w-3.5" /> View
            </Button>
          </Link>
          <Link href={`/organization/classrooms/${room.id}/edit`} className="flex-1">
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
            <GraduationCap className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Classrooms
          </h1>
          <p className="max-w-2xl text-sm text-[var(--ims-muted)]">
            Manage classrooms and physical spaces within branches.
          </p>
        </div>

        {hasBranches && (
          <Link href="/organization/classrooms/create" className="w-full sm:w-auto">
            <Button className="h-10 w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 sm:w-auto sm:px-4">
              <Plus className="h-4 w-4" />
              Add Classroom
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Search
          </FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search classrooms by name or location..."
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
            onChange={(event) => updateParams({ branchId: event.target.value, page: '1' })}
            options={[{ value: '', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
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
            onChange={(event) => updateParams({ status: event.target.value, page: '1' })}
            options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" />}
          title="No classrooms found"
          description={!hasBranches ? "You must create a branch before adding classrooms." : "No classrooms match the current search or filter criteria."}
        />
      ) : (
        <>
          <ResponsiveDataTable
            data={paginatedClassrooms}
            columns={columns}
            renderCard={renderCard}
            keyExtractor={(room) => room.id}
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
