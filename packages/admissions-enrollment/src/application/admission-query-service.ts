import { PrismaClient } from '@prisma/client';

export class AdmissionQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAdmissionDetail(admissionId: string, branchIdScope: string[]) {
    const admission = await this.prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        person: true,
        studentProfile: true,
        branch: true,
        course: true,
        lead: true,
      }
    });

    if (!admission || admission.isDeleted) {
      throw new Error('ERR_ADMISSION_NOT_FOUND');
    }

    if (!branchIdScope.includes(admission.branchId)) {
      throw new Error('ERR_AUTH_BRANCH_DENIED');
    }

    // Fetch chronological status history / timeline from AuditLog
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityId: admissionId,
        entityType: 'Admission',
      },
      orderBy: {
        performedAt: 'asc'
      }
    });

    return {
      admission: {
        id: admission.id,
        admissionNumber: admission.admissionNumber,
        admissionStatus: admission.admissionStatus,
        admissionDate: admission.admissionDate,
        submittedAt: admission.submittedAt,
        approvedAt: admission.approvedAt,
        approvedBy: admission.approvedBy,
        rejectedAt: admission.rejectedAt,
        rejectedBy: admission.rejectedBy,
        cancelledAt: admission.cancelledAt,
        cancelledBy: admission.cancelledBy,
        remarks: admission.remarks,
        branchId: admission.branchId,
        branchName: admission.branch?.branchName,
        courseId: admission.courseId,
        courseName: admission.course?.nameEnglish,
        studentProfile: {
          id: admission.studentProfileId,
          studentNumber: admission.studentProfile?.studentNumber,
          status: admission.studentProfile?.status,
        },
        person: {
          id: admission.personId,
          firstName: admission.person?.firstName,
          lastName: admission.person?.lastName,
          email: admission.person?.email,
          mobile: admission.person?.mobile,
        },
        leadId: admission.leadId,
      },
      history: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        performedBy: log.performedBy,
        performedAt: log.performedAt,
        oldValue: log.oldValue as Record<string, any> | null,
        newValue: log.newValue as Record<string, any> | null,
      }))
    };
  }
}
