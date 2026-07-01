import { createUuid } from '@ims/shared-kernel';
import { prisma } from '@ims/database';
import { assertPermission } from '@/lib/auth-guard';
import { CoursesClientList } from './_components/courses-client-list';

export const metadata = { title: 'Course Catalog - Admin Portal | ASTI IMS' };

export default async function CoursesPage(props: {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // Enforce read permission at the route entry point
  const session = await assertPermission('course.catalog.view');

  const { courseService, categoryService } = await import('@/lib/runtime');

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 10;

  const filters = {
    categoryId: searchParams.categoryId,
    status: searchParams.status,
    search: searchParams.q,
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
    <div className="p-6">
      <CoursesClientList
        courses={courses}
        categories={categories}
        departments={departments}
        total={total}
        kpis={kpis}
        currentPage={page}
        sessionPermissions={session.permissions}
      />
    </div>
  );
}
