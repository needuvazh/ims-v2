import { prisma } from '@ims/database';
import { assertPermission } from '@/lib/auth-guard';
import { BatchesClientList } from './_components/batches-client-list';
import { AdminListPageLayout } from '@ims/shared-ui';

export const metadata = { title: 'Batches - Admin Portal | ASTI IMS' };

export default async function BatchesPage(props: {
  searchParams: Promise<{
    courseId?: string;
    branchId?: string;
    status?: string;
    q?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // Assert view permission
  const session = await assertPermission('course.catalog.view');

  // Resolve filters based on branch access
  const isSuperAdmin = session.roles.includes('SUPER_ADMIN') || session.roles.includes('OWNER');

  // Fetch branches the user has access to
  let branches;
  if (isSuperAdmin) {
    branches = await prisma.branch.findMany({
      where: { isDeleted: false },
      select: { id: true, branchName: true },
    });
  } else {
    // Resolve based on user branch access mappings
    const access = await prisma.userBranchAccess.findMany({
      where: { userId: session.userId, status: 'Active' },
      include: { branch: true },
    });
    branches = access.map((a) => ({
      id: a.branch.id,
      branchName: a.branch.branchName,
    }));
  }

  let finalBranchId = searchParams.branchId || undefined;
  if (!isSuperAdmin) {
    const allowedBranchIds = branches.map((b) => b.id);
    if (finalBranchId && !allowedBranchIds.includes(finalBranchId)) {
      finalBranchId = session.activeBranchId && allowedBranchIds.includes(session.activeBranchId)
        ? session.activeBranchId
        : allowedBranchIds[0] || 'none';
    } else if (!finalBranchId) {
      finalBranchId = session.activeBranchId && allowedBranchIds.includes(session.activeBranchId)
        ? session.activeBranchId
        : allowedBranchIds[0] || 'none';
    }
  } else if (!finalBranchId) {
    finalBranchId = undefined;
  }

  const sortBy = searchParams.sortBy || 'startDate';
  const sortOrder = (searchParams.sortOrder as 'asc' | 'desc' | undefined) || 'desc';

  // Fetch courses list for filters dropdown
  const courses = await prisma.course.findMany({
    where: { isDeleted: false },
    select: { id: true, nameEnglish: true },
  });

  // Pagination parameters
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  // Build the Prisma query filters
  const where: any = {
    isDeleted: false,
  };

  if (finalBranchId) {
    where.branchId = finalBranchId;
  }
  if (searchParams.courseId) {
    where.courseId = searchParams.courseId;
  }
  if (searchParams.status) {
    where.status = searchParams.status;
  }

  const q = searchParams.q || '';
  if (q) {
    where.OR = [
      { batchCode: { contains: q, mode: 'insensitive' } },
      { batchNameEnglish: { contains: q, mode: 'insensitive' } },
      { batchNameArabic: { contains: q, mode: 'insensitive' } },
    ];
  }

  let orderBy: any = { startDate: sortOrder };
  if (sortBy === 'batchCode') {
    orderBy = { batchCode: sortOrder };
  } else if (sortBy === 'batchNameEnglish') {
    orderBy = { batchNameEnglish: sortOrder };
  } else if (sortBy === 'batchNameArabic') {
    orderBy = { batchNameArabic: sortOrder };
  } else if (sortBy === 'courseName') {
    orderBy = { course: { nameEnglish: sortOrder } };
  } else if (sortBy === 'startDate') {
    orderBy = { startDate: sortOrder };
  } else if (sortBy === 'currentEnrollmentCount') {
    orderBy = { currentEnrollmentCount: sortOrder };
  } else if (sortBy === 'capacity') {
    orderBy = { capacity: sortOrder };
  } else if (sortBy === 'status') {
    orderBy = { status: sortOrder };
  }

  // Fetch batches total and list
  const total = await prisma.batch.count({ where });
  const batches = await prisma.batch.findMany({
    where,
    include: {
      course: {
        select: {
          nameEnglish: true,
        },
      },
    },
    orderBy,
    skip,
    take: limit,
  });

  const mappedBatches = batches.map((batch) => ({
    id: batch.id,
    branchId: batch.branchId,
    batchCode: batch.batchCode,
    batchNameEnglish: batch.batchNameEnglish,
    batchNameArabic: batch.batchNameArabic,
    startDate: batch.startDate.toISOString(),
    endDate: batch.endDate.toISOString(),
    capacity: batch.capacity,
    currentEnrollmentCount: batch.currentEnrollmentCount,
    status: batch.status,
    course: {
      nameEnglish: batch.course?.nameEnglish || 'N/A',
    },
  }));

  // Calculate KPIs (respecting active branch scoped filters)
  const kpiWhere: any = { isDeleted: false };
  if (finalBranchId) {
    kpiWhere.branchId = finalBranchId;
  }

  const totalCount = await prisma.batch.count({ where: kpiWhere });
  const openCount = await prisma.batch.count({ where: { ...kpiWhere, status: 'OpenForEnrollment' } });
  const inProgressCount = await prisma.batch.count({ where: { ...kpiWhere, status: 'InProgress' } });
  const cancelledCount = await prisma.batch.count({ where: { ...kpiWhere, status: 'Cancelled' } });

  const kpis = {
    total: totalCount,
    open: openCount,
    inProgress: inProgressCount,
    cancelled: cancelledCount,
  };

  const canCreate = session.permissions.includes('schedule.manage');

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <BatchesClientList
        batches={mappedBatches}
        courses={courses}
        branches={branches}
        total={total}
        kpis={kpis}
        currentPage={page}
        canCreate={canCreate}
        defaultSearch={searchParams.q || ''}
        defaultCourseId={searchParams.courseId || ''}
        defaultBranchId={finalBranchId && finalBranchId !== 'none' ? finalBranchId : ''}
        defaultStatus={searchParams.status || ''}
        defaultSortBy={sortBy}
        defaultSortOrder={sortOrder}
      />
    </AdminListPageLayout>
  );
}
