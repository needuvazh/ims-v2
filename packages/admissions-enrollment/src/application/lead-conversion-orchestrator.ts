import { PrismaClient } from '@prisma/client';
import { LeadService } from '@ims/crm-leads';
import { AdmissionService } from './admission-service';
import { DocumentCaptureInput } from '@ims/documents';

export class LeadConversionOrchestrator {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly leadService: LeadService,
    private readonly admissionService: AdmissionService
  ) {}

  async convertLeadToAdmission(leadId: string, documents: DocumentCaptureInput[], actorId?: string) {
    // We use an interactive transaction to orchestrate across modules
    return this.prisma.$transaction(async (tx) => {
      // 1. Mark the lead as converted. 
      // If it's already converted, this will throw an error and abort the tx.
      const lead = await this.leadService.convertLead(leadId, documents, tx, actorId);

      // 2. Create the StudentProfile and Admission record.
      // This will check for duplicates based on email/phone and throw an error if found.
      const admissionResult = await this.admissionService.createStudentAdmission({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        branchId: lead.branchId,
        leadId: lead.id,
        courseId: lead.interestedCourseId,
      }, tx);

      // 3. Log the audit event (simulated or direct write)
      await tx.auditLog.create({
        data: {
          action: 'LeadConverted',
          entityType: 'Lead',
          entityId: lead.id,
          performedBy: actorId || null,
          branchId: lead.branchId,
          performedAt: new Date(),
          module: 'AdmissionsEnrollment',
          newValue: {
            studentProfileId: admissionResult.studentProfileId,
            admissionId: admissionResult.admissionId,
          }
        }
      });

      return admissionResult;
    });
  }
}
