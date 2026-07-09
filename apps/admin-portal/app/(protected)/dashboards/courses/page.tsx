import React from 'react';
import { assertPermission } from '@/lib/auth-guard';
import { CoursesDashboardClient } from './_components/courses-dashboard-client';

export const metadata = { title: 'Courses Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function CoursesDashboardPage(props: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    departmentId?: string;
    isPubliclyExposed?: string;
    courseClassification?: string;
    hasPricing?: string;
    hasDiscount?: string;
    hasCertificateRules?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // Assert view permission
  const session = await assertPermission('course.catalog.dashboard.view');

  const { branchScopeResolver, prisma } = await import('../../../../lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId,
    session.activeBranchId ?? null
  );
  const branchIds = allowedBranchIds.length > 0 ? allowedBranchIds : ['00000000-0000-0000-0000-000000000000'];

  // Resolve departments in allowed branches
  const allowedDepartments = await prisma.department.findMany({
    where: { branchId: { in: branchIds }, status: 'Active' },
    select: { id: true, departmentName: true },
  });
  const allowedDepartmentIds = allowedDepartments.map(d => d.id);

  // Parse filters
  const selectedCategoryId = searchParams.categoryId;
  const selectedDepartmentId = searchParams.departmentId;

  // Date boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

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
    departmentId: { in: allowedDepartmentIds },
    effectiveStartDate: { lte: filterEndDate || todayEnd },
    OR: [
      { effectiveEndDate: null },
      { effectiveEndDate: { gte: filterStartDate } },
    ],
  };

  if (selectedCategoryId) {
    baseWhere.categoryId = selectedCategoryId;
  }

  if (selectedDepartmentId) {
    if (allowedDepartmentIds.includes(selectedDepartmentId)) {
      baseWhere.departmentId = selectedDepartmentId;
    } else {
      baseWhere.departmentId = '00000000-0000-0000-0000-000000000000'; // deny access
    }
  }

  if (searchParams.isPubliclyExposed) {
    baseWhere.isPubliclyExposed = searchParams.isPubliclyExposed === 'true';
  }

  if (searchParams.courseClassification) {
    baseWhere.courseClassification = searchParams.courseClassification;
  }

  if (searchParams.hasPricing === 'true') {
    baseWhere.pricings = { some: { status: 'Active' } };
  } else if (searchParams.hasPricing === 'false') {
    baseWhere.pricings = { none: {} };
  }

  if (searchParams.hasDiscount === 'true') {
    baseWhere.discounts = { some: { status: 'Active' } };
  } else if (searchParams.hasDiscount === 'false') {
    baseWhere.discounts = { none: {} };
  }

  if (searchParams.hasCertificateRules === 'true') {
    baseWhere.completionRules = { some: { status: 'Active' } };
  } else if (searchParams.hasCertificateRules === 'false') {
    baseWhere.completionRules = { none: {} };
  }

  // 1. Parallel KPI Counts
  const [totalCount, publishedCount, approvedCount, draftCount, archivedCount] = await Promise.all([
    prisma.course.count({ where: baseWhere }),
    prisma.course.count({ where: { ...baseWhere, status: 'Published' } }),
    prisma.course.count({ where: { ...baseWhere, status: 'Approved' } }),
    prisma.course.count({ where: { ...baseWhere, status: 'Draft' } }),
    prisma.course.count({ where: { ...baseWhere, status: 'Archived' } }),
  ]);

  // 2. Query Category distribution breakdown
  const categories = await prisma.courseCategory.findMany({
    where: { isDeleted: false },
    include: {
      courses: {
        where: baseWhere,
        select: { id: true },
      },
    },
  });

  const categoryBreakdownList = categories
    .map(c => ({
      id: c.id,
      nameEnglish: c.nameEnglish,
      courseCount: c.courses.length,
    }))
    .filter(c => c.courseCount > 0)
    .sort((a, b) => b.courseCount - a.courseCount);

  // 3. Query Department distribution breakdown using groupBy
  const courseGroups = await prisma.course.groupBy({
    by: ['departmentId'],
    where: baseWhere,
    _count: { id: true },
  });

  const departmentBreakdownList = courseGroups
    .map(g => {
      const dept = allowedDepartments.find(d => d.id === g.departmentId);
      return {
        id: g.departmentId,
        departmentName: dept?.departmentName || 'Unknown Department',
        courseCount: g._count.id,
      };
    })
    .sort((a, b) => b.courseCount - a.courseCount);

  // 4. Query recently created courses
  const recentCourses = await prisma.course.findMany({
    where: baseWhere,
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      courseCode: true,
      nameEnglish: true,
      courseClassification: true,
      createdAt: true,
      status: true,
    },
  });

  const mappedRecent = recentCourses.map(c => ({
    id: c.id,
    courseCode: c.courseCode,
    nameEnglish: c.nameEnglish,
    courseClassification: c.courseClassification,
    createdAt: c.createdAt.toISOString(),
    status: c.status,
  }));

  const kpis = {
    total: totalCount,
    published: publishedCount,
    approved: approvedCount,
    draft: draftCount,
    archived: archivedCount,
  };

  // 5. Fetch lookups for filters
  const filterCategories = await prisma.courseCategory.findMany({
    where: { isDeleted: false },
    select: { id: true, nameEnglish: true },
    orderBy: { nameEnglish: 'asc' },
  });

  const activeFilters = {
    startDate: filterStartDate.toISOString().split('T')[0],
    endDate: filterEndDate ? filterEndDate.toISOString().split('T')[0] : '',
    categoryId: selectedCategoryId || '',
    departmentId: selectedDepartmentId || '',
    isPubliclyExposed: searchParams.isPubliclyExposed || '',
    courseClassification: searchParams.courseClassification || '',
    hasPricing: searchParams.hasPricing || '',
    hasDiscount: searchParams.hasDiscount || '',
    hasCertificateRules: searchParams.hasCertificateRules || '',
  };

  return (
    <CoursesDashboardClient
      kpis={kpis}
      categoryBreakdowns={categoryBreakdownList}
      departmentBreakdowns={departmentBreakdownList}
      recentCourses={mappedRecent}
      categories={filterCategories}
      departments={allowedDepartments}
      activeFilters={activeFilters}
    />
  );
}
