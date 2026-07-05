'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge, Button, Card, CardContent, CardFooter, CardHeader, EmptyState, FormLabel, Input, Pagination, ResponsiveDataTable, Select } from '@ims/shared-ui';
import { Eye, GraduationCap, Search, Users, X } from 'lucide-react';
import Link from 'next/link';

type SortOrder = 'asc' | 'desc';

interface StudentItem {
  id: string;
  studentNumber: string;
  status: string;
  branch?: {
    id: string;
    branchName: string;
    branchCode?: string | null;
  } | null;
  person: {
    firstName: string;
    lastName: string;
    mobile?: string | null;
    email?: string | null;
  };
  admissions?: Array<{ id: string; admissionNumber: string; admissionStatus: string }>;
  enrollments?: Array<{ id: string; enrollmentStatus: string; course: { nameEnglish: string } }>;
}

interface StudentsClientListProps {
  students: StudentItem[];
  branches: Array<{ id: string; name: string; code?: string | null }>;
  total: number;
  currentPage: number;
  canReadAdmissions: boolean;
  defaultSearch: string;
  defaultStatus: string;
  defaultBranchId: string;
  defaultAdmissionStatus: string;
  defaultSortBy: string;
  defaultSortOrder: SortOrder;
}

export function StudentsClientList({
  students,
  branches,
  total,
  currentPage,
  canReadAdmissions,
  defaultSearch,
  defaultStatus,
  defaultBranchId,
  defaultAdmissionStatus,
  defaultSortBy,
  defaultSortOrder,
}: StudentsClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  const [searchValue, setSearchValue] = useState(defaultSearch);

  const currentSortBy = searchParams.get('sortBy') ?? defaultSortBy ?? 'joinedAt';
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

  const activeCount = students.filter((student) => student.status === 'Active').length;

  const columns = [
    {
      header: 'Student ID',
      sortable: true,
      sortDirection: currentSortBy === 'studentNumber' ? currentSortOrder : null,
      onSort: () => handleSort('studentNumber'),
      render: (s: StudentItem) => <span className="font-mono text-xs font-bold text-slate-600">{s.studentNumber}</span>,
    },
    {
      header: 'Full Name',
      sortable: true,
      sortDirection: currentSortBy === 'fullName' ? currentSortOrder : null,
      onSort: () => handleSort('fullName'),
      render: (s: StudentItem) => <div className="font-bold text-slate-800">{s.person.firstName} {s.person.lastName}</div>,
    },
    {
      header: 'Contact',
      render: (s: StudentItem) => (
        <div className="space-y-0.5 text-xs text-slate-500">
          <div>{s.person.mobile || 'N/A'}</div>
          <div className="text-[10px] text-slate-400">{s.person.email || 'N/A'}</div>
        </div>
      ),
    },
    {
      header: 'Branch',
      sortable: true,
      sortDirection: currentSortBy === 'branch' ? currentSortOrder : null,
      onSort: () => handleSort('branch'),
      render: (s: StudentItem) => s.branch ? `${s.branch.branchName}${s.branch.branchCode ? ` (${s.branch.branchCode})` : ''}` : 'N/A',
    },
    {
      header: 'Admissions',
      render: (s: StudentItem) => (
        <div className="space-y-1">
          {s.admissions?.map((adm) => (
            <div key={adm.id} className="flex items-center gap-1.5">
              <Badge variant={adm.admissionStatus === 'Approved' ? 'success' : 'outline'} className="px-1.5 py-0 text-[10px]">
                {adm.admissionStatus}
              </Badge>
              <Link href={`/admissions/${adm.id}`} className="font-mono text-[11px] text-[var(--ims-primary)] hover:underline">
                {adm.admissionNumber}
              </Link>
            </div>
          )) || <span className="text-xs text-slate-400">None</span>}
        </div>
      ),
    },
    {
      header: 'Courses',
      render: (s: StudentItem) => {
        const active = s.enrollments?.filter((e) => ['Confirmed', 'Active'].includes(e.enrollmentStatus)) || [];
        return (
          <div className="max-w-[200px] space-y-1">
            {active.length === 0 ? <span className="text-xs text-slate-400">No active course</span> : active.map((enr) => (
              <div key={enr.id} className="flex items-center gap-1 truncate text-xs">
                <GraduationCap className="h-3 w-3 shrink-0 text-slate-400" />
                <Link href={`/enrollments/${enr.id}`} className="truncate text-[var(--ims-primary)] hover:underline">
                  {enr.course.nameEnglish}
                </Link>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (s: StudentItem) => <Badge variant={s.status === 'Active' ? 'success' : 'outline'}>{s.status}</Badge>,
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (s: StudentItem) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/students/${s.id}`}>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Eye className="h-3 w-3" /> Profile
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const renderCard = (s: StudentItem) => {
    const active = s.enrollments?.filter((e) => ['Confirmed', 'Active'].includes(e.enrollmentStatus)) || [];

    return (
      <Card className="transition-colors hover:border-[var(--ims-brass)]">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">{s.studentNumber}</p>
              <p className="text-sm font-bold text-[var(--ims-ink)]">{s.person.firstName} {s.person.lastName}</p>
            </div>
            <Badge variant={s.status === 'Active' ? 'success' : 'outline'}>{s.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-card-p">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="font-semibold text-[var(--ims-muted)]">Contact</p>
              <p>{s.person.mobile || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
              <p className="truncate text-[var(--ims-brass)] font-medium">{s.branch ? `${s.branch.branchName}${s.branch.branchCode ? ` (${s.branch.branchCode})` : ''}` : 'N/A'}</p>
            </div>
            <div className="col-span-2 space-y-1">
              <p className="font-semibold text-[var(--ims-muted)]">Active Course</p>
              <p className="truncate font-medium text-[var(--ims-brass)]">{active[0]?.course.nameEnglish || 'None'}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 p-card-p pt-0">
          <Link href={`/students/${s.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-[11px]">
              <Eye className="mr-1.5 h-3.5 w-3.5" /> View Profile
            </Button>
          </Link>
          {canReadAdmissions && s.admissions?.[0] && (
            <Link href={`/admissions/${s.admissions[0].id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-[11px]">Admissions</Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))]">
        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Search</FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search students by name, number, email..."
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
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Branch</FormLabel>
          <Select
            value={defaultBranchId}
            onChange={(e) => updateParams({ branchId: e.target.value, page: '1' })}
            options={[
              { value: '', label: 'All Branches' },
              ...branches.map((b) => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name })),
            ]}
            className="h-12"
            placeholder="All Branches"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Student Status</FormLabel>
          <Select
            value={defaultStatus}
            onChange={(e) => updateParams({ status: e.target.value, page: '1' })}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Suspended', label: 'Suspended' },
              { value: 'Archived', label: 'Archived' },
            ]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Admission Status</FormLabel>
          <Select
            value={defaultAdmissionStatus}
            onChange={(e) => updateParams({ admissionStatus: e.target.value, page: '1' })}
            options={[
              { value: '', label: 'All Admissions' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Submitted', label: 'Submitted' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Rejected', label: 'Rejected' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
            className="h-12"
            placeholder="All Admissions"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase">
          <Users className="h-4 w-4 text-[color:var(--ims-primary)]" /> Student Records ({total})
        </h3>
      </div>

      <ResponsiveDataTable
        data={students}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(s) => s.id}
        emptyState={
          <EmptyState
            icon={<Users className="h-8 w-8 text-slate-300 stroke-[1.5]" />}
            title="No students found"
            description="No students found matching your current filter criteria."
          />
        }
      />

      {totalPages > 1 && <Pagination page={currentPage} totalPages={totalPages} totalCount={total} limit={limit} />}
    </div>
  );
}
