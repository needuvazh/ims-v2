import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { EnrollmentsClientList } from './_components/enrollments-client-list';

export const metadata = { title: 'Enrollments - Operations | ASTI IMS' };

export default async function EnrollmentsPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    branchId?: string;
    courseId?: string;
    batchId?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertPermission('enrollment.read');

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

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    isDeleted: false,
  };

  if (filterBranchIds.length > 0) {
    whereClause.branchId = { in: filterBranchIds };
  }

  if (searchParams.status) {
    whereClause.enrollmentStatus = searchParams.status;
  }

  if (searchParams.courseId) {
    whereClause.courseId = searchParams.courseId;
  }

  if (searchParams.batchId) {
    whereClause.batchId = searchParams.batchId;
  }

  if (searchParams.q) {
    whereClause.OR = [
      { enrollmentNumber: { contains: searchParams.q, mode: 'insensitive' } },
      { studentProfile: { person: { firstName: { contains: searchParams.q, mode: 'insensitive' } } } },
      { studentProfile: { person: { lastName: { contains: searchParams.q, mode: 'insensitive' } } } },
      { studentProfile: { person: { email: { contains: searchParams.q, mode: 'insensitive' } } } },
    ];
  }

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        studentProfile: {
          include: {
            person: true,
          },
        },
        course: true,
        batch: true,
        branch: true,
      },
    }),
    prisma.enrollment.count({
      where: whereClause,
    }),
  ]);

  const mappedEnrollments = enrollments.map((e) => ({
    id: e.id,
    enrollmentNumber: e.enrollmentNumber,
    enrollmentStatus: e.enrollmentStatus,
    createdAt: e.createdAt.toISOString(),
    branchName: e.branch.branchName,
    courseName: e.course.nameEnglish,
    batchCode: e.batch.batchCode,
    studentName: `${e.studentProfile.person.firstName} ${e.studentProfile.person.lastName}`,
    studentEmail: e.studentProfile.person.email || 'N/A',
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

  // Fetch batches available for enrollments
  const batches = await prisma.batch.findMany({
    where: {
      isDeleted: false,
      status: { in: ['OpenForEnrollment', 'InProgress'] },
      branchId: allowedBranchIds.length > 0 ? { in: allowedBranchIds.map(id => id as string) } : undefined,
    },
    select: { id: true, batchCode: true, courseId: true },
  });

  // Fetch approved admissions for enrollment setup
  const approvedAdmissions = await prisma.admission.findMany({
    where: {
      admissionStatus: 'Approved',
      isDeleted: false,
      branchId: allowedBranchIds.length > 0 ? { in: allowedBranchIds.map(id => id as string) } : undefined,
    },
    include: {
      person: true,
    },
  });

  const admissionsList = approvedAdmissions.map((adm) => ({
    id: adm.id,
    studentProfileId: adm.studentProfileId,
    courseId: adm.courseId || '',
    branchId: adm.branchId,
    label: `${adm.person.firstName} ${adm.person.lastName} (${adm.admissionNumber})`,
  }));

  // Fetch enrollment stats
  const kpiWhere = {
    isDeleted: false,
    branchId: allowedBranchIds.length > 0 ? { in: allowedBranchIds.map(id => id as string) } : undefined,
  };

  const [allCount, activeCount, submittedCount, draftCount] = await Promise.all([
    prisma.enrollment.count({ where: kpiWhere }),
    prisma.enrollment.count({ where: { ...kpiWhere, enrollmentStatus: { in: ['Confirmed', 'Active'] } } }),
    prisma.enrollment.count({ where: { ...kpiWhere, enrollmentStatus: 'Submitted' } }),
    prisma.enrollment.count({ where: { ...kpiWhere, enrollmentStatus: 'Draft' } }),
  ]);

  const kpis = {
    total: allCount,
    active: activeCount,
    submitted: submittedCount,
    draft: draftCount,
  };

  return (
    <div className="space-y-4 p-6">
      <EnrollmentsClientList
        enrollments={mappedEnrollments}
        branches={branches.map((b) => ({ id: b.id, name: b.branchName }))}
        courses={courses.map((c) => ({ id: c.id, name: c.nameEnglish }))}
        batches={batches.map((b) => ({ id: b.id, code: b.batchCode, courseId: b.courseId }))}
        admissions={admissionsList}
        total={total}
        currentPage={page}
        kpis={kpis}
      />
    </div>
  );
}
