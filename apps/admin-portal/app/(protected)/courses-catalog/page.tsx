import { prisma } from '@ims/database';
import { assertPermission } from '@/lib/auth-guard';
import { AdminListPageLayout } from '@ims/shared-ui';
import { CoursesClientList } from './_components/courses-client-list';

export const metadata = { title: 'Course Catalog - Admin Portal | ASTI IMS' };

export default async function CoursesPage(props: {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    status?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // Enforce read permission at the route entry point
  const session = await assertPermission('course.catalog.view');

  const { courseService, categoryService } = await import('@/lib/runtime');

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 10;
  const sortBy = searchParams.sortBy || 'createdAt';
  const sortOrder = (searchParams.sortOrder as 'asc' | 'desc' | undefined) || 'desc';

  const filters = {
    categoryId: searchParams.categoryId,
    status: searchParams.status,
    search: searchParams.q,
    sortBy,
    sortOrder,
  };

  const { items: courses, total } = await courseService.findAll(filters, { page, limit });

  // Resolve master values lists (categories, departments) for the form inputs and display
  const categories = await categoryService.listCategories();
  const departments = await prisma.department.findMany({
    where: { isDeleted: false },
    select: { id: true, departmentName: true },
  });

  // Calculate high-level KPIs for course catalog
  const allCoursesCount = await prisma.course.count({ where: { isDeleted: false } });
  const publishedCoursesCount = await prisma.course.count({ where: { status: 'Published', isDeleted: false } });
  const draftCoursesCount = await prisma.course.count({ where: { status: 'Draft', isDeleted: false } });
  const inReviewCoursesCount = await prisma.course.count({
    where: { status: { in: ['InReview', 'Approved'] }, isDeleted: false },
  });

  const kpis = {
    total: allCoursesCount,
    published: publishedCoursesCount,
    draft: draftCoursesCount,
    inReview: inReviewCoursesCount,
  };

  return (
    <AdminListPageLayout>
      <CoursesClientList
        courses={courses}
        categories={categories}
        departments={departments}
        total={total}
        kpis={kpis}
        currentPage={page}
        sessionPermissions={session.permissions}
        defaultSearch={searchParams.q || ''}
        defaultCategoryId={searchParams.categoryId || ''}
        defaultStatus={searchParams.status || ''}
        defaultSortBy={sortBy}
        defaultSortOrder={sortOrder}
      />
    </AdminListPageLayout>
  );
}
