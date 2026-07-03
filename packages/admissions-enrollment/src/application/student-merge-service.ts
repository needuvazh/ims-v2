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

      // 3. Soft-delete duplicate profile & person
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
          reassignedAdmissionsCount: 0,
          reassignedEnrollmentsCount: 0,
          reassignedDocumentsCount: 0,
          reassignedOtherRefsCount: 0,
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
        reassignedAdmissionsCount: 0,
        reassignedEnrollmentsCount: 0,
        reassignedDocumentsCount: 0,
        reassignedOtherRefsCount: 0
      };
    });
  }
}
