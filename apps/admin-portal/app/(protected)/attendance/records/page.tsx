import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { type AttendanceRecordStatus, type AttendanceSessionStatus } from '@ims/attendance';
import { hasPermission } from '@ims/shared-auth';
import { notFound } from 'next/navigation';
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  AdminListPageLayout,
  LinkButton,
  PageHeader,
  CardFooter,
  ResponsiveDataTable,
} from '@ims/shared-ui';
import { ClipboardList, Layers } from 'lucide-react';
import { AttendanceRosterEditor } from '../_components/attendance-roster-editor';

export const metadata = { title: 'Attendance Records - Admin Portal | ASTI IMS' };

function recordBadge(status: string) {
  if (status === 'Present') return <Badge variant="success">Present</Badge>;
  if (status === 'Late') return <Badge variant="info">Late</Badge>;
  if (status === 'Excused') return <Badge variant="outline">Excused</Badge>;
  if (status === 'Absent') return <Badge variant="error">Absent</Badge>;
  return <Badge variant="default">Unmarked</Badge>;
}

export default async function AttendanceRecordsPage(props: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await props.searchParams;
  const session = await assertPermission('attendance.record.read');
  const { branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = (
    await branchScopeResolver.resolveAllowedBranches(
      session.userId as any,
      session.activeBranchId as any,
    )
  ).map((value) => String(value));

  const branchRows = allowedBranchIds.length > 0
    ? await prisma.branch.findMany({
        where: { id: { in: allowedBranchIds }, isDeleted: false },
        select: { id: true, branchName: true },
      })
    : [];
  const branchNameById = new Map(branchRows.map((branch) => [branch.id, branch.branchName]));

  const canMark = hasPermission(session, 'attendance.record.mark');
  const canGenerateRoster = hasPermission(session, 'attendance.session.open');
  const canRequestCorrection = hasPermission(session, 'attendance.correction.request');

  const attendanceSession = sessionId
    ? await prisma.attendanceSession.findFirst({
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
      })
    : null;

  if (sessionId && !attendanceSession) {
    notFound();
  }

  const readOnlyRecords = sessionId
    ? []
    : await prisma.attendanceRecord.findMany({
        where: {
          isDeleted: false,
          branchId: { in: allowedBranchIds },
        },
        include: {
          attendanceSession: {
            include: {
              session: true,
              batch: true,
            },
          },
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
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      });

  const readOnlyRows = readOnlyRecords.map((record) => ({
    id: record.id,
    studentName: `${record.enrollment.studentProfile.person.firstName} ${record.enrollment.studentProfile.person.lastName}`,
    studentNumber: record.enrollment.studentProfile.studentNumber,
    batchCode: record.attendanceSession.batch.batchCode,
    sessionTitle: record.attendanceSession.session.titleEnglish,
    sessionNumber: record.attendanceSession.session.sessionNumber,
    branchName: branchNameById.get(record.branchId) ?? record.branchId,
    status: record.status,
    correctionStatus: record.corrections[0]?.status ?? null,
    lateMinutes: record.lateMinutes,
    markedAt: record.markedAt,
  }));

  const columns = [
    {
      header: 'Student',
      render: (record: (typeof readOnlyRows)[number]) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-[color:var(--ims-ink)]">{record.studentName}</div>
          <div className="text-xs text-[color:var(--ims-muted)]">{record.studentNumber}</div>
        </div>
      ),
    },
    {
      header: 'Batch / Session',
      render: (record: (typeof readOnlyRows)[number]) => (
        <div className="space-y-0.5">
          <div className="font-semibold">{record.sessionTitle}</div>
          <div className="text-xs text-[color:var(--ims-muted)]">{record.batchCode} | #{record.sessionNumber}</div>
        </div>
      ),
    },
    {
      header: 'Branch',
      render: (record: (typeof readOnlyRows)[number]) => record.branchName,
    },
    {
      header: 'Status',
      render: (record: (typeof readOnlyRows)[number]) => recordBadge(record.status),
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Correction',
      render: (record: (typeof readOnlyRows)[number]) => (
        record.correctionStatus ? (
          <Badge variant={record.correctionStatus === 'Approved' ? 'success' : record.correctionStatus === 'Rejected' ? 'error' : 'outline'}>{record.correctionStatus}</Badge>
        ) : (
          <span className="text-sm text-[color:var(--ims-muted)]">None</span>
        )
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'Late Mins',
      className: 'text-right',
      render: (record: (typeof readOnlyRows)[number]) => <span>{record.lateMinutes ?? '—'}</span>,
      headerClassName: 'text-right w-[100px]',
    },
    {
      header: 'Marked At',
      className: 'text-right',
      render: (record: (typeof readOnlyRows)[number]) => <span className="text-sm text-[color:var(--ims-muted)]">{record.markedAt ? new Date(record.markedAt).toLocaleString() : '—'}</span>,
      headerClassName: 'text-right w-[180px]',
    },
  ];

  const renderCard = (record: (typeof readOnlyRows)[number]) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">{record.studentNumber}</p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">{record.studentName}</p>
          </div>
          {recordBadge(record.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div><p className="font-semibold text-[var(--ims-muted)]">Batch</p><p className="truncate">{record.batchCode}</p></div>
          <div><p className="font-semibold text-[var(--ims-muted)]">Session</p><p className="truncate">#{record.sessionNumber}</p></div>
          <div className="col-span-2"><p className="font-semibold text-[var(--ims-muted)]">Branch</p><p className="truncate">{record.branchName}</p></div>
          <div><p className="font-semibold text-[var(--ims-muted)]">Correction</p><p className="truncate">{record.correctionStatus ?? 'None'}</p></div>
          <div><p className="font-semibold text-[var(--ims-muted)]">Late Mins</p><p className="truncate">{record.lateMinutes ?? '—'}</p></div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <div className="w-full text-xs text-[color:var(--ims-muted)]">Marked at: {record.markedAt ? new Date(record.markedAt).toLocaleString() : '—'}</div>
      </CardFooter>
    </Card>
  );

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        eyebrow="Attendance"
        title="Attendance Records"
        description={
          sessionId
            ? 'Mark attendance rows for the selected session, then save draft or submit the roster.'
            : 'Enrollment-linked attendance rows with branch-scoped visibility, correction state, and roster history.'
        }
        actions={
          <LinkButton href="/attendance/sessions" variant="outline" className="gap-2">
            <Layers className="h-4 w-4" />
            Sessions
          </LinkButton>
        }
      />

      {sessionId && attendanceSession && (canMark || canRequestCorrection) ? (
        <AttendanceRosterEditor
          sessionId={attendanceSession.id}
          sessionStatus={attendanceSession.status as AttendanceSessionStatus}
          sessionTitleEnglish={attendanceSession.session.titleEnglish}
          sessionTitleArabic={attendanceSession.session.titleArabic}
          sessionNumber={attendanceSession.session.sessionNumber}
          batchCode={attendanceSession.session.batch.batchCode}
          branchName={branchNameById.get(attendanceSession.branchId) ?? attendanceSession.branchId}
          attendanceDate={attendanceSession.attendanceDate}
          records={attendanceSession.records.map((record) => ({
            id: record.id,
            status: record.status as AttendanceRecordStatus,
            remarks: record.remarks,
            lateMinutes: record.lateMinutes !== null ? Number(record.lateMinutes) : null,
            markedAt: record.markedAt,
            correctionStatus: (record.corrections[0]?.status ?? 'None') as 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'None',
            enrollment: {
              id: record.enrollment.id,
              studentProfile: {
                id: record.enrollment.studentProfile.id,
                studentNumber: record.enrollment.studentProfile.studentNumber,
                person: {
                  firstName: record.enrollment.studentProfile.person.firstName,
                  lastName: record.enrollment.studentProfile.person.lastName,
                },
              },
            },
          }))}
          canMarkAttendance={canMark}
          canGenerateRoster={canGenerateRoster}
          canRequestCorrection={canRequestCorrection}
        />
      ) : null}

      {sessionId && attendanceSession && !canMark ? (
        <Alert
          variant="warning"
          title="Read-only access"
          description="You can view this session’s records, but you do not have permission to mark or submit attendance."
        />
      ) : null}

      {!sessionId ? (
        <Card>
          <CardHeader>
            <CardTitle>Record List</CardTitle>
            <CardDescription>
              {sessionId ? `Filtered to attendance session ${sessionId}.` : 'All attendance records for the authorized branch scope.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {readOnlyRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center">
                <ClipboardList className="mx-auto mb-3 h-10 w-10 text-[color:var(--ims-muted)]" />
                <p className="text-sm font-semibold text-[color:var(--ims-ink)]">No attendance records yet.</p>
                <p className="mt-1 text-sm text-[color:var(--ims-muted)]">
                  {sessionId
                    ? 'Generate the roster from this session first, then mark each student and submit.'
                    : 'Open an attendance session and generate the roster from the batch detail page first.'}
                </p>
              </div>
            ) : (
              <ResponsiveDataTable data={readOnlyRows} columns={columns} renderCard={renderCard} keyExtractor={(record) => record.id} emptyState={null} />
            )}
          </CardContent>
        </Card>
      ) : null}
    </AdminListPageLayout>
  );
}
