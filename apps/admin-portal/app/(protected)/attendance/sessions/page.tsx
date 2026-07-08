import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { hasPermission } from '@ims/shared-auth';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  LinkButton,
  AdminListPageLayout,
  PageHeader,
  ResponsiveDataTable,
} from '@ims/shared-ui';
import { ClipboardList, Layers, PlayCircle } from 'lucide-react';

export const metadata = {
  title: 'Attendance Sessions - Admin Portal | ASTI IMS',
};

function statusBadge(status: string) {
  if (status === 'Draft' || status === 'Open')
    return <Badge variant="info">{status}</Badge>;
  if (status === 'Submitted') return <Badge variant="success">{status}</Badge>;
  if (status === 'Locked') return <Badge variant="default">{status}</Badge>;
  if (status === 'Reopened') return <Badge variant="outline">{status}</Badge>;
  if (status === 'Cancelled') return <Badge variant="error">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export default async function AttendanceSessionsPage() {
  const session = await assertPermission('attendance.session.read');
  const canMarkAttendance = hasPermission(session, 'attendance.record.mark');
  const { branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = (
    await branchScopeResolver.resolveAllowedBranches(
      session.userId as any,
      session.activeBranchId as any,
    )
  ).map((value) => String(value));

  const branchRows =
    allowedBranchIds.length > 0
      ? await prisma.branch.findMany({
          where: { id: { in: allowedBranchIds }, isDeleted: false },
          select: { id: true, branchName: true },
        })
      : [];
  const branchNameById = new Map(
    branchRows.map((branch) => [branch.id, branch.branchName]),
  );

  const attendanceSessions = await prisma.attendanceSession.findMany({
    where: {
      isDeleted: false,
      branchId: { in: allowedBranchIds },
    },
    include: {
      session: {
        include: { batch: true },
      },
      records: {
        where: { isDeleted: false },
        select: { id: true },
      },
      markedByTrainer: {
        select: { id: true },
      },
    },
    orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  const openCount = attendanceSessions.filter(
    (item) => item.status === 'Open' || item.status === 'Draft',
  ).length;
  const submittedCount = attendanceSessions.filter(
    (item) => item.status === 'Submitted',
  ).length;
  const lockedCount = attendanceSessions.filter(
    (item) => item.status === 'Locked',
  ).length;

  const rows = attendanceSessions.map((item) => ({
    id: item.id,
    attendanceDate: item.attendanceDate.toISOString(),
    titleEnglish: item.session.titleEnglish,
    titleArabic: item.session.titleArabic,
    sessionNumber: item.session.sessionNumber,
    startTime: item.session.startTime,
    endTime: item.session.endTime,
    batchCode: item.session.batch.batchCode,
    branchName: branchNameById.get(item.branchId) ?? item.branchId,
    status: item.status,
    recordsCount: item.records.length,
    batchId: item.batchId,
  }));

  const columns = [
    {
      header: 'Date',
      render: (item: (typeof rows)[number]) => (
        <span className="font-medium">
          {new Date(item.attendanceDate).toLocaleDateString()}
        </span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Delivery Session',
      render: (item: (typeof rows)[number]) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-[color:var(--ims-ink)]">
            {item.titleEnglish}
          </div>
          <div className="text-xs text-[color:var(--ims-muted)]">
            #{item.sessionNumber} | {item.startTime} - {item.endTime}
          </div>
        </div>
      ),
    },
    {
      header: 'Batch',
      render: (item: (typeof rows)[number]) => (
        <span className="font-mono text-xs text-[color:var(--ims-muted)]">
          {item.batchCode}
        </span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Branch',
      render: (item: (typeof rows)[number]) => item.branchName,
    },
    {
      header: 'Status',
      render: (item: (typeof rows)[number]) => statusBadge(item.status),
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Records',
      className: 'text-right',
      render: (item: (typeof rows)[number]) => (
        <span className="font-semibold">{item.recordsCount}</span>
      ),
      headerClassName: 'w-[100px] text-right',
    },
    {
      header: 'Action',
      className: 'text-right',
      render: (item: (typeof rows)[number]) => (
        <div className="inline-flex flex-wrap items-center justify-end gap-2">
          {item.recordsCount === 0 ? (
            <LinkButton
              href={`/batches/${item.batchId}`}
              size="sm"
              variant="outline"
              className="gap-2"
              title="Open the batch to generate the missing roster"
            >
              <ClipboardList className="h-4 w-4" />
              Generate Roster
            </LinkButton>
          ) : null}
          <LinkButton
            href={`/batches/${item.batchId}`}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            Open Batch
          </LinkButton>
          <LinkButton
            href={`/attendance/records?sessionId=${item.id}`}
            size="sm"
            variant="ghost"
            className="gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            {canMarkAttendance ? 'Mark Attendance' : 'View Records'}
          </LinkButton>
        </div>
      ),
      headerClassName: 'text-right w-[260px]',
    },
  ];

  const renderCard = (item: (typeof rows)[number]) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {new Date(item.attendanceDate).toLocaleDateString()}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">
              {item.titleEnglish}
            </p>
          </div>
          {statusBadge(item.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Batch</p>
            <p className="truncate">{item.batchCode}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <p className="truncate">{item.branchName}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Session</p>
            <p className="truncate">#{item.sessionNumber}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Records</p>
            <p className="truncate">{item.recordsCount}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <div className="flex w-full flex-wrap gap-2">
          {item.recordsCount === 0 ? (
            <LinkButton
              href={`/batches/${item.batchId}`}
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
            >
              <ClipboardList className="h-4 w-4" /> Generate Roster
            </LinkButton>
          ) : null}
          <LinkButton
            href={`/attendance/records?sessionId=${item.id}`}
            size="sm"
            variant="ghost"
            className="flex-1 gap-2"
          >
            <ClipboardList className="h-4 w-4" />{' '}
            {canMarkAttendance ? 'Mark Attendance' : 'View Records'}
          </LinkButton>
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        eyebrow="Attendance"
        title="Attendance Sessions"
        description="Branch-scoped attendance sessions opened from delivery sessions. Open a batch session first, then mark and submit the attendance roster."
        actions={
          <LinkButton href="/batches" variant="outline" className="gap-2">
            <Layers className="h-4 w-4" />
            Go to Batches
          </LinkButton>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Open / Draft</CardDescription>
            <CardTitle className="text-3xl">{openCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Submitted</CardDescription>
            <CardTitle className="text-3xl">{submittedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Locked</CardDescription>
            <CardTitle className="text-3xl">{lockedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session List</CardTitle>
          <CardDescription>
            Use the session list to drill into roster marking, submission,
            locking, and correction workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-[color:var(--ims-muted)]" />
              <p className="text-sm font-semibold text-[color:var(--ims-ink)]">
                No attendance sessions yet.
              </p>
              <p className="mt-1 text-sm text-[color:var(--ims-muted)]">
                Open a delivery session from the batch detail screen to create
                the attendance session and roster.
              </p>
            </div>
          ) : (
            <ResponsiveDataTable
              data={rows}
              columns={columns}
              renderCard={renderCard}
              keyExtractor={(item) => item.id}
              emptyState={null}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How Sessions Are Created</CardTitle>
          <CardDescription>
            Attendance sessions are opened from the delivery session row in the
            batch screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-[color:var(--ims-muted)] md:grid-cols-2">
          <p>1. Open a batch detail page and find the delivery session.</p>
          <p>
            2. Click{' '}
            <span className="font-semibold text-[color:var(--ims-ink)]">
              Open Attendance
            </span>
            .
          </p>
          <p>
            3. The UI creates the AttendanceSession and roster rows for active
            enrollments.
          </p>
          <p>
            4. Return here to review status, records, and downstream correction
            workflow.
          </p>
        </CardContent>
      </Card>
    </AdminListPageLayout>
  );
}
