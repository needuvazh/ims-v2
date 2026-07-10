'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { GraduationCap, ArrowRight, Search, X } from 'lucide-react';
import {
  ResponsiveDataTable,
  Badge,
  Button,
  LinkButton,
  EmptyState,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
  CardFooter,
  FormLabel,
  Input,
  Select,
  Pagination,
} from '@ims/shared-ui';

interface CompletionListItem {
  id: string;
  completionStatus: string;
  attendancePercentage: number | null;
  enrollment: {
    enrollmentNumber: string;
    studentProfile: {
      person: {
        firstName: string;
        lastName: string;
      };
    };
    course: {
      nameEnglish: string;
    };
  };
}

interface CompletionsClientListProps {
  completions: CompletionListItem[];
  courses: { id: string; nameEnglish: string }[];
  batches: { id: string; batchNameEnglish: string; courseId: string }[];
  total: number;
  currentPage: number;
  defaultSearch: string;
  defaultCourseId: string;
  defaultBatchId: string;
  defaultStatus: string;
}

export function CompletionsClientList({
  completions,
  courses,
  batches,
  total,
  currentPage,
  defaultSearch,
  defaultCourseId,
  defaultBatchId,
  defaultStatus,
}: CompletionsClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / 20); // 20 limit per page

  const [searchValue, setSearchValue] = useState(defaultSearch);

  // Filter batches based on selected courseId
  const filteredBatches = defaultCourseId
    ? batches.filter((b) => b.courseId === defaultCourseId)
    : [];

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
  }, [searchValue, searchParams, updateParams]);

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      'success' | 'info' | 'warning' | 'error' | 'outline' | 'muted'
    > = {
      Approved: 'success',
      AwaitingTrainerRecommendation: 'info',
      AwaitingCoordinatorReview: 'warning',
      AwaitingFinalApproval: 'warning',
      Rejected: 'error',
      EvidenceIncomplete: 'outline',
      Pending: 'muted',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.replace(/([A-Z])/g, ' $1').trim()}
      </Badge>
    );
  };

  const columns = [
    {
      header: 'Student Name',
      render: (item: CompletionListItem) => (
        <span className="font-semibold text-[color:var(--ims-ink)]">
          {item.enrollment.studentProfile?.person?.firstName}{' '}
          {item.enrollment.studentProfile?.person?.lastName}
        </span>
      ),
    },
    {
      header: 'Enrollment #',
      render: (item: CompletionListItem) => (
        <span className="font-mono text-xs text-[color:var(--ims-muted)]">
          {item.enrollment.enrollmentNumber}
        </span>
      ),
      headerClassName: 'w-[140px]',
    },
    {
      header: 'Course',
      render: (item: CompletionListItem) => item.enrollment.course.nameEnglish,
    },
    {
      header: 'Attendance %',
      render: (item: CompletionListItem) => (
        <span className="font-medium text-slate-700">
          {item.attendancePercentage !== null
            ? `${item.attendancePercentage}%`
            : '-'}
        </span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Completion Status',
      render: (item: CompletionListItem) => getStatusBadge(item.completionStatus),
      headerClassName: 'w-[200px]',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (item: CompletionListItem) => (
        <div className="inline-flex items-center justify-end gap-2">
          <LinkButton
            href={`/exam-completion/completions/${item.id}`}
            size="sm"
            variant="outline"
            className="gap-1"
          >
            View Details
            <ArrowRight className="h-3.5 w-3.5" />
          </LinkButton>
        </div>
      ),
      headerClassName: 'text-right w-[140px]',
    },
  ];

  const renderCard = (item: CompletionListItem) => (
    <Card className="transition-colors hover:border-[color:var(--ims-brass)] bg-white">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold text-[color:var(--ims-ink)] text-ellipsis overflow-hidden whitespace-nowrap max-w-[160px]">
              {item.enrollment.studentProfile?.person?.firstName}{' '}
              {item.enrollment.studentProfile?.person?.lastName}
            </p>
            <p className="text-xs text-[color:var(--ims-muted)]">
              {item.enrollment.enrollmentNumber}
            </p>
          </div>
          {getStatusBadge(item.completionStatus)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="font-semibold text-[color:var(--ims-muted)]">
              Course
            </p>
            <p className="mt-0.5 text-slate-800 truncate">
              {item.enrollment.course.nameEnglish}
            </p>
          </div>
          <div>
            <p className="font-semibold text-[color:var(--ims-muted)]">
              Attendance
            </p>
            <p className="mt-0.5 font-medium text-slate-800">
              {item.attendancePercentage !== null
                ? `${item.attendancePercentage}%`
                : '-'}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <LinkButton
          href={`/exam-completion/completions/${item.id}`}
          size="sm"
          variant="outline"
          className="w-full justify-center gap-1"
        >
          View Detailed Checklist
          <ArrowRight className="h-3.5 w-3.5" />
        </LinkButton>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Filtering Card Block */}
      <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-5 space-y-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 sm:col-span-2">
            <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
              Search Student
            </FormLabel>
            <div className="relative">
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search by student name or enrollment number..."
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
              value={defaultCourseId}
              onChange={(e) =>
                updateParams({ courseId: e.target.value || null, page: '1', batchId: null })
              }
              options={[
                { value: '', label: 'All Courses' },
                ...courses.map((c) => ({
                  value: c.id,
                  label: c.nameEnglish,
                })),
              ]}
              className="h-11"
              placeholder="All Courses"
            />
          </div>

          <div className="min-w-0">
            <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
              Batch
            </FormLabel>
            <Select
              value={defaultBatchId}
              onChange={(e) =>
                updateParams({ batchId: e.target.value || null, page: '1' })
              }
              options={[
                { value: '', label: 'All Batches' },
                ...filteredBatches.map((b) => ({
                  value: b.id,
                  label: b.batchNameEnglish,
                })),
              ]}
              className="h-11"
              placeholder="All Batches"
              disabled={!defaultCourseId}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <ResponsiveDataTable
        data={completions}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(item) => item.id}
        emptyState={
          <EmptyState
            title="No completions found"
            description="Run the evaluation engine against student rosters or adjust filters to list records."
            icon={<GraduationCap className="h-10 w-10 text-[color:var(--ims-muted)]" />}
          />
        }
      />

      {/* Standardized Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalCount={total}
          limit={20}
        />
      )}
    </div>
  );
}
