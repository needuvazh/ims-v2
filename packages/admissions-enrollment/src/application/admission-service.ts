import { Prisma, PrismaClient } from '@prisma/client';
import { IAdmissionRepository, CreateStudentProfileAdmissionInput, CreateAdmissionInput } from '../domain/admission';
import { RequirementsResolver } from './requirements-resolver';
import { DocumentsService } from '@ims/documents';

export class AdmissionService {
  constructor(
    private readonly admissionRepository: IAdmissionRepository,
    private readonly prisma: PrismaClient
  ) {}

  async createStudentAdmission(input: CreateStudentProfileAdmissionInput, tx?: Prisma.TransactionClient) {
    const run = async (activeClient: Prisma.TransactionClient) => {
      // 1. Resolve existing person and profile to check for duplicate active admission
      const existingPerson = await this.admissionRepository.findPersonByEmailOrPhone(input.email || null, input.phone || null, activeClient);
      let existingProfile = null;
      if (existingPerson) {
        existingProfile = await this.admissionRepository.findStudentProfileByPersonId(existingPerson.id, activeClient);
      }

      let isNewProfile = false;
      let studentProfileId = '';
      let studentNumber = '';

      if (existingProfile) {
        studentProfileId = existingProfile.id;
        studentNumber = existingProfile.studentNumber;
        
        // Check for active admission in target branch
        const hasActive = await this.admissionRepository.hasActiveAdmission(studentProfileId, input.branchId, activeClient);
        if (hasActive) {
          throw new Error('ERR_ADM_ACTIVE_ADMISSION_EXISTS');
        }
      } else {
        studentNumber = await this.admissionRepository.getNextStudentNumber(activeClient);
        isNewProfile = true;
      }

      // 2. Create records
      const result = await this.admissionRepository.createStudentProfileAndAdmission(input, studentNumber, activeClient);

      // 3. Publish outbox events in same transaction
      await activeClient.outboxEvent.create({
        data: {
          eventType: 'AdmissionCreated',
          aggregateType: 'Admission',
          aggregateId: result.admissionId,
          payload: {
            admissionId: result.admissionId,
            admissionNumber: result.admissionNumber,
            studentProfileId: result.studentProfileId,
            personId: result.personId,
            branchId: input.branchId,
            leadId: input.leadId || null,
            courseId: input.courseId || null,
          },
          availableAt: new Date(),
        }
      });

      if (isNewProfile) {
        await activeClient.outboxEvent.create({
          data: {
            eventType: 'StudentProfileCreated',
            aggregateType: 'StudentProfile',
            aggregateId: result.studentProfileId,
            payload: {
              studentProfileId: result.studentProfileId,
              studentNumber,
              personId: result.personId,
              status: 'Active',
              joinedAt: new Date(),
            },
            availableAt: new Date(),
          }
        });
      }

      // 4. Audit Log
      await activeClient.auditLog.create({
        data: {
          action: 'AdmissionCreated',
          entityType: 'Admission',
          entityId: result.admissionId,
          performedBy: null,
          branchId: input.branchId,
          performedAt: new Date(),
          module: 'AdmissionsEnrollment',
          newValue: {
            status: 'Draft',
            studentProfileId: result.studentProfileId,
            branchId: input.branchId,
          }
        }
      });

      return result;
    };

    if (tx) {
      return run(tx);
    } else {
      return this.prisma.$transaction(run);
    }
  }

  async createAdmissionDraftDirect(input: CreateAdmissionInput, branchId: string, tx?: Prisma.TransactionClient) {
    const run = async (activeClient: Prisma.TransactionClient) => {
      // Check for active admission in target branch
      const hasActive = await this.admissionRepository.hasActiveAdmission(input.studentProfileId, branchId, activeClient);
      if (hasActive) {
        throw new Error('ERR_ADM_ACTIVE_ADMISSION_EXISTS');
      }

      const admissionNumber = await this.admissionRepository.getNextAdmissionNumber(activeClient);
      const result = await this.admissionRepository.createAdmissionDraft(
        input.studentProfileId,
        branchId,
        admissionNumber,
        input.courseId,
        input.leadId,
        activeClient
      );

      const admission = await activeClient.admission.findUnique({
        where: { id: result.admissionId }
      });

      // Write transactional outbox event
      await activeClient.outboxEvent.create({
        data: {
          eventType: 'AdmissionCreated',
          aggregateType: 'Admission',
          aggregateId: result.admissionId,
          payload: {
            admissionId: result.admissionId,
            admissionNumber,
            studentProfileId: input.studentProfileId,
            personId: admission?.personId,
            branchId,
            leadId: input.leadId || null,
            courseId: input.courseId || null,
          },
          availableAt: new Date(),
        }
      });

      // Write audit log
      await activeClient.auditLog.create({
        data: {
          action: 'AdmissionCreated',
          entityType: 'Admission',
          entityId: result.admissionId,
          performedBy: null,
          branchId,
          performedAt: new Date(),
          module: 'AdmissionsEnrollment',
          newValue: {
            status: 'Draft',
            admissionNumber,
            studentProfileId: input.studentProfileId,
            branchId,
          }
        }
      });

      return result;
    };

    if (tx) {
      return run(tx);
    } else {
      return this.prisma.$transaction(run);
    }
  }

  async submitAdmission(admissionId: string, actorId: string, tx?: Prisma.TransactionClient) {
    const run = async (activeClient: Prisma.TransactionClient) => {
      const admission = await activeClient.admission.findUnique({
        where: { id: admissionId }
      });

      if (!admission) {
        throw new Error('ERR_ADMISSION_NOT_FOUND');
      }

      if (admission.admissionStatus !== 'Draft') {
        throw new Error('ERR_ADMISSION_INVALID_STATUS_TRANSITION');
      }

      await activeClient.admission.update({
        where: { id: admissionId },
        data: {
          admissionStatus: 'Submitted',
          submittedAt: new Date(),
        }
      });

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          action: 'AdmissionSubmitted',
          entityType: 'Admission',
          entityId: admissionId,
          performedBy: actorId,
          branchId: admission.branchId,
          performedAt: new Date(),
          module: 'AdmissionsEnrollment',
          oldValue: { status: 'Draft' },
          newValue: { status: 'Submitted' }
        }
      });
    };

    if (tx) {
      await run(tx);
    } else {
      await this.prisma.$transaction(run);
    }
  }

  async approveAdmission(admissionId: string, actorId: string, tx?: Prisma.TransactionClient) {
    const run = async (activeClient: Prisma.TransactionClient) => {
      const admission = await activeClient.admission.findUnique({
        where: { id: admissionId },
      });

      if (!admission) {
        throw new Error('ERR_ADMISSION_NOT_FOUND');
      }

      if (admission.admissionStatus !== 'Submitted') {
        throw new Error('ERR_ADMISSION_INVALID_STATUS_TRANSITION');
      }

      // Run verification gate
      await this.verifyAdmissionDocumentsGate(admissionId, activeClient);

      // Update status to Approved
      await activeClient.admission.update({
        where: { id: admissionId },
        data: {
          admissionStatus: 'Approved',
          approvedAt: new Date(),
          approvedBy: actorId,
        },
      });

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          action: 'AdmissionApproved',
          entityType: 'Admission',
          entityId: admissionId,
          performedBy: actorId,
          branchId: admission.branchId,
          performedAt: new Date(),
          module: 'AdmissionsEnrollment',
          oldValue: { status: 'Submitted' },
          newValue: { status: 'Approved' }
        }
      });
    };

    if (tx) {
      await run(tx);
    } else {
      await this.prisma.$transaction(run);
    }
  }

  async rejectAdmission(admissionId: string, remarks: string, actorId: string, tx?: Prisma.TransactionClient) {
    if (!remarks || remarks.trim() === '') {
      throw new Error('ERR_ADMISSION_REJECTION_REMARKS_REQUIRED');
    }

    const run = async (activeClient: Prisma.TransactionClient) => {
      const admission = await activeClient.admission.findUnique({
        where: { id: admissionId }
      });

      if (!admission) {
        throw new Error('ERR_ADMISSION_NOT_FOUND');
      }

      if (admission.admissionStatus !== 'Submitted') {
        throw new Error('ERR_ADMISSION_INVALID_STATUS_TRANSITION');
      }

      await activeClient.admission.update({
        where: { id: admissionId },
        data: {
          admissionStatus: 'Rejected',
          rejectedAt: new Date(),
          rejectedBy: actorId,
          remarks,
        }
      });

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          action: 'AdmissionRejected',
          entityType: 'Admission',
          entityId: admissionId,
          performedBy: actorId,
          branchId: admission.branchId,
          performedAt: new Date(),
          module: 'AdmissionsEnrollment',
          oldValue: { status: 'Submitted' },
          newValue: { status: 'Rejected', remarks }
        }
      });
    };

    if (tx) {
      await run(tx);
    } else {
      await this.prisma.$transaction(run);
    }
  }

  async cancelAdmission(admissionId: string, actorId: string, tx?: Prisma.TransactionClient) {
    const run = async (activeClient: Prisma.TransactionClient) => {
      const admission = await activeClient.admission.findUnique({
        where: { id: admissionId }
      });

      if (!admission) {
        throw new Error('ERR_ADMISSION_NOT_FOUND');
      }

      if (admission.admissionStatus !== 'Draft' && admission.admissionStatus !== 'Submitted') {
        throw new Error('ERR_ADMISSION_INVALID_STATUS_TRANSITION');
      }

      await activeClient.admission.update({
        where: { id: admissionId },
        data: {
          admissionStatus: 'Cancelled',
          cancelledAt: new Date(),
          cancelledBy: actorId,
        }
      });

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          action: 'AdmissionCancelled',
          entityType: 'Admission',
          entityId: admissionId,
          performedBy: actorId,
          branchId: admission.branchId,
          performedAt: new Date(),
          module: 'AdmissionsEnrollment',
          oldValue: { status: admission.admissionStatus },
          newValue: { status: 'Cancelled' }
        }
      });
    };

    if (tx) {
      await run(tx);
    } else {
      await this.prisma.$transaction(run);
    }
  }

  async verifyAdmissionDocumentsGate(admissionId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;

    const admission = await client.admission.findUnique({
      where: { id: admissionId },
      include: {
        lead: true,
      },
    });

    if (!admission) {
      throw new Error('ERR_ADMISSION_NOT_FOUND');
    }

    const courseId = admission.courseId || admission.lead?.interestedCourseId || '';
    if (!courseId) {
      return;
    }

    // Resolve requirements
    const resolver = new RequirementsResolver(this.prisma);
    const requiredTypes = await resolver.getRequiredDocuments(courseId, admission.branchId, client);

    if (requiredTypes.length === 0) {
      return;
    }

    // Fetch person's documents
    const documentsService = new DocumentsService(this.prisma);
    const documents = await documentsService.getDocumentsByOwner(admission.personId, 'Person', client);

    const missingTypes: string[] = [];

    for (const reqType of requiredTypes) {
      const hasVerifiedDoc = documents.some((doc) => {
        if (doc.documentType !== reqType || doc.status !== 'Active') {
          return false;
        }
        const latestVerification = doc.verifications[0];
        return latestVerification && latestVerification.outcome === 'Verified';
      });

      if (!hasVerifiedDoc) {
        missingTypes.push(reqType);
      }
    }

    if (missingTypes.length > 0) {
      throw new Error(`ERR_DOCUMENTS_VERIFICATION_GATE_FAILED: Missing or unverified documents: ${missingTypes.join(', ')}`);
    }
  }
}
