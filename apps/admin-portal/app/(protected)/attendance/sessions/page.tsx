import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { hasPermission } from '@ims/shared-auth';
import { notFound } from 'next/navigation';
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
  Breadcrumbs,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
} from '@ims/shared-ui';
import { ClipboardList, Layers, PlayCircle, Home } from 'lucide-react';
import { AttendanceRosterEditor } from '../_components/attendance-roster-editor';
import {
  type AttendanceSessionStatus,
  type AttendanceRecordStatus,
} from '@ims/attendance';

export const metadata = {
  title: 'Attendance Sessions - Admin Portal | ASTI IMS',
};
export const dynamic = 'force-dynamic';

function statusBadge(status: string) {
  if (status === 'Draft' || status === 'Open')
    return <Badge variant="info">{status}</Badge>;
  if (status === 'Submitted') return <Badge variant="success">{status}</Badge>;
  if (status === 'Locked') return <Badge variant="default">{status}</Badge>;
  if (status === 'Reopened') return <Badge variant="outline">{status}</Badge>;
  if (status === 'Cancelled') return <Badge variant="error">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function recordBadge(status: string) {
  if (status === 'Present') return <Badge variant="success">Present</Badge>;
  if (status === 'Late') return <Badge variant="info">Late</Badge>;
  if (status === 'Excused') return <Badge variant="outline">Excused</Badge>;
  if (status === 'Absent') return <Badge variant="error">Absent</Badge>;
  return <Badge variant="default">Unmarked</Badge>;
}

export default async function AttendanceSessionsPage(props: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await props.searchParams;
  const session = await assertPermission('attendance.session.read');
  const canMarkAttendance = hasPermission(session, 'attendance.record.mark');
  const canGenerateRoster = hasPermission(session, 'attendance.session.open');
  const canRequestCorrection = hasPermission(
    session,
    'attendance.correction.request',
  );

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

  // If a sessionId is provided, fetch Roster Editor context
  if (sessionId) {
    const attendanceSession = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        isDeleted: false,
        branchId: { in: allowedBranchIds },
      },
      include: {
        session: {
          include: { batch: true },
        },
        records: {
          where: { isDeleted: false },
          include: {
            corrections: {
              where: { isDeleted: false },
              orderBy: { requestedAt: 'desc' },
              take: 1,
            },
            enrollment: {
              include: {
                studentProfile: {
                  include: {
                    person: true,
                  },
                },
              },
            },
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });

    if (!attendanceSession) {
      notFound();
    }

    return (
      <AdminListPageLayout className="pt-1 sm:pt-0">
        <PageHeader
          title={`Session Roster: ${attendanceSession.session.titleEnglish}`}
          description={`Batch: ${attendanceSession.session.batch.batchCode} · Session #${attendanceSession.session.sessionNumber}`}
          backUrl="/attendance/sessions"
          breadcrumbs={
            <Breadcrumbs
              items={[
                {
                  label: 'Attendance',
                  href: '/attendance/dashboard',
                },
                {
                  label: 'Sessions',
                  href: '/attendance/sessions',
                },
                {
                  label: 'Session Roster',
                },
              ]}
            />
          }
        />

        {canMarkAttendance || canRequestCorrection ? (
          <AttendanceRosterEditor
            sessionId={attendanceSession.id}
            sessionStatus={attendanceSession.status as AttendanceSessionStatus}
            sessionTitleEnglish={attendanceSession.session.titleEnglish}
            sessionTitleArabic={attendanceSession.session.titleArabic}
            sessionNumber={attendanceSession.session.sessionNumber}
            batchCode={attendanceSession.session.batch.batchCode}
            branchName={
              branchNameById.get(attendanceSession.branchId) ??
              attendanceSession.branchId
            }
            attendanceDate={attendanceSession.attendanceDate}
            records={attendanceSession.records.map((record) => ({
              id: record.id,
              status: record.status as AttendanceRecordStatus,
              remarks: record.remarks,
              lateMinutes:
                record.lateMinutes !== null ? Number(record.lateMinutes) : null,
              markedAt: record.markedAt,
              correctionStatus: (record.corrections[0]?.status ??
                'None') as any,
              enrollment: {
                id: record.enrollment.id,
                studentProfile: {
                  id: record.enrollment.studentProfile.id,
                  studentNumber: record.enrollment.studentProfile.studentNumber,
                  person: {
                    firstName:
                      record.enrollment.studentProfile.person.firstName,
                    lastName: record.enrollment.studentProfile.person.lastName,
                  },
                },
              },
            }))}
            canMarkAttendance={canMarkAttendance}
            canGenerateRoster={canGenerateRoster}
            canRequestCorrection={canRequestCorrection}
          />
        ) : (
          <Alert
            variant="warning"
            title="Read-only access"
            description="You can view this session’s records, but you do not have permission to mark or submit attendance."
          />
        )}
      </AdminListPageLayout>
    );
  }

  // Otherwise, list all sessions grouped by date tabs
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
    },
    orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
    take: 150,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeSessions = attendanceSessions.filter((item) => {
    const d = new Date(item.attendanceDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const pastSessions = attendanceSessions.filter((item) => {
    const d = new Date(item.attendanceDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  });

  const futureSessions = attendanceSessions.filter((item) => {
    const d = new Date(item.attendanceDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  });

  const columns = [
    {
      header: 'Date',
      render: (item: any) => (
        <span className="font-medium">
          {new Date(item.attendanceDate).toLocaleDateString()}
        </span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Delivery Session',
      render: (item: any) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-[color:var(--ims-ink)]">
            {item.session.titleEnglish}
          </div>
          <div className="text-xs text-[color:var(--ims-muted)]">
            #{item.session.sessionNumber} | {item.session.startTime} -{' '}
            {item.session.endTime}
          </div>
        </div>
      ),
    },
    {
      header: 'Batch',
      render: (item: any) => (
        <span className="font-mono text-xs text-[color:var(--ims-muted)]">
          {item.session.batch.batchCode}
        </span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Branch',
      render: (item: any) => branchNameById.get(item.branchId) ?? item.branchId,
    },
    {
      header: 'Status',
      render: (item: any) => statusBadge(item.status),
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Records',
      className: 'text-right',
      render: (item: any) => (
        <span className="font-semibold">{item.records.length}</span>
      ),
      headerClassName: 'w-[100px] text-right',
    },
    {
      header: 'Action',
      className: 'text-right',
      render: (item: any) => (
        <div className="inline-flex flex-wrap items-center justify-end gap-2">
          {item.records.length === 0 ? (
            <LinkButton
              href={`/batches/${item.session.batchId}`}
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
            href={`/batches/${item.session.batchId}`}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            Open Batch
          </LinkButton>
          <LinkButton
            href={`/attendance/sessions?sessionId=${item.id}`}
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

  const renderCard = (item: any) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {new Date(item.attendanceDate).toLocaleDateString()}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">
              {item.session.titleEnglish}
            </p>
          </div>
          {statusBadge(item.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Batch</p>
            <p className="truncate">{item.session.batch.batchCode}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <p className="truncate">
              {branchNameById.get(item.branchId) ?? item.branchId}
            </p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Session</p>
            <p className="truncate">#{item.session.sessionNumber}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Records</p>
            <p className="truncate">{item.records.length}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <div className="flex w-full flex-wrap gap-2">
          {item.records.length === 0 ? (
            <LinkButton
              href={`/batches/${item.session.batchId}`}
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
            >
              <ClipboardList className="h-4 w-4" /> Generate Roster
            </LinkButton>
          ) : null}
          <LinkButton
            href={`/attendance/sessions?sessionId=${item.id}`}
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
        title="Attendance Sessions"
        actions={
          <LinkButton href="/batches" variant="outline" className="gap-2">
            <Layers className="h-4 w-4" />
            Go to Batches
          </LinkButton>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Attendance',
                href: '/attendance/dashboard',
              },
              {
                label: 'Sessions',
              },
            ]}
          />
        }
      />

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="active" className="gap-2">
            Active Today
            <Badge
              variant="outline"
              className="ml-1 bg-slate-50 font-semibold px-1.5 py-0"
            >
              {activeSessions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            Past
            <Badge
              variant="outline"
              className="ml-1 bg-slate-50 font-semibold px-1.5 py-0"
            >
              {pastSessions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="future" className="gap-2">
            Future
            <Badge
              variant="outline"
              className="ml-1 bg-slate-50 font-semibold px-1.5 py-0"
            >
              {futureSessions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge
              variant="outline"
              className="ml-1 bg-slate-50 font-semibold px-1.5 py-0"
            >
              {attendanceSessions.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Today's Sessions</CardTitle>
              <CardDescription>
                Sessions running on today's scheduled training logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center text-sm text-[color:var(--ims-muted)]">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8" />
                  No sessions running today.
                </div>
              ) : (
                <ResponsiveDataTable
                  data={activeSessions}
                  columns={columns}
                  renderCard={renderCard}
                  keyExtractor={(item) => item.id}
                  emptyState={null}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past">
          <Card>
            <CardHeader>
              <CardTitle>Past History</CardTitle>
              <CardDescription>
                Historical attendance sessions completed or locked.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pastSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center text-sm text-[color:var(--ims-muted)]">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8" />
                  No past sessions found.
                </div>
              ) : (
                <ResponsiveDataTable
                  data={pastSessions}
                  columns={columns}
                  renderCard={renderCard}
                  keyExtractor={(item) => item.id}
                  emptyState={null}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="future">
          <Card>
            <CardHeader>
              <CardTitle>Future Schedule</CardTitle>
              <CardDescription>
                Upcoming sessions not yet open for marking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {futureSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center text-sm text-[color:var(--ims-muted)]">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8" />
                  No future sessions scheduled.
                </div>
              ) : (
                <ResponsiveDataTable
                  data={futureSessions}
                  columns={columns}
                  renderCard={renderCard}
                  keyExtractor={(item) => item.id}
                  emptyState={null}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Sessions</CardTitle>
              <CardDescription>
                All records within authorized branch scope.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center text-sm text-[color:var(--ims-muted)]">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8" />
                  No sessions found.
                </div>
              ) : (
                <ResponsiveDataTable
                  data={attendanceSessions}
                  columns={columns}
                  renderCard={renderCard}
                  keyExtractor={(item) => item.id}
                  emptyState={null}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminListPageLayout>
  );
}
