import { notFound } from 'next/navigation';
import { assertPermission } from '@/lib/auth-guard';
import { LeadDetailsClient } from './_components/lead-details-client';
import { type Uuid } from '@ims/shared-kernel';
import { prisma } from '@ims/database';

export const metadata = { title: 'Lead Details - CRM | ASTI IMS' };

// Forced reload: 2026-07-01T09:08

export default async function LeadDetailsPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ followUpPage?: string }>;
}) {
  const { id: leadId } = await props.params;
  const searchParams = await props.searchParams;

  // Enforce lead read permissions
  const session = await assertPermission('lead.read');

  const { branchScopeResolver, leadService } = await import('@/lib/runtime');

  const lead = await leadService.getLeadById(leadId);
  if (!lead) {
    notFound();
  }

  // Branch Scope Check
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );
  if (
    allowedBranchIds.length > 0 &&
    !allowedBranchIds.includes(lead.branchId as Uuid)
  ) {
    throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
  }

  // Counselor Scope Check
  const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
  if (!hasGlobalRead && lead.counselorId !== session.userId) {
    throw new Error('ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION');
  }

  // Fetch multiple notes
  const rawNotes = await prisma.leadNote.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  const notes = rawNotes.map((n) => ({
    id: n.id,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
    authorName: n.author?.username || 'System',
  }));

  // Fetch all LeadStageHistory records for the chronological timeline chart
  const stageHistoryLogs = await prisma.leadStageHistory.findMany({
    where: { leadId },
    orderBy: { performedAt: 'asc' },
    include: {
      performer: {
        select: {
          username: true,
        },
      },
    },
  });

  const mappedStageHistory = stageHistoryLogs.map((log) => ({
    id: log.id,
    performedAt: log.performedAt.toISOString(),
    performerName: log.performer?.username || 'System',
    oldStage: log.oldStage,
    newStage: log.newStage,
    lostReasonCode: log.lostReasonCode,
    lostReasonNotes: log.lostReasonNotes,
  }));

  // Fetch paginated follow-ups (display last 10 records)
  const followUpPage = searchParams.followUpPage
    ? parseInt(searchParams.followUpPage, 10)
    : 1;
  const followUpLimit = 10;
  const followUpSkip = (followUpPage - 1) * followUpLimit;

  const [followUps, followUpsTotal] = await Promise.all([
    prisma.leadFollowUp.findMany({
      where: { leadId, isDeleted: false },
      orderBy: { followUpDate: 'desc' },
      skip: followUpSkip,
      take: followUpLimit,
    }),
    prisma.leadFollowUp.count({
      where: { leadId, isDeleted: false },
    }),
  ]);

  const mappedFollowUps = followUps.map((f) => ({
    id: f.id,
    followUpDate: f.followUpDate.toISOString(),
    followUpType: f.followUpType,
    agenda: f.notes || '',
    outcome: f.outcome,
    notes: f.notes,
    status: f.status,
  }));

  // Map database lead fields to match UI expectations
  const mappedLead = {
    ...lead,
    branch: lead.branch
      ? { id: lead.branchId, name: lead.branch.branchName }
      : null,
    counselor: lead.counselor
      ? { id: lead.counselorId, name: lead.counselor.username }
      : null,
    interestedCourse: lead.interestedCourse
      ? {
          id: lead.interestedCourseId,
          nameEnglish: lead.interestedCourse.nameEnglish,
        }
      : null,
  };

  // Fetch existing documents for the lead's Person
  const existingDocs = await prisma.document.findMany({
    where: {
      isDeleted: false,
      owners: {
        some: {
          ownerId: lead.personId,
          ownerType: 'Person',
        },
      },
    },
  });

  const initialDocuments = existingDocs.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    fileKey: doc.fileKey,
    fileType: doc.fileType,
    documentType: doc.documentType,
  }));

  let admissionData = null;
  let enrollmentData = null;

  if (lead.stage === 'Converted' || lead.stage === 'Won') {
    const dbAdmission = lead.admissionNumber
      ? await prisma.admission.findUnique({
          where: { admissionNumber: lead.admissionNumber },
          select: {
            id: true,
            admissionNumber: true,
            admissionStatus: true,
            admissionDate: true,
            approvedAt: true,
          },
        })
      : await prisma.admission.findFirst({
          where: { leadId, isDeleted: false },
          select: {
            id: true,
            admissionNumber: true,
            admissionStatus: true,
            admissionDate: true,
            approvedAt: true,
          },
        });

    if (dbAdmission) {
      admissionData = {
        id: dbAdmission.id,
        admissionNumber: dbAdmission.admissionNumber,
        admissionStatus: dbAdmission.admissionStatus,
        admissionDate: dbAdmission.admissionDate.toISOString(),
        approvedAt: dbAdmission.approvedAt?.toISOString() || null,
      };
    }

    const dbEnrollment = await prisma.enrollment.findFirst({
      where: { leadId, isDeleted: false },
      include: {
        batch: {
          select: {
            id: true,
            batchCode: true,
            startDate: true,
          },
        },
        courseCompletion: {
          select: {
            id: true,
            completionStatus: true,
            attendancePercentage: true,
            attendanceOutcome: true,
            examOutcome: true,
            paymentOutcome: true,
          },
        },
        certificates: {
          where: { isActive: true },
          select: {
            id: true,
            certificateNumber: true,
            certificateStatus: true,
            issuedDate: true,
            certificateUrl: true,
          },
        },
        invoices: {
          where: { isDeleted: false },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            paidAmount: true,
            outstandingAmount: true,
            dueDate: true,
          },
        },
      },
    });

    if (dbEnrollment) {
      // Calculate attendance statistics
      const [presentCount, totalAttendanceCount] = await Promise.all([
        prisma.attendanceRecord.count({
          where: {
            enrollmentId: dbEnrollment.id,
            status: { in: ['Present', 'Late'] },
            isDeleted: false,
          },
        }),
        prisma.attendanceRecord.count({
          where: {
            enrollmentId: dbEnrollment.id,
            isDeleted: false,
          },
        }),
      ]);

      // Fetch last 5 attendance logs for progress view
      const dbAttendanceLogs = await prisma.attendanceRecord.findMany({
        where: {
          enrollmentId: dbEnrollment.id,
          isDeleted: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      });

      enrollmentData = {
        id: dbEnrollment.id,
        enrollmentNumber: dbEnrollment.enrollmentNumber,
        enrollmentStatus: dbEnrollment.enrollmentStatus,
        enrollmentType: dbEnrollment.enrollmentType,
        studentProfileId: dbEnrollment.studentProfileId,
        batch: dbEnrollment.batch
          ? {
              id: dbEnrollment.batch.id,
              batchCode: dbEnrollment.batch.batchCode,
              startDate: dbEnrollment.batch.startDate.toISOString(),
            }
          : null,
        courseCompletion: dbEnrollment.courseCompletion
          ? {
              id: dbEnrollment.courseCompletion.id,
              completionStatus: dbEnrollment.courseCompletion.completionStatus,
              attendancePercentage: dbEnrollment.courseCompletion.attendancePercentage ? Number(dbEnrollment.courseCompletion.attendancePercentage) : null,
              attendanceOutcome: dbEnrollment.courseCompletion.attendanceOutcome,
              examOutcome: dbEnrollment.courseCompletion.examOutcome,
              paymentOutcome: dbEnrollment.courseCompletion.paymentOutcome,
            }
          : null,
        certificates: dbEnrollment.certificates.map((c) => ({
          id: c.id,
          certificateNumber: c.certificateNumber,
          certificateStatus: c.certificateStatus,
          issuedDate: c.issuedDate?.toISOString() || null,
          certificateUrl: c.certificateUrl,
        })),
        invoices: dbEnrollment.invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          totalAmount: Number(inv.totalAmount),
          paidAmount: Number(inv.paidAmount),
          outstandingAmount: Number(inv.outstandingAmount),
          dueDate: inv.dueDate.toISOString(),
        })),
        attendance: {
          presentCount,
          totalCount: totalAttendanceCount,
          percentage: totalAttendanceCount > 0 ? Math.round((presentCount / totalAttendanceCount) * 100) : 0,
          logs: dbAttendanceLogs.map((log) => ({
            id: log.id,
            status: log.status,
            date: log.createdAt.toISOString(),
          })),
        },
      };
    }
  }

  return (
    <div className="p-6">
      <LeadDetailsClient
        lead={mappedLead}
        notes={notes}
        stageHistory={mappedStageHistory}
        followUps={mappedFollowUps}
        followUpsTotal={followUpsTotal}
        currentFollowUpPage={followUpPage}
        admissionId={admissionData?.id || null}
        initialDocuments={initialDocuments}
        admission={admissionData}
        enrollment={enrollmentData}
        sessionPermissions={session.permissions}
      />
    </div>
  );
}
