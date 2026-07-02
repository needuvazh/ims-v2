import { prisma } from '@ims/database';
import { assertPermission } from '@/lib/auth-guard';
import { BatchesClientList } from './_components/batches-client-list';

export const metadata = { title: 'Batches - Admin Portal | ASTI IMS' };

export default async function BatchesPage(props: {
  searchParams: Promise<{
    courseId?: string;
    branchId?: string;
    status?: string;
    q?: string;
    page?: string;
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
    orderBy: { startDate: 'desc' },
    skip,
    take: limit,
  });

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
    <div className="p-6">
      <BatchesClientList
        batches={batches}
        courses={courses}
        branches={branches}
        total={total}
        kpis={kpis}
        currentPage={page}
        canCreate={canCreate}
      />
    </div>
  );
}
