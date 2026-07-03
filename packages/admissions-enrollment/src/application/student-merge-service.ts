import { PrismaClient } from '@prisma/client';

export class StudentMergeService {
  constructor(private readonly prisma: PrismaClient) {}

  async mergeProfiles(params: {
    survivorStudentProfileId: string;
    sourceStudentProfileId: string;
    duplicateCaseId?: string;
    mergeReason: string;
    mergedBy: string;
  }) {
    const { survivorStudentProfileId, sourceStudentProfileId, duplicateCaseId, mergeReason, mergedBy } = params;

    if (survivorStudentProfileId === sourceStudentProfileId) {
      throw new Error('ERR_STU_MERGE_SELF_FORBIDDEN');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Fetch survivor and source profiles
      const survivor = await tx.studentProfile.findUnique({
        where: { id: survivorStudentProfileId },
        include: { person: true }
      });
      const source = await tx.studentProfile.findUnique({
        where: { id: sourceStudentProfileId },
        include: { person: true }
      });

      if (!survivor || survivor.isDeleted) {
        throw new Error('ERR_STU_MERGE_SURVIVOR_NOT_FOUND');
      }
      if (!source || source.isDeleted) {
        throw new Error('ERR_STU_MERGE_SOURCE_NOT_FOUND');
      }

      const survivorPersonId = survivor.personId;
      const sourcePersonId = source.personId;

      // 2. User account checks & deconfliction
      const survivorUser = await tx.user.findUnique({
        where: { personId: survivorPersonId }
      });
      const sourceUser = await tx.user.findUnique({
        where: { personId: sourcePersonId }
      });

      if (survivorUser && sourceUser) {
        throw new Error('ERR_STU_MERGE_USER_CONFLICT');
      }

      if (sourceUser && !survivorUser) {
        await tx.user.update({
          where: { id: sourceUser.id },
          data: { personId: survivorPersonId }
        });
      }

      // 3. Remap Admissions
      const admissionsUpdate = await tx.admission.updateMany({
        where: { studentProfileId: sourceStudentProfileId, isDeleted: false },
        data: {
          studentProfileId: survivorStudentProfileId,
          personId: survivorPersonId
        }
      });

      // 4. Remap Enrollments
      const enrollmentsUpdate = await tx.enrollment.updateMany({
        where: { studentProfileId: sourceStudentProfileId, isDeleted: false },
        data: {
          studentProfileId: survivorStudentProfileId
        }
      });

      // 5. Remap Leads
      const leadsUpdate = await tx.lead.updateMany({
        where: { personId: sourcePersonId, isDeleted: false },
        data: {
          personId: survivorPersonId
        }
      });

      // 6. Remap Document Owners to avoid unique violations
      // Fetch all document IDs owned by survivor (as StudentProfile)
      const survivorProfileDocs = await tx.documentOwner.findMany({
        where: { ownerId: survivorStudentProfileId, ownerType: 'StudentProfile' },
        select: { documentId: true }
      });
      const survivorProfileDocIds = survivorProfileDocs.map(d => d.documentId);

      // Remap source profile docs that survivor doesn't own
      const profileDocsUpdate = await tx.documentOwner.updateMany({
        where: {
          ownerId: sourceStudentProfileId,
          ownerType: 'StudentProfile',
          documentId: { notIn: survivorProfileDocIds }
        },
        data: { ownerId: survivorStudentProfileId }
      });

      // Delete any duplicate source profile docs that survivor already owns
      await tx.documentOwner.deleteMany({
        where: {
          ownerId: sourceStudentProfileId,
          ownerType: 'StudentProfile'
        }
      });

      // Repeat for Person-level documents
      const survivorPersonDocs = await tx.documentOwner.findMany({
        where: { ownerId: survivorPersonId, ownerType: 'Person' },
        select: { documentId: true }
      });
      const survivorPersonDocIds = survivorPersonDocs.map(d => d.documentId);

      const personDocsUpdate = await tx.documentOwner.updateMany({
        where: {
          ownerId: sourcePersonId,
          ownerType: 'Person',
          documentId: { notIn: survivorPersonDocIds }
        },
        data: { ownerId: survivorPersonId }
      });

      await tx.documentOwner.deleteMany({
        where: {
          ownerId: sourcePersonId,
          ownerType: 'Person'
        }
      });

      // 7. Soft-delete duplicate profile & person
      await tx.studentProfile.update({
        where: { id: sourceStudentProfileId },
        data: {
          isDeleted: true,
          status: 'Archived',
          deletedAt: new Date(),
          deletedBy: mergedBy
        }
      });

      await tx.person.update({
        where: { id: sourcePersonId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: mergedBy
        }
      });

      // 8. Log the Merge Log
      const mergeLog = await tx.studentMergeLog.create({
        data: {
          branchId: survivor.branchId,
          duplicateCaseId: duplicateCaseId || null,
          survivorStudentProfileId: survivorStudentProfileId,
          sourceStudentProfileId: sourceStudentProfileId,
          mergeReason,
          mergedAt: new Date(),
          mergedBy,
          reassignedAdmissionsCount: admissionsUpdate.count,
          reassignedEnrollmentsCount: enrollmentsUpdate.count,
          reassignedDocumentsCount: profileDocsUpdate.count + personDocsUpdate.count,
          reassignedOtherRefsCount: leadsUpdate.count,
          mergePayload: {
            sourcePersonId,
            survivorPersonId,
            sourceStudentNumber: source.studentNumber,
            survivorStudentNumber: survivor.studentNumber
          },
          createdBy: mergedBy,
          updatedBy: mergedBy,
        }
      });

      return {
        mergeLogId: mergeLog.id,
        reassignedAdmissionsCount: admissionsUpdate.count,
        reassignedEnrollmentsCount: enrollmentsUpdate.count,
        reassignedDocumentsCount: profileDocsUpdate.count + personDocsUpdate.count,
        reassignedOtherRefsCount: leadsUpdate.count
      };
    });
  }
}
