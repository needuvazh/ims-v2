import { PrismaClient } from '@prisma/client';
import { RequirementsResolver } from './requirements-resolver';

export class AdmissionQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAdmissionDetail(admissionId: string, branchIdScope: string[]) {
    const admission = await this.prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        person: true,
        studentProfile: {
          include: {
            enrollments: {
              where: { isDeleted: false },
              include: {
                course: true,
                batch: true,
                branch: true,
              },
            },
          },
        },
        branch: true,
        course: true,
        lead: true,
      },
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
        performedAt: 'asc',
      },
    });

    // Resolve required documents list using the resolver
    const resolver = new RequirementsResolver(this.prisma);
    const requiredDocTypes = await resolver.getRequiredDocuments(
      admission.courseId,
      admission.branchId,
    );

    // Fetch documents linked to the Person
    const uploadedDocs = await this.prisma.document.findMany({
      where: {
        owners: {
          some: {
            ownerId: admission.personId,
            ownerType: 'Person',
          },
        },
        isDeleted: false,
      },
      include: {
        verifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Map both resolved and uploaded docs into a clean document status structure
    const documents = requiredDocTypes.map((type) => {
      const doc = uploadedDocs.find((d) => d.documentType === type);
      const verification = doc?.verifications?.[0];
      return {
        id: doc?.id || null,
        documentType: type,
        fileName: doc?.fileName || null,
        fileKey: doc?.fileKey || null,
        status: doc?.status || null,
        verificationOutcome: verification?.outcome || 'NotUploaded',
        verifiedAt: verification?.verifiedAt || null,
        verifiedBy: verification?.verifiedBy || null,
        remarks: verification?.remarks || null,
      };
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
          idCardNumber: admission.studentProfile?.idCardNumber,
          idCardIssued: admission.studentProfile?.idCardIssued,
          enrollments: (admission.studentProfile as any)?.enrollments || [],
        },
        person: {
          id: admission.personId,
          firstName: admission.person?.firstName,
          lastName: admission.person?.lastName,
          email: admission.person?.email,
          mobile: admission.person?.mobile,
        },
        leadId: admission.leadId,
        documents,
      },
      history: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        performedBy: log.performedBy,
        performedAt: log.performedAt,
        oldValue: log.oldValue as Record<string, any> | null,
        newValue: log.newValue as Record<string, any> | null,
      })),
    };
  }
}
