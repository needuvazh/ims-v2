import { PrismaClient } from '@prisma/client';
import { LeadService } from '@ims/crm-leads';
import { AdmissionService } from './admission-service';
import { EnrollmentService } from './enrollment-service';
import { DocumentCaptureInput } from '@ims/documents';

export class LeadConversionOrchestrator {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly leadService: LeadService,
    private readonly admissionService: AdmissionService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  async convertLeadToAdmission(
    leadId: string,
    batchId: string | null | undefined,
    documents: DocumentCaptureInput[],
    discountCode?: string,
    manualDiscountAmount?: number,
    actorId?: string,
  ) {
    // We use an interactive transaction to orchestrate across modules
    return this.prisma.$transaction(async (tx) => {
      // 1. Mark the lead as converted.
      // If it's already converted, this will throw an error and abort the tx.
      const lead = await this.leadService.convertLead(
        leadId,
        documents,
        tx,
        actorId,
      );

      // 1.5 Auto-approve document verifications in Documents context
      const personDocs = await tx.documentOwner.findMany({
        where: {
          ownerId: lead.personId,
          ownerType: 'Person',
        },
        select: {
          documentId: true,
        },
      });

      const documentIds = personDocs.map((d) => d.documentId);
      if (documentIds.length > 0) {
        await tx.documentVerification.updateMany({
          where: {
            documentId: { in: documentIds },
            outcome: 'Pending',
          },
          data: {
            outcome: 'Verified',
            verifiedBy: actorId || null,
            verifiedAt: new Date(),
            remarks: 'Auto-verified during lead conversion',
          },
        });
      }

      // 2. Check if the person already has an existing student profile and active admission.
      const existingPerson = await tx.person.findFirst({
        where: {
          isDeleted: false,
          OR: [
            lead.email ? { email: lead.email } : undefined,
            lead.phone ? { mobile: lead.phone } : undefined,
            lead.nationalId ? { nationalId: lead.nationalId } : undefined,
          ].filter(Boolean) as any[],
        },
        include: {
          studentProfiles: {
            where: { isDeleted: false },
            include: {
              admissions: {
                where: {
                  isDeleted: false,
                  admissionStatus: { in: ['Draft', 'Submitted', 'Approved'] },
                },
                orderBy: { admissionDate: 'desc' },
              },
            },
          },
        },
      });

      const existingProfile = existingPerson?.studentProfiles?.[0];
      const activeAdmission = existingProfile?.admissions?.[0];

      let admissionResult;
      if (existingProfile && activeAdmission) {
        // Reuse existing student profile and admission
        admissionResult = {
          personId: existingPerson.id,
          studentProfileId: existingProfile.id,
          admissionId: activeAdmission.id,
          admissionNumber: activeAdmission.admissionNumber,
        };
      } else {
        // Create new student profile & admission record (Auto-Approved)
        admissionResult = await this.admissionService.createStudentAdmission(
          {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            branchId: lead.branchId,
            leadId: lead.id,
            courseId: lead.interestedCourseId,
            dateOfBirth: lead.person?.dateOfBirth,
            nationalId: lead.nationalId,
            nationality: lead.nationality,
          },
          actorId || null,
          tx,
        );
      }

      // 2.5 Create the Draft Enrollment record linked to the lead.
      const enrollmentResult = await this.enrollmentService.createEnrollment(
        {
          studentProfileId: admissionResult.studentProfileId,
          admissionId: admissionResult.admissionId,
          courseId: lead.interestedCourseId,
          batchId,
          branchId: lead.branchId,
          enrollmentType: 'Regular',
          leadId: lead.id,
          discountCode,
          manualDiscountAmount,
          actorId,
        },
        tx,
      );

      // 2.7 Update the Lead record with the admission number.
      await tx.lead.update({
        where: { id: leadId },
        data: {
          admissionNumber: admissionResult.admissionNumber,
          version: { increment: 1 },
        },
      });

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
            enrollmentId: enrollmentResult.id,
          },
        },
      });

      return {
        personId: admissionResult.personId,
        studentProfileId: admissionResult.studentProfileId,
        admissionId: admissionResult.admissionId,
        admissionNumber: admissionResult.admissionNumber,
        enrollmentId: enrollmentResult.id,
        enrollmentNumber: enrollmentResult.enrollmentNumber,
      };
    });
  }
}
