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
    const {
      survivorStudentProfileId,
      sourceStudentProfileId,
      duplicateCaseId,
      mergeReason,
      mergedBy,
    } = params;

    if (survivorStudentProfileId === sourceStudentProfileId) {
      throw new Error('ERR_STU_MERGE_SELF_FORBIDDEN');
    }

    return await this.prisma.$transaction(async (tx) => {
      const survivor = await tx.studentProfile.findUnique({
        where: { id: survivorStudentProfileId },
        include: { person: true },
      });
      const source = await tx.studentProfile.findUnique({
        where: { id: sourceStudentProfileId },
        include: { person: true },
      });

      if (!survivor || survivor.isDeleted) {
        throw new Error('ERR_STU_MERGE_SURVIVOR_NOT_FOUND');
      }
      if (!source || source.isDeleted) {
        throw new Error('ERR_STU_MERGE_SOURCE_NOT_FOUND');
      }

      const survivorPersonId = survivor.personId;
      const sourcePersonId = source.personId;
      const now = new Date();

      const survivorUser = await tx.user.findUnique({
        where: { personId: survivorPersonId },
      });
      const sourceUser = await tx.user.findUnique({
        where: { personId: sourcePersonId },
      });

      if (survivorUser && sourceUser) {
        throw new Error('ERR_STU_MERGE_USER_CONFLICT');
      }

      if (sourceUser && !survivorUser) {
        await tx.user.update({
          where: { id: sourceUser.id },
          data: {
            personId: survivorPersonId,
            updatedBy: mergedBy,
          },
        });
      }

      const remappedAdmissions = await tx.admission.updateMany({
        where: {
          studentProfileId: sourceStudentProfileId,
          isDeleted: false,
        },
        data: {
          studentProfileId: survivorStudentProfileId,
          personId: survivorPersonId,
          updatedBy: mergedBy,
        },
      });

      const remappedEnrollments = await tx.enrollment.updateMany({
        where: {
          studentProfileId: sourceStudentProfileId,
          isDeleted: false,
        },
        data: {
          studentProfileId: survivorStudentProfileId,
          updatedBy: mergedBy,
        },
      });

      const remappedLeadRefs = await tx.lead.updateMany({
        where: {
          personId: sourcePersonId,
          isDeleted: false,
        },
        data: {
          personId: survivorPersonId,
          updatedBy: mergedBy,
        },
      });

      const remappedProfileDocs = await tx.documentOwner.updateMany({
        where: {
          ownerId: sourceStudentProfileId,
          ownerType: 'StudentProfile',
        },
        data: {
          ownerId: survivorStudentProfileId,
          createdBy: mergedBy,
        },
      });

      const remappedPersonDocs = await tx.documentOwner.updateMany({
        where: {
          ownerId: sourcePersonId,
          ownerType: 'Person',
        },
        data: {
          ownerId: survivorPersonId,
          createdBy: mergedBy,
        },
      });

      await tx.studentProfile.update({
        where: { id: sourceStudentProfileId },
        data: {
          isDeleted: true,
          status: 'Archived',
          deletedAt: now,
          deletedBy: mergedBy,
        },
      });

      await tx.person.update({
        where: { id: sourcePersonId },
        data: {
          isDeleted: true,
          deletedAt: now,
          deletedBy: mergedBy,
        },
      });

      const mergeLog = await tx.studentMergeLog.create({
        data: {
          branchId: survivor.branchId,
          duplicateCaseId: duplicateCaseId || null,
          survivorStudentProfileId,
          sourceStudentProfileId,
          mergeReason,
          mergedAt: now,
          mergedBy,
          reassignedAdmissionsCount: remappedAdmissions.count,
          reassignedEnrollmentsCount: remappedEnrollments.count,
          reassignedDocumentsCount:
            remappedProfileDocs.count + remappedPersonDocs.count,
          reassignedOtherRefsCount: remappedLeadRefs.count,
          mergePayload: {
            sourcePersonId,
            survivorPersonId,
            sourceStudentNumber: source.studentNumber,
            survivorStudentNumber: survivor.studentNumber,
            remappedAdmissions: remappedAdmissions.count,
            remappedEnrollments: remappedEnrollments.count,
            remappedDocuments:
              remappedProfileDocs.count + remappedPersonDocs.count,
            remappedLeads: remappedLeadRefs.count,
            userAccountMoved: !!sourceUser && !survivorUser,
          },
          createdBy: mergedBy,
          updatedBy: mergedBy,
        },
      });

      return {
        mergeLogId: mergeLog.id,
        reassignedAdmissionsCount: remappedAdmissions.count,
        reassignedEnrollmentsCount: remappedEnrollments.count,
        reassignedDocumentsCount:
          remappedProfileDocs.count + remappedPersonDocs.count,
        reassignedOtherRefsCount: remappedLeadRefs.count,
      };
    });
  }
}
