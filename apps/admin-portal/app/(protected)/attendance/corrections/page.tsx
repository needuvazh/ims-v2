import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { hasPermission } from '@ims/shared-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LinkButton,
  PageHeader,
} from '@ims/shared-ui';
import { ClipboardList, Layers } from 'lucide-react';
import { AttendanceCorrectionsQueue } from '../_components/attendance-corrections-queue';

export const metadata = { title: 'Attendance Corrections - Admin Portal | ASTI IMS' };

export default async function AttendanceCorrectionsPage() {
  const session = await assertPermission('attendance.correction.review');
  const { branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = (
    await branchScopeResolver.resolveAllowedBranches(
      session.userId as any,
      session.activeBranchId as any,
    )
  ).map((value) => String(value));
  const canApprove = hasPermission(session, 'attendance.correction.approve');
  const canReject = hasPermission(session, 'attendance.correction.reject');

  const corrections = await prisma.attendanceCorrection.findMany({
    where: {
      isDeleted: false,
      branchId: { in: allowedBranchIds },
    },
    include: {
      attendanceRecord: {
        include: {
          attendanceSession: {
            include: { batch: true, session: true },
          },
          studentProfile: {
            include: {
              person: true,
            },
          },
        },
      },
      requestedByUser: true,
      approvedByUser: true,
      rejectedByUser: true,
    },
    orderBy: [{ requestedAt: 'desc' }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Attendance Corrections"
      description="Review correction requests, approval outcomes, rejection reasons, and aging by branch."
      actions={
          <LinkButton href="/attendance/sessions" variant="outline" className="gap-2">
            <Layers className="h-4 w-4" />
            Sessions
          </LinkButton>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Correction Queue</CardTitle>
          <CardDescription>Pending and historical correction requests for the authorized branch scope.</CardDescription>
        </CardHeader>
        <CardContent>
          {corrections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-[color:var(--ims-muted)]" />
              <p className="text-sm font-semibold text-[color:var(--ims-ink)]">No corrections found.</p>
              <p className="mt-1 text-sm text-[color:var(--ims-muted)]">
                Mark attendance first, then request a correction from the record workflow.
              </p>
            </div>
          ) : (
            <AttendanceCorrectionsQueue
              canApprove={canApprove}
              canReject={canReject}
              corrections={corrections.map((correction) => ({
                id: correction.id,
                branchId: correction.branchId,
                oldStatus: correction.oldStatus,
                newStatus: correction.newStatus,
                reason: correction.reason,
                status: correction.status,
                requestedAt: correction.requestedAt,
                requestedByLabel: correction.requestedByUser?.email ?? correction.requestedBy,
                studentName: `${correction.attendanceRecord.studentProfile.person.firstName} ${correction.attendanceRecord.studentProfile.person.lastName}`,
                studentNumber: correction.attendanceRecord.studentProfile.studentNumber,
                batchCode: correction.attendanceRecord.attendanceSession.batch.batchCode,
                sessionTitle: correction.attendanceRecord.attendanceSession.session.titleEnglish,
                sessionNumber: correction.attendanceRecord.attendanceSession.session.sessionNumber,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
