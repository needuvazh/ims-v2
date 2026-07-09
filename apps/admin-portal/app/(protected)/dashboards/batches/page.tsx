import React from 'react';
import { assertPermission } from '@/lib/auth-guard';
import { BatchesDashboardClient } from './_components/batches-dashboard-client';

export const metadata = { title: 'Batches Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function BatchesDashboardPage() {
  const session = await assertPermission('course.catalog.view');

  const { branchScopeResolver, prisma } = await import('../../../../lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId,
    session.activeBranchId ?? null
  );
  const branchIds = allowedBranchIds.length > 0 ? allowedBranchIds : ['00000000-0000-0000-0000-000000000000'];

  const baseWhere = {
    isDeleted: false,
    branchId: { in: branchIds },
  };

  // 1. Parallel KPI Counts
  const [totalCount, openCount, inProgressCount, cancelledCount, draftCount] = await Promise.all([
    prisma.batch.count({ where: baseWhere }),
    prisma.batch.count({ where: { ...baseWhere, status: 'OpenForEnrollment' } }),
    prisma.batch.count({ where: { ...baseWhere, status: 'InProgress' } }),
    prisma.batch.count({ where: { ...baseWhere, status: 'Cancelled' } }),
    prisma.batch.count({ where: { ...baseWhere, status: 'Draft' } }),
  ]);

  // 2. Parallel active batches retrieval for capacity aggregate processing
  const activeBatches = await prisma.batch.findMany({
    where: {
      isDeleted: false,
      status: { in: ['OpenForEnrollment', 'InProgress'] },
      branchId: { in: branchIds }
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const upcomingBatches = await prisma.batch.findMany({
    where: {
      isDeleted: false,
      startDate: { gt: today, lte: thirtyDaysFromNow },
      branchId: { in: branchIds },
    },
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

  return (
    <BatchesDashboardClient
      kpis={kpis}
      courseCapacities={courseCapacityList}
      upcoming={mappedUpcoming}
    />
  );
}
