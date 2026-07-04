import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { hasPermission } from '@ims/shared-auth';
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
import { ClipboardList, Layers, PlayCircle } from 'lucide-react';

export const metadata = { title: 'Attendance Sessions - Admin Portal | ASTI IMS' };

function statusBadge(status: string) {
  if (status === 'Draft' || status === 'Open') return <Badge variant="info">{status}</Badge>;
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

  const branchRows = allowedBranchIds.length > 0
    ? await prisma.branch.findMany({
        where: { id: { in: allowedBranchIds }, isDeleted: false },
        select: { id: true, branchName: true },
      })
    : [];
  const branchNameById = new Map(branchRows.map((branch) => [branch.id, branch.branchName]));

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

  const openCount = attendanceSessions.filter((item) => item.status === 'Open' || item.status === 'Draft').length;
  const submittedCount = attendanceSessions.filter((item) => item.status === 'Submitted').length;
  const lockedCount = attendanceSessions.filter((item) => item.status === 'Locked').length;

  return (
    <div className="space-y-6">
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
          <CardDescription>Use the session list to drill into roster marking, submission, locking, and correction workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-[color:var(--ims-muted)]" />
              <p className="text-sm font-semibold text-[color:var(--ims-ink)]">No attendance sessions yet.</p>
              <p className="mt-1 text-sm text-[color:var(--ims-muted)]">
                Open a delivery session from the batch detail screen to create the attendance session and roster.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Delivery Session</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceSessions.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{new Date(item.attendanceDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-[color:var(--ims-ink)]">{item.session.titleEnglish}</div>
                          <div className="text-xs text-[color:var(--ims-muted)]">
                            #{item.session.sessionNumber} | {item.session.startTime} - {item.session.endTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{item.session.batch.batchCode}</TableCell>
                      <TableCell>{branchNameById.get(item.branchId) ?? item.branchId}</TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="text-right font-semibold">{item.records.length}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          {item.records.length === 0 ? (
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
                          <LinkButton href={`/batches/${item.batchId}`} size="sm" variant="outline" className="gap-2">
                            <PlayCircle className="h-4 w-4" />
                            Open Batch
                          </LinkButton>
                          <LinkButton href={`/attendance/records?sessionId=${item.id}`} size="sm" variant="ghost" className="gap-2">
                            <ClipboardList className="h-4 w-4" />
                            {canMarkAttendance ? 'Mark Attendance' : 'View Records'}
                          </LinkButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How Sessions Are Created</CardTitle>
          <CardDescription>Attendance sessions are opened from the delivery session row in the batch screen.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-[color:var(--ims-muted)] md:grid-cols-2">
          <p>1. Open a batch detail page and find the delivery session.</p>
          <p>2. Click <span className="font-semibold text-[color:var(--ims-ink)]">Open Attendance</span>.</p>
          <p>3. The UI creates the AttendanceSession and roster rows for active enrollments.</p>
          <p>4. Return here to review status, records, and downstream correction workflow.</p>
        </CardContent>
      </Card>
    </div>
  );
}
