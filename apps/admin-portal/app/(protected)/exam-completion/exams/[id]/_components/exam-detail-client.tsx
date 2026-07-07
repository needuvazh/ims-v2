'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
  Badge,
  Button,
  LinkButton,
  ResponsiveDataTable,
  Breadcrumbs,
  EmptyState,
} from '@ims/shared-ui';
import { Home, Layers, Calendar, Edit3, ClipboardList, HelpCircle, CheckSquare, Trash2, ArrowLeft, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ExamDetailClientProps {
  exam: any;
  results: any[];
  resultStats: { total: number; recorded: number; finalized: number; pending: number };
  permissions: string[];
}

function hasPermission(permissions: string[], code: string): boolean {
  return permissions.includes(code) || permissions.includes('SUPER_ADMIN');
}

export function ExamDetailClient({ exam, results, resultStats, permissions }: ExamDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setLoading(action);
    const toastId = toast.loading(`Performing action: ${action}...`);
    try {
      const res = await fetch(`/api/v1/exams/${exam.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'cancel' ? JSON.stringify({ reason: 'Cancelled via UI' }) : JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Exam ${action} successful!`, { id: toastId });
        router.refresh();
      } else {
        throw new Error(data.messageEnglish || 'Action failed');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Action failed', { id: toastId });
    } finally {
      setLoading(null);
    }
  };

  const canUpdate = hasPermission(permissions, 'exam.update');
  const canViewResults = hasPermission(permissions, 'result.view');

  const getStatusBadge = (status: string) => {
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
  };

  const getResultStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'muted'> = {
      Finalized: 'success',
      Recorded: 'warning',
      Pending: 'info',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const columns = [
    {
      header: 'Student Name',
      render: (item: any) => (
        <span className="font-semibold text-[color:var(--ims-ink)]">
          {item.enrollment.studentProfile?.person?.firstName} {item.enrollment.studentProfile?.person?.lastName}
        </span>
      ),
    },
    {
      header: 'Enrollment #',
      render: (item: any) => <span className="font-mono text-xs text-[color:var(--ims-muted)]">{item.enrollment.enrollmentNumber}</span>,
      headerClassName: 'w-[140px]',
    },
    {
      header: 'Marks Obtained',
      render: (item: any) => <span className="font-medium text-slate-700">{item.marksObtained} / {exam.maxMarks}</span>,
      headerClassName: 'w-[140px]',
    },
    {
      header: 'Grade',
      render: (item: any) => <span className="font-semibold text-indigo-600">{item.grade || '-'}</span>,
      headerClassName: 'w-[100px]',
    },
    {
      header: 'Status',
      render: (item: any) => getResultStatusBadge(item.resultStatus),
      headerClassName: 'w-[120px]',
    },
  ];

  const renderCard = (item: any) => (
    <Card className="bg-white">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[color:var(--ims-ink)]">
              {item.enrollment.studentProfile?.person?.firstName} {item.enrollment.studentProfile?.person?.lastName}
            </p>
            <p className="text-xs text-[color:var(--ims-muted)] mt-0.5">{item.enrollment.enrollmentNumber}</p>
          </div>
          {getResultStatusBadge(item.resultStatus)}
        </div>
      </CardHeader>
      <CardContent className="p-4 text-xs space-y-2">
        <div className="flex justify-between">
          <span className="font-semibold text-[color:var(--ims-muted)]">Marks Obtained:</span>
          <span className="font-medium text-slate-800">{item.marksObtained} / {exam.maxMarks}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-[color:var(--ims-muted)]">Grade:</span>
          <span className="font-semibold text-indigo-600">{item.grade || '-'}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Exam Details"
        title={exam.examName}
        description={`${exam.course.nameEnglish} • ${exam.batch.batchNameEnglish}`}
        backUrl="/exam-completion/exams"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Exams', href: '/exam-completion/exams', icon: <Layers className="h-3.5 w-3.5" /> },
              { label: exam.examName, icon: <Calendar className="h-3.5 w-3.5" /> },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            {canUpdate && (
              <>
                {exam.status === 'Draft' && (
                  <Button onClick={() => handleAction('schedule')} disabled={loading !== null} variant="primary" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {loading === 'schedule' ? 'Scheduling...' : 'Schedule'}
                  </Button>
                )}
                {exam.status === 'Scheduled' && (
                  <Button onClick={() => handleAction('activate')} disabled={loading !== null} variant="primary" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <PlayCircle className="h-4 w-4" />
                    {loading === 'activate' ? 'Opening...' : 'Open for Results'}
                  </Button>
                )}
                {exam.status === 'OpenForResultEntry' && (
                  <Button onClick={() => handleAction('close')} disabled={loading !== null} variant="primary" className="bg-slate-700 hover:bg-slate-800 gap-2">
                    <CheckSquare className="h-4 w-4" />
                    {loading === 'close' ? 'Closing...' : 'Close Exam'}
                  </Button>
                )}
                {['Draft', 'Scheduled', 'OpenForResultEntry'].includes(exam.status) && (
                  <Button onClick={() => handleAction('cancel')} disabled={loading !== null} variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 gap-2">
                    <Trash2 className="h-4 w-4" />
                    {loading === 'cancel' ? 'Cancelling...' : 'Cancel'}
                  </Button>
                )}
                {['Closed', 'Cancelled'].includes(exam.status) && (
                  <Button onClick={() => handleAction('archive')} disabled={loading !== null} variant="outline" className="gap-2">
                    <Layers className="h-4 w-4" />
                    {loading === 'archive' ? 'Archiving...' : 'Archive'}
                  </Button>
                )}
              </>
            )}
            {canViewResults && exam.status === 'OpenForResultEntry' && (
              <LinkButton href={`/exam-completion/results?examId=${exam.id}`} variant="primary" className="gap-2">
                <PlayCircle className="h-4 w-4" />
                Manage Results
              </LinkButton>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">Status</CardDescription>
            <div className="mt-2">{getStatusBadge(exam.status)}</div>
          </CardHeader>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">Exam Date</CardDescription>
            <CardTitle className="text-xl font-bold mt-2 text-[color:var(--ims-ink)]">
              {new Date(exam.examDate).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">Passing Standard</CardDescription>
            <CardTitle className="text-xl font-bold mt-2 text-[color:var(--ims-ink)]">
              {exam.passMarks} / {exam.maxMarks} <span className="text-xs font-normal text-slate-500">marks</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">Roster Entries</CardDescription>
            <CardTitle className="text-xl font-bold mt-2 text-[color:var(--ims-ink)]">
              {resultStats.finalized} / {resultStats.total} <span className="text-xs font-normal text-slate-500">finalized</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Results List</CardTitle>
          <CardDescription>Roster of students and recorded marks for this exam.</CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <EmptyState
              title="No results recorded"
              description="Save roster marks or upload a CSV file to populate the list."
              icon={<ClipboardList className="h-10 w-10 text-[color:var(--ims-muted)]" />}
            />
          ) : (
            <ResponsiveDataTable
              data={results}
              columns={columns}
              renderCard={renderCard}
              keyExtractor={(item) => item.id}
              emptyState={null}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
