import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { PageHeader, AdminListPageLayout } from '@ims/shared-ui';
import { Calendar } from 'lucide-react';
import { getFacultyTrainerContext } from '../_lib';
import { LeavesClientList } from './_components/leaves-client-list';

export const metadata = { title: 'Leaves & Time-Off | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function LeavesPage(props: {
  searchParams: Promise<{
    personId?: string;
    branchId?: string;
    status?: string;
    date?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  
  // 1. Ensure user has permission to read leaves
  const session = await assertPermission('leave.read');
  const { authContext } = await getFacultyTrainerContext();

  const allowedBranchIds = authContext.allowedBranchIds;

  // 2. Resolve branch filter based on permissions/scoping
  let filterBranchIds = allowedBranchIds.map((id) => id as string);
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

  const appliedBranchId =
    searchParams.branchId &&
    filterBranchIds[0] !== '00000000-0000-0000-0000-000000000000'
      ? filterBranchIds[0]
      : undefined;

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 10;

  // 3. Fetch leaves using the leave management application service
  const { leaveManagementService } = await import('../../../lib/runtime');
  const result = await leaveManagementService.listLeaveRequests(
    {
      personId: searchParams.personId,
      branchId: appliedBranchId,
      status: searchParams.status,
      date: searchParams.date ? new Date(searchParams.date) : undefined,
    },
    { page, pageSize: limit },
    authContext,
  );

  // 4. Map records for safe transfer to client component
  const leaves = result.items.map((leave) => ({
    id: leave.id,
    personId: leave.personId,
    branchId: leave.branchId,
    startDate: leave.startDate.toISOString().split('T')[0],
    endDate: leave.endDate.toISOString().split('T')[0],
    startTime: leave.startTime,
    endTime: leave.endTime,
    isFullDay: leave.isFullDay,
    leaveType: leave.leaveType,
    reason: leave.reason,
    status: leave.status,
    rejectionReason: leave.rejectionReason,
    createdAt: leave.createdAt.toISOString(),
    person: leave.person
      ? {
          firstName: leave.person.firstName,
          lastName: leave.person.lastName,
          email: leave.person.email,
        }
      : null,
    branch: leave.branch
      ? {
          branchName: leave.branch.branchName,
        }
      : null,
  }));

  // 5. Fetch branches and staff for dropdown options
  const branches = await prisma.branch.findMany({
    where: { id: { in: allowedBranchIds } },
    select: { id: true, branchName: true, branchCode: true },
  });

  const staff = await prisma.person.findMany({
    where: { isDeleted: false },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { firstName: 'asc' },
  });

  const currentBranchId = session.activeBranchId || '';
  const canApprove = session.permissions.includes('leave.approve');
  const canApply = session.permissions.includes('leave.apply');

  // 6. Calculate high-level KPIs for Leaves
  const kpiWhere = {
    branchId:
      allowedBranchIds.length > 0
        ? { in: allowedBranchIds.map((id) => id as string) }
        : undefined,
  };

  const [
    allLeavesCount,
    pendingLeavesCount,
    approvedLeavesCount,
    rejectedLeavesCount,
  ] = await Promise.all([
    prisma.leaveRequest.count({ where: kpiWhere }),
    prisma.leaveRequest.count({
      where: { ...kpiWhere, status: 'Pending' },
    }),
    prisma.leaveRequest.count({
      where: { ...kpiWhere, status: 'Approved' },
    }),
    prisma.leaveRequest.count({
      where: { ...kpiWhere, status: 'Rejected' },
    }),
  ]);

  const kpis = {
    total: allLeavesCount,
    pending: pendingLeavesCount,
    approved: approvedLeavesCount,
    rejected: rejectedLeavesCount,
  };

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        eyebrow="Faculty & Trainer"
        title="Leaves & Time-Off"
        description="Manage leaves, time-off requests, and staff availability."
      />

      <LeavesClientList
        initialLeaves={leaves}
        totalCount={result.total}
        currentPage={page}
        pageSize={limit}
        branches={branches}
        staff={staff}
        currentBranchId={currentBranchId}
        canApprove={canApprove}
        canApply={canApply}
        kpis={kpis}
      />
    </AdminListPageLayout>
  );
}
