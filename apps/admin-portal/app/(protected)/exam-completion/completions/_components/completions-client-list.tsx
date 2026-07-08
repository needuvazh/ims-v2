'use client';

import {
  ResponsiveDataTable,
  Badge,
  LinkButton,
  EmptyState,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
  CardFooter,
} from '@ims/shared-ui';
import { GraduationCap, ArrowRight } from 'lucide-react';

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

export function CompletionsClientList({
  completions,
}: {
  completions: CompletionListItem[];
}) {
  if (completions.length === 0) {
    return (
      <EmptyState
        title="No completions found"
        description="Run the evaluation engine against student rosters to generate completion records."
        icon={
          <GraduationCap className="h-10 w-10 text-[color:var(--ims-muted)]" />
        }
      />
    );
  }

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
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
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
      render: (item: CompletionListItem) =>
        getStatusBadge(item.completionStatus),
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
      headerClassName: 'text-right w-[160px]',
    },
  ];

  const renderCard = (item: CompletionListItem) => (
    <Card className="transition-colors hover:border-[color:var(--ims-brass)] bg-white">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold text-[color:var(--ims-ink)]">
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
            <p className="mt-0.5 text-slate-800">
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
    <ResponsiveDataTable
      data={completions}
      columns={columns}
      renderCard={renderCard}
      keyExtractor={(item) => item.id}
      emptyState={null}
    />
  );
}
