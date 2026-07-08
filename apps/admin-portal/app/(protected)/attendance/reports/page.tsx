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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ims/shared-ui';
import { BarChart3, ClipboardList, Layers } from 'lucide-react';

export const metadata = {
  title: 'Attendance Reports - Admin Portal | ASTI IMS',
};

export default async function AttendanceReportsPage() {
  const session = await assertPermission('attendance.report.daily.view');
  const { branchScopeResolver, attendanceQueryService } =
    await import('@/lib/runtime');
  const { prisma } = await import('@ims/database');
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
  const summaryBranchId =
    (session.activeBranchId && allowedBranchIds.includes(session.activeBranchId)
      ? session.activeBranchId
      : allowedBranchIds[0]) ?? null;

  const sessionsResult = (await attendanceQueryService.listSessions({
    branchIds: allowedBranchIds,
    page: 1,
    pageSize: 10,
    batchId: null,
    sessionId: null,
    attendanceDateFrom: null,
    attendanceDateTo: null,
    status: null,
  })) as {
    items: Array<{
      id: string;
      attendanceDate: Date;
      batchId: string;
      status: string;
      recordCount: number;
    }>;
    total: number;
    page: number;
    pageSize: number;
  };

  const branchSummary = (
    summaryBranchId
      ? await attendanceQueryService.branchSummary(
          summaryBranchId,
          allowedBranchIds,
        )
      : []
  ) as Array<{
    enrollmentId: string;
    studentProfileId: string;
    branchId: string;
    attendancePercentage: number;
  }>;

  const submittedCount = sessionsResult.items.filter(
    (item) => item.status === 'Submitted',
  ).length;
  const draftCount = sessionsResult.items.filter(
    (item) => item.status === 'Draft' || item.status === 'Open',
  ).length;
  const lockedCount = sessionsResult.items.filter(
    (item) => item.status === 'Locked',
  ).length;

  const lowAttendance = [...branchSummary]
    .sort(
      (left, right) => left.attendancePercentage - right.attendancePercentage,
    )
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Attendance Reports"
        description="Daily attendance snapshots, session health, and low-attendance indicators for the authorized branch scope."
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
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Draft / Open</CardDescription>
            <CardTitle className="text-3xl">{draftCount}</CardTitle>
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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Session Health Snapshot</CardTitle>
            <CardDescription>
              Latest attendance sessions within branch scope.
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
                      <TableCell className="font-mono text-xs">
                        {item.batchId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'Submitted'
                              ? 'success'
                              : item.status === 'Locked'
                                ? 'default'
                                : item.status === 'Cancelled'
                                  ? 'error'
                                  : 'outline'
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
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
              Student summaries for{' '}
              {branchNameById.get(summaryBranchId ?? '') ??
                'the selected branch'}
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowAttendance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center">
                <BarChart3 className="mx-auto mb-3 h-10 w-10 text-[color:var(--ims-muted)]" />
                <p className="text-sm font-semibold text-[color:var(--ims-ink)]">
                  No attendance analytics yet.
                </p>
                <p className="mt-1 text-sm text-[color:var(--ims-muted)]">
                  Open and submit attendance sessions first so the attendance
                  percentage report can be calculated.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Enrollment</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowAttendance.map((item) => (
                      <TableRow key={item.enrollmentId}>
                        <TableCell className="font-mono text-xs">
                          {item.enrollmentId}
                        </TableCell>
                        <TableCell className="text-sm text-[color:var(--ims-muted)]">
                          {item.studentProfileId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.attendancePercentage < 75
                                ? 'error'
                                : 'outline'
                            }
                          >
                            {item.attendancePercentage < 75
                              ? 'At Risk'
                              : 'Healthy'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.attendancePercentage.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Entry Points</CardTitle>
          <CardDescription>
            Operational report shortcuts for branch-scoped attendance review.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Daily Attendance', '/attendance/reports?type=daily'],
            ['Batch Attendance', '/attendance/reports?type=batch'],
            ['Student Attendance', '/attendance/records'],
            ['Correction Aging', '/attendance/corrections'],
          ].map(([label, href]) => (
            <LinkButton
              key={label}
              href={href as string}
              variant="outline"
              className="justify-start gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              {label}
            </LinkButton>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
