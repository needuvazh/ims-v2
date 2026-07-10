import { assertPermission } from '@/lib/auth-guard';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LinkButton,
  PageHeader,
  Breadcrumbs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ims/shared-ui';
import { BarChart3, ClipboardList, Layers, Home } from 'lucide-react';
import { ReportsFilter } from './_components/reports-filter';
import { prisma } from '@ims/database';

export const metadata = {
  title: 'Attendance Reports - Admin Portal | ASTI IMS',
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

export default async function AttendanceReportsPage(props: {
  searchParams: Promise<{ branchId?: string; batchId?: string }>;
}) {
  const { branchId: paramBranchId, batchId: paramBatchId } =
    await props.searchParams;
  const session = await assertPermission('attendance.report.daily.view');

  const { branchScopeResolver, attendanceQueryService } =
    await import('@/lib/runtime');

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

  const selectedBranchId =
    paramBranchId && allowedBranchIds.includes(paramBranchId)
      ? paramBranchId
      : ((session.activeBranchId &&
        allowedBranchIds.includes(session.activeBranchId)
          ? session.activeBranchId
          : allowedBranchIds[0]) ?? '');

  // Get active/in-progress batches in the selected branch
  const activeBatches = await prisma.batch.findMany({
    where: {
      isDeleted: false,
      branchId: selectedBranchId,
      status: { in: ['OpenForEnrollment', 'InProgress', 'Completed'] },
    },
    select: { id: true, batchCode: true, batchNameEnglish: true },
    orderBy: { batchCode: 'asc' },
  });

  const selectedBatchId =
    paramBatchId && activeBatches.some((b) => b.id === paramBatchId)
      ? paramBatchId
      : '';

  // 1. Session Health Snapshot queries
  const sessionsResult = (await attendanceQueryService.listSessions({
    branchIds: allowedBranchIds,
    page: 1,
    pageSize: 10,
    batchId: null,
    sessionId: null,
    attendanceDateFrom: null,
    attendanceDateTo: null,
    status: null,
  })) as unknown as {
    items: Array<{
      id: string;
      attendanceDate: Date;
      batchId: string;
      status: string;
      recordCount: number;
    }>;
    total: number;
  };

  const snapshotBatchIds = sessionsResult.items.map((item) => item.batchId);
  const snapshotBatches = await prisma.batch.findMany({
    where: { id: { in: snapshotBatchIds } },
    select: { id: true, batchCode: true },
  });
  const snapshotBatchCodeMap = new Map(
    snapshotBatches.map((b) => [b.id, b.batchCode]),
  );

  // 2. Low Attendance Watchlist queries
  const branchSummary = (
    selectedBranchId
      ? await attendanceQueryService.branchSummary(
          selectedBranchId,
          allowedBranchIds,
        )
      : []
  ) as Array<{
    enrollmentId: string;
    studentProfileId: string;
    branchId: string;
    attendancePercentage: number;
  }>;

  const lowAttendance = [...branchSummary]
    .sort((a, b) => a.attendancePercentage - b.attendancePercentage)
    .slice(0, 10);

  const watchlistEnrollmentIds = lowAttendance.map((item) => item.enrollmentId);
  const watchlistEnrollments = await prisma.enrollment.findMany({
    where: { id: { in: watchlistEnrollmentIds } },
    include: {
      studentProfile: {
        include: { person: true },
      },
      course: true,
      batch: true,
    },
  });
  const watchlistMap = new Map(watchlistEnrollments.map((e) => [e.id, e]));

  // 3. Batch specific queries (if batch selected)
  let batchStudentsSummary: any[] = [];
  let batchSessionsHeatmap: any[] = [];

  if (selectedBatchId) {
    const batchSummaryResult = await attendanceQueryService.batchSummary(
      selectedBatchId,
      allowedBranchIds,
    );

    const batchEnrollmentIds = batchSummaryResult.map(
      (item) => item.enrollmentId,
    );
    const batchEnrollments = await prisma.enrollment.findMany({
      where: { id: { in: batchEnrollmentIds } },
      include: {
        studentProfile: {
          include: { person: true },
        },
      },
    });
    const batchEnrollmentMap = new Map(batchEnrollments.map((e) => [e.id, e]));

    batchStudentsSummary = batchSummaryResult.map((item) => {
      const e = batchEnrollmentMap.get(item.enrollmentId);
      return {
        ...item,
        studentName: e
          ? `${e.studentProfile.person.firstName} ${e.studentProfile.person.lastName}`
          : 'N/A',
        studentNumber: e ? e.studentProfile.studentNumber : 'N/A',
      };
    });

    const recentSessions = await prisma.attendanceSession.findMany({
      where: {
        isDeleted: false,
        batchId: selectedBatchId,
        status: { in: ['Submitted', 'Locked', 'Reopened'] },
      },
      orderBy: { attendanceDate: 'desc' },
      take: 6,
      include: {
        records: {
          where: { isDeleted: false },
        },
      },
    });

    // Chronological order for columns
    batchSessionsHeatmap = [...recentSessions].reverse();
  }

  const submittedCount = sessionsResult.items.filter(
    (item) => item.status === 'Submitted',
  ).length;
  const draftCount = sessionsResult.items.filter(
    (item) => item.status === 'Draft' || item.status === 'Open',
  ).length;
  const lockedCount = sessionsResult.items.filter(
    (item) => item.status === 'Locked',
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Reports"
        description="Daily attendance logs, session completion rates, watchlist metrics, and student roster analysis grids."
        actions={
          <LinkButton
            href="/attendance/sessions"
            variant="outline"
            className="gap-2"
          >
            <Layers className="h-4 w-4" />
            Sessions
          </LinkButton>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Attendance',
                href: '/attendance/dashboard',
              },
              {
                label: 'Reports',
              },
            ]}
          />
        }
      />

      <ReportsFilter
        branches={branchRows.map((b) => ({ id: b.id, name: b.branchName }))}
        batches={activeBatches.map((b) => ({ id: b.id, name: b.batchCode }))}
        selectedBranchId={selectedBranchId}
        selectedBatchId={selectedBatchId}
      />

      {/* If a Batch is selected, render Batch-specific Attendance Roster Report */}
      {selectedBatchId && (
        <div className="space-y-6 animate-fade-in-up">
          <Card>
            <CardHeader>
              <CardTitle>Batch Attendance Analysis</CardTitle>
              <CardDescription>
                Detailed overview of enrollment attendance rates for batch{' '}
                <span className="font-mono font-semibold">
                  {
                    activeBatches.find((b) => b.id === selectedBatchId)
                      ?.batchCode
                  }
                </span>
                .
              </CardDescription>
            </CardHeader>
            <CardContent>
              {batchStudentsSummary.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center text-sm text-[color:var(--ims-muted)]">
                  No student enrollments found in this batch.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-right">
                          Total Sessions
                        </TableHead>
                        <TableHead className="text-right text-emerald-600">
                          Present
                        </TableHead>
                        <TableHead className="text-right text-amber-600">
                          Late
                        </TableHead>
                        <TableHead className="text-right text-indigo-600">
                          Excused
                        </TableHead>
                        <TableHead className="text-right text-rose-600">
                          Absent
                        </TableHead>
                        <TableHead className="text-right">
                          Attendance Rate
                        </TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchStudentsSummary.map((item) => (
                        <TableRow key={item.enrollmentId}>
                          <TableCell>
                            <div className="font-semibold text-slate-800">
                              {item.studentName}
                            </div>
                            <div className="text-xs text-[color:var(--ims-muted)]">
                              {item.studentNumber}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.totalSessions}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">
                            {item.presentCount}
                          </TableCell>
                          <TableCell className="text-right text-amber-600 font-semibold">
                            {item.lateCount}
                          </TableCell>
                          <TableCell className="text-right text-indigo-600 font-semibold">
                            {item.excusedCount}
                          </TableCell>
                          <TableCell className="text-right text-rose-600 font-semibold">
                            {item.absentCount}
                          </TableCell>
                          <TableCell className="text-right font-black">
                            {item.attendancePercentage.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                item.attendancePercentage < 75
                                  ? 'error'
                                  : 'success'
                              }
                            >
                              {item.attendancePercentage < 75
                                ? 'At Risk'
                                : 'Healthy'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch Heatmap Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Matrix (Heatmap)</CardTitle>
              <CardDescription>
                Chronological student attendance records for the last 6
                sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {batchSessionsHeatmap.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center text-sm text-[color:var(--ims-muted)]">
                  No submitted attendance sessions yet for this batch.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        {batchSessionsHeatmap.map((s) => (
                          <TableHead
                            key={s.id}
                            className="text-center font-mono text-xs w-[90px]"
                          >
                            {new Date(s.attendanceDate).toLocaleDateString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                              },
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchStudentsSummary.map((student) => (
                        <TableRow key={student.enrollmentId}>
                          <TableCell className="font-semibold text-slate-800">
                            {student.studentName}
                          </TableCell>
                          {batchSessionsHeatmap.map((s) => {
                            const rec = s.records.find(
                              (r: any) =>
                                r.enrollmentId === student.enrollmentId,
                            );
                            const status = rec?.status || 'Unmarked';
                            return (
                              <TableCell key={s.id} className="text-center">
                                <span
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold font-mono ${
                                    status === 'Present'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : status === 'Late'
                                        ? 'bg-amber-50 text-amber-700'
                                        : status === 'Excused'
                                          ? 'bg-indigo-50 text-indigo-700'
                                          : status === 'Absent'
                                            ? 'bg-rose-50 text-rose-700'
                                            : 'bg-slate-50 text-slate-400'
                                  }`}
                                  title={status}
                                >
                                  {status === 'Present'
                                    ? 'P'
                                    : status === 'Late'
                                      ? 'L'
                                      : status === 'Excused'
                                        ? 'E'
                                        : status === 'Absent'
                                          ? 'A'
                                          : '—'}
                                </span>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex items-center justify-center gap-4 text-xs font-mono text-[color:var(--ims-muted)]">
                    <span className="flex items-center gap-1">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-emerald-700 font-bold">
                        P
                      </span>{' '}
                      Present
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-50 text-amber-700 font-bold">
                        L
                      </span>{' '}
                      Late
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-indigo-50 text-indigo-700 font-bold">
                        E
                      </span>{' '}
                      Excused
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-rose-50 text-rose-700 font-bold">
                        A
                      </span>{' '}
                      Absent
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Reporting Watchlists (Session health & watchlist) */}
      <div className="grid gap-6 xl:grid-cols-2 animate-fade-in-up">
        <Card>
          <CardHeader>
            <CardTitle>Session Health Snapshot</CardTitle>
            <CardDescription>
              Latest attendance sessions running within branch scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsResult.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {new Date(item.attendanceDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {snapshotBatchCodeMap.get(item.batchId) ?? 'N/A'}
                      </TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.recordCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Attendance Watchlist</CardTitle>
            <CardDescription>
              Top 10 student summaries below 75% for branch{' '}
              <span className="font-semibold text-slate-800">
                {branchNameById.get(selectedBranchId) ?? 'selected branch'}
              </span>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowAttendance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center">
                <BarChart3 className="mx-auto mb-3 h-10 w-10 text-[color:var(--ims-muted)]" />
                <p className="text-sm font-semibold text-[color:var(--ims-ink)]">
                  No attendance watchlist yet.
                </p>
                <p className="mt-1 text-sm text-[color:var(--ims-muted)]">
                  Submit rosters first to automatically calculate attendance
                  percentages.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Batch / Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowAttendance.map((item) => {
                      const e = watchlistMap.get(item.enrollmentId);
                      const studentName = e
                        ? `${e.studentProfile.person.firstName} ${e.studentProfile.person.lastName}`
                        : 'N/A';
                      const studentNumber = e
                        ? e.studentProfile.studentNumber
                        : 'N/A';
                      const batchCode = e ? e.batch?.batchCode : 'N/A';
                      const courseName = e ? e.course.nameEnglish : 'N/A';
                      return (
                        <TableRow key={item.enrollmentId}>
                          <TableCell>
                            <div className="font-semibold text-slate-800">
                              {studentName}
                            </div>
                            <div className="text-xs text-[color:var(--ims-muted)]">
                              {studentNumber}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs font-semibold">
                              {batchCode}
                            </div>
                            <div className="text-xs text-[color:var(--ims-muted)] truncate max-w-[200px]">
                              {courseName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.attendancePercentage < 75
                                  ? 'error'
                                  : 'success'
                              }
                            >
                              {item.attendancePercentage < 75
                                ? 'At Risk'
                                : 'Healthy'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-900">
                            {item.attendancePercentage.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
