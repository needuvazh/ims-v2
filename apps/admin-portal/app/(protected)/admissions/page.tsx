import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { AdmissionsClientList } from './_components/admissions-client-list';

export const metadata = { title: 'Admissions - CRM | ASTI IMS' };

export default async function AdmissionsPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    branchId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertPermission('admission.read');

  const { branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  let filterBranchIds = allowedBranchIds.map(id => id as string);
  if (filterBranchIds.length === 0) {
    filterBranchIds = ['00000000-0000-0000-0000-000000000000'];
  } else if (searchParams.branchId) {
    const requestedBranchId = searchParams.branchId;
    if (filterBranchIds.includes(requestedBranchId)) {
      filterBranchIds = [requestedBranchId];
    } else {
      filterBranchIds = ['00000000-0000-0000-0000-000000000000'];
    }
  }

  const whereClause: any = {
    isDeleted: false,
  };

  if (filterBranchIds.length > 0) {
    whereClause.branchId = { in: filterBranchIds };
  }

  if (searchParams.status) {
    whereClause.admissionStatus = searchParams.status;
  }

  if (searchParams.q) {
    whereClause.OR = [
      { admissionNumber: { contains: searchParams.q, mode: 'insensitive' } },
      { person: { firstName: { contains: searchParams.q, mode: 'insensitive' } } },
      { person: { lastName: { contains: searchParams.q, mode: 'insensitive' } } },
      { person: { email: { contains: searchParams.q, mode: 'insensitive' } } },
    ];
  }

  const admissions = await prisma.admission.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      person: true,
      branch: true,
      course: true,
    },
  });

  const mappedAdmissions = admissions.map((adm) => ({
    id: adm.id,
    admissionNumber: adm.admissionNumber,
    admissionStatus: adm.admissionStatus,
    admissionDate: adm.admissionDate.toISOString(),
    createdAt: adm.createdAt.toISOString(),
    branchName: adm.branch.branchName,
    courseName: adm.course?.nameEnglish || 'N/A',
    studentName: `${adm.person.firstName} ${adm.person.lastName}`,
    studentEmail: adm.person.email || 'N/A',
    studentMobile: adm.person.mobile || 'N/A',
  }));

  const branches = await prisma.branch.findMany({
    where: {
      isDeleted: false,
      id: allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined,
    },
    select: { id: true, branchName: true },
  });

  const courses = await prisma.course.findMany({
    where: { status: 'Published', isDeleted: false },
    select: { id: true, nameEnglish: true },
  });

  const students = await prisma.studentProfile.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      studentNumber: true,
      person: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    take: 50,
  });

  return (
    <div className="p-6">
      <AdmissionsClientList
        admissions={mappedAdmissions}
        branches={branches.map((b) => ({ id: b.id, name: b.branchName }))}
        courses={courses.map((c) => ({ id: c.id, name: c.nameEnglish }))}
        students={students.map((s) => ({
          id: s.id,
          label: `${s.person.firstName} ${s.person.lastName} (${s.studentNumber || 'No Student Num'})`,
        }))}
      />
    </div>
  );
}
