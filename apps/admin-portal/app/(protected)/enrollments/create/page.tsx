import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { CreateEnrollmentClient } from './_components/create-enrollment-client';

export const metadata = { title: 'New Student Enrollment | ASTI IMS' };

export default async function CreateEnrollmentPage() {
  const session = await assertPermission('enrollment.create');

  const { branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  // Fetch approved admissions for enrollment setup
  const approvedAdmissions = await prisma.admission.findMany({
    where: {
      admissionStatus: 'Approved',
      isDeleted: false,
      studentProfile: allowedBranchIds.length > 0
        ? {
            branchId: { in: allowedBranchIds.map((id) => id as string) },
          }
        : undefined,
    },
    include: {
      person: true,
      studentProfile: true,
    },
  });

  const admissionsList = approvedAdmissions.map((adm) => ({
    id: adm.id,
    studentProfileId: adm.studentProfileId,
    courseId: adm.courseId || '',
    branchId: adm.studentProfile?.branchId || '',
    label: `${adm.person.firstName} ${adm.person.lastName} (${adm.admissionNumber})`,
  }));

  // Fetch batches available for enrollments
  const batches = await prisma.batch.findMany({
    where: {
      isDeleted: false,
      status: { in: ['OpenForEnrollment', 'InProgress'] },
      branchId:
        allowedBranchIds.length > 0
          ? { in: allowedBranchIds.map((id) => id as string) }
          : undefined,
    },
    select: { id: true, batchCode: true, courseId: true },
  });

  return (
    <CreateEnrollmentClient
      admissions={admissionsList}
      batches={batches.map((b) => ({
        id: b.id,
        code: b.batchCode,
        courseId: b.courseId,
      }))}
    />
  );
}
