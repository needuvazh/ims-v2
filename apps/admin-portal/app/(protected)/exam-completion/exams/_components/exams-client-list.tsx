'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar,
  PlayCircle,
  Search,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveDataTable,
  Badge,
  Button,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
  CardFooter,
  EmptyState,
  FormLabel,
  Input,
  Select,
  Pagination,
} from '@ims/shared-ui';

interface ExamListItem {
  id: string;
  examName: string;
  examDate: string;
  status: string;
  maxMarks: number;
  passMarks: number;
  course: { nameEnglish: string };
  batch: { batchNameEnglish: string };
}

interface ExamsClientListProps {
  exams: ExamListItem[];
  courses: { id: string; nameEnglish: string }[];
  batches: { id: string; batchNameEnglish: string; courseId: string }[];
  total: number;
  currentPage: number;
  permissions: string[];
  defaultSearch: string;
  defaultCourseId: string;
  defaultBatchId: string;
  defaultStatus: string;
}

function hasPermission(permissions: string[], code: string): boolean {
  return permissions.includes(code) || permissions.includes('SUPER_ADMIN');
}

export function ExamsClientList({
  exams,
  courses,
  batches,
  total,
  currentPage,
  permissions,
  defaultSearch,
  defaultCourseId,
  defaultBatchId,
  defaultStatus,
}: ExamsClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / 20); // 20 limit per page

  const [searchValue, setSearchValue] = useState(defaultSearch);

  const filteredBatches = defaultCourseId
    ? batches.filter((b) => b.courseId === defaultCourseId)
    : [];

  const canView = hasPermission(permissions, 'exam.view');

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

  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<
      string,
      'muted' | 'info' | 'warning' | 'success' | 'error' | 'outline'
    > = {
      Draft: 'muted',
      Scheduled: 'info',
      OpenForResultEntry: 'warning',
      Closed: 'success',
      Cancelled: 'error',
      Archived: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status === 'OpenForResultEntry' ? 'Open for Entry' : status}
      </Badge>
    );
  };

  const columns = [
    {
      header: 'Exam Name',
      render: (item: ExamListItem) => (
        <span className="font-semibold text-[color:var(--ims-ink)]">
          {item.examName}
        </span>
      ),
    },
    {
      header: 'Course',
      render: (item: ExamListItem) => item.course.nameEnglish,
    },
    {
      header: 'Batch',
      render: (item: ExamListItem) => (
        <span className="font-mono text-xs text-[color:var(--ims-muted)]">
          {item.batch.batchNameEnglish}
        </span>
      ),
    },
    {
      header: 'Date',
      render: (item: ExamListItem) =>
        new Date(item.examDate).toLocaleDateString(),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Pass/Max Marks',
      render: (item: ExamListItem) => (
        <span className="font-medium text-slate-700">
          {item.passMarks}/{item.maxMarks}
        </span>
      ),
      headerClassName: 'w-[140px]',
    },
    {
      header: 'Status',
      render: (item: ExamListItem) => <StatusBadge status={item.status} />,
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (item: ExamListItem) => (
        <div className="inline-flex items-center justify-end gap-2">
          {canView && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/exam-completion/exams/${item.id}`)}
              title="Manage Exam"
            >
              <ArrowRight className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
            </Button>
          )}
        </div>
      ),
      headerClassName: 'text-right w-[100px]',
    },
  ];

  const renderCard = (exam: ExamListItem) => (
    <Card className="transition-colors hover:border-[color:var(--ims-brass)] bg-white">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--ims-muted)]">
              {new Date(exam.examDate).toLocaleDateString()}
            </p>
            <p className="text-sm font-bold text-[color:var(--ims-ink)] truncate">
              {exam.examName}
            </p>
          </div>
          <StatusBadge status={exam.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[color:var(--ims-muted)]">
              Course
            </p>
            <p className="truncate mt-0.5 text-slate-800">
              {exam.course.nameEnglish}
            </p>
          </div>
          <div>
            <p className="font-semibold text-[color:var(--ims-muted)]">Batch</p>
            <p className="truncate mt-0.5 text-slate-800">
              {exam.batch.batchNameEnglish}
            </p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[color:var(--ims-muted)]">
              Marks (Pass / Max)
            </p>
            <p className="mt-0.5 font-medium text-slate-800">
              {exam.passMarks} / {exam.maxMarks}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {canView && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-[11px]"
            onClick={() => router.push(`/exam-completion/exams/${exam.id}`)}
          >
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> Manage Exam
          </Button>
        )}
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
              Search
            </FormLabel>
            <div className="relative">
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search exams by name..."
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
        data={exams}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(item) => item.id}
        emptyState={
          <EmptyState
            title="No exams found"
            description="Create your first exam schedule or adjust filters to list active records."
            icon={<Calendar className="h-10 w-10 text-[color:var(--ims-muted)]" />}
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
