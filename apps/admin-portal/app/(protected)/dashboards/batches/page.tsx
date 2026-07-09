import React from 'react';
import { assertPermission } from '@/lib/auth-guard';
import { BatchesDashboardClient } from './_components/batches-dashboard-client';

export const metadata = { title: 'Batches Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function BatchesDashboardPage(props: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    courseId?: string;
    status?: string;
    branchId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // Assert view permission
  const session = await assertPermission('batch.delivery.dashboard.view');

  const { branchScopeResolver, prisma } = await import('../../../../lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId,
    session.activeBranchId ?? null
  );
  const branchIds = allowedBranchIds.length > 0 ? allowedBranchIds : ['00000000-0000-0000-0000-000000000000'];

  // Resolve active filters
  const selectedBranchId = searchParams.branchId;
  const selectedCourseId = searchParams.courseId;
  const selectedStatus = searchParams.status;

  // Validate and enforce branch isolation
  let activeBranchIds = [...branchIds];
  if (selectedBranchId) {
    if (branchIds.includes(selectedBranchId)) {
      activeBranchIds = [selectedBranchId];
    } else {
      activeBranchIds = ['00000000-0000-0000-0000-000000000000']; // deny access
    }
  }

  // Handle default 60-day date range filter
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let filterStartDate: Date;
  if (searchParams.startDate) {
    filterStartDate = new Date(searchParams.startDate);
    filterStartDate.setHours(0, 0, 0, 0);
  } else {
    filterStartDate = new Date(today);
    filterStartDate.setDate(today.getDate() - 60);
    filterStartDate.setHours(0, 0, 0, 0);
  }

  let filterEndDate: Date | undefined;
  if (searchParams.endDate) {
    filterEndDate = new Date(searchParams.endDate);
    filterEndDate.setHours(23, 59, 59, 999);
  }

  // Construct query where clause
  const baseWhere: any = {
    isDeleted: false,
    branchId: { in: activeBranchIds },
    startDate: { gte: filterStartDate },
  };

  if (filterEndDate) {
    baseWhere.startDate.lte = filterEndDate;
  }

  if (selectedCourseId) {
    baseWhere.courseId = selectedCourseId;
  }

  if (selectedStatus) {
    baseWhere.status = selectedStatus;
  }

  // 1. Parallel KPI Counts
  const [totalCount, openCount, inProgressCount, cancelledCount, draftCount] = await Promise.all([
    prisma.batch.count({ where: baseWhere }),
    prisma.batch.count({ where: { ...baseWhere, status: 'OpenForEnrollment' } }),
    prisma.batch.count({ where: { ...baseWhere, status: 'InProgress' } }),
    prisma.batch.count({ where: { ...baseWhere, status: 'Cancelled' } }),
    prisma.batch.count({ where: { ...baseWhere, status: 'Draft' } }),
  ]);

  // 2. Query active batches for utilization capacity lists
  const activeBatches = await prisma.batch.findMany({
    where: {
      ...baseWhere,
      status: { in: ['OpenForEnrollment', 'InProgress'] },
    },
    include: { course: true },
  });

  // Group capacity by Course
  const courseCapacityMap = new Map<string, {
    courseName: string;
    activeBatchCount: number;
    capacity: number;
    enrolled: number;
  }>();

  for (const b of activeBatches) {
    const courseId = b.courseId;
    const courseName = b.course?.nameEnglish || 'Unknown Course';
    const current = courseCapacityMap.get(courseId) || {
      courseName,
      activeBatchCount: 0,
      capacity: 0,
      enrolled: 0,
    };
    current.activeBatchCount += 1;
    current.capacity += b.capacity;
    current.enrolled += b.currentEnrollmentCount;
    courseCapacityMap.set(courseId, current);
  }

  const courseCapacityList = Array.from(courseCapacityMap.values()).map(c => ({
    ...c,
    fillRate: c.capacity > 0 ? Math.round((c.enrolled / c.capacity) * 100) : 0,
  })).sort((a, b) => b.fillRate - a.fillRate);

  // 3. Query upcoming batches starting in next 30 days
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  // Note: upcoming batches are always relative to today, but also respect branch and course selections
  const upcomingWhere: any = {
    isDeleted: false,
    branchId: { in: activeBranchIds },
    startDate: { gt: today, lte: thirtyDaysFromNow },
  };
  if (selectedCourseId) {
    upcomingWhere.courseId = selectedCourseId;
  }
  if (selectedStatus) {
    upcomingWhere.status = selectedStatus;
  }

  const upcomingBatches = await prisma.batch.findMany({
    where: upcomingWhere,
    include: { course: { select: { nameEnglish: true } } },
    orderBy: { startDate: 'asc' },
    take: 5,
  });

  const mappedUpcoming = upcomingBatches.map(b => ({
    id: b.id,
    batchCode: b.batchCode,
    batchNameEnglish: b.batchNameEnglish,
    courseName: b.course?.nameEnglish || 'N/A',
    startDate: b.startDate.toISOString(),
    capacity: b.capacity,
    currentEnrollmentCount: b.currentEnrollmentCount,
  }));

  const kpis = {
    total: totalCount,
    open: openCount,
    inProgress: inProgressCount,
    cancelled: cancelledCount,
    draft: draftCount,
  };

  // 4. Fetch list parameters for filters dropdown
  const filterCourses = await prisma.course.findMany({
    where: { isDeleted: false },
    select: { id: true, nameEnglish: true },
    orderBy: { nameEnglish: 'asc' },
  });

  const filterBranches = await prisma.branch.findMany({
    where: { isDeleted: false, id: { in: branchIds } },
    select: { id: true, branchName: true },
    orderBy: { branchName: 'asc' },
  });

  const activeFilters = {
    startDate: filterStartDate.toISOString().split('T')[0],
    endDate: filterEndDate ? filterEndDate.toISOString().split('T')[0] : '',
    courseId: selectedCourseId || '',
    status: selectedStatus || '',
    branchId: selectedBranchId || '',
  };

  return (
    <BatchesDashboardClient
      kpis={kpis}
      courseCapacities={courseCapacityList}
      upcoming={mappedUpcoming}
      courses={filterCourses}
      branches={filterBranches}
      activeFilters={activeFilters}
    />
  );
}
