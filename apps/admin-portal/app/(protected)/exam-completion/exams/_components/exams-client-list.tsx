'use client';

import Link from 'next/link';
import {
  ResponsiveDataTable,
  Badge,
  LinkButton,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
  CardFooter,
  EmptyState,
} from '@ims/shared-ui';
import { Calendar, PlayCircle } from 'lucide-react';

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
  permissions: string[];
}

function hasPermission(permissions: string[], code: string): boolean {
  return permissions.includes(code) || permissions.includes('SUPER_ADMIN');
}

export function ExamsClientList({ exams, permissions }: ExamsClientListProps) {
  const canView = hasPermission(permissions, 'exam.view');
  const canViewResults = hasPermission(permissions, 'result.view');

  if (exams.length === 0) {
    return (
      <EmptyState
        title="No exams found"
        description="Create your first exam schedule or adjust filters to list active records."
        icon={<Calendar className="h-10 w-10 text-[color:var(--ims-muted)]" />}
      />
    );
  }

  const columns = [
    {
      header: 'Exam Name',
      render: (item: ExamListItem) => <span className="font-semibold text-[color:var(--ims-ink)]">{item.examName}</span>,
    },
    {
      header: 'Course',
      render: (item: ExamListItem) => item.course.nameEnglish,
    },
    {
      header: 'Batch',
      render: (item: ExamListItem) => <span className="font-mono text-xs text-[color:var(--ims-muted)]">{item.batch.batchNameEnglish}</span>,
    },
    {
      header: 'Date',
      render: (item: ExamListItem) => new Date(item.examDate).toLocaleDateString(),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Pass/Max Marks',
      render: (item: ExamListItem) => <span className="font-medium text-slate-700">{item.passMarks}/{item.maxMarks}</span>,
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
            <LinkButton href={`/exam-completion/exams/${item.id}`} size="sm" variant="outline">
              View
            </LinkButton>
          )}
          {canViewResults && item.status === 'OpenForResultEntry' && (
            <LinkButton href={`/exam-completion/results?examId=${item.id}`} size="sm" variant="primary" className="gap-1">
              <PlayCircle className="h-3.5 w-3.5" />
              Results
            </LinkButton>
          )}
        </div>
      ),
      headerClassName: 'text-right w-[200px]',
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
            <p className="text-sm font-bold text-[color:var(--ims-ink)] truncate">{exam.examName}</p>
          </div>
          <StatusBadge status={exam.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[color:var(--ims-muted)]">Course</p>
            <p className="truncate mt-0.5 text-slate-800">{exam.course.nameEnglish}</p>
          </div>
          <div>
            <p className="font-semibold text-[color:var(--ims-muted)]">Batch</p>
            <p className="truncate mt-0.5 text-slate-800">{exam.batch.batchNameEnglish}</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[color:var(--ims-muted)]">Marks (Pass / Max)</p>
            <p className="mt-0.5 font-medium text-slate-800">{exam.passMarks} / {exam.maxMarks}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex w-full gap-2">
          {canView && (
            <LinkButton href={`/exam-completion/exams/${exam.id}`} size="sm" variant="outline" className="flex-1 justify-center">
              View Detail
            </LinkButton>
          )}
          {canViewResults && exam.status === 'OpenForResultEntry' && (
            <LinkButton href={`/exam-completion/results?examId=${exam.id}`} size="sm" variant="primary" className="flex-1 justify-center gap-1">
              <PlayCircle className="h-3.5 w-3.5" />
              Manage Results
            </LinkButton>
          )}
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <ResponsiveDataTable
      data={exams}
      columns={columns}
      renderCard={renderCard}
      keyExtractor={(item) => item.id}
      emptyState={null}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'muted' | 'info' | 'warning' | 'success' | 'error' | 'outline'> = {
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
}
