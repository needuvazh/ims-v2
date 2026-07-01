import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { assertPermission } from '@/lib/auth-guard';
import { CourseForm } from '../_components/course-form';
import { createCourseAction } from '../actions';
import { prisma } from '@ims/database';
import { Home, BookOpen, PlusCircle } from 'lucide-react';

export const metadata = { title: 'Create Course - Admin Portal | ASTI IMS' };

export default async function CreateCoursePage() {
  const session = await assertPermission('course.catalog.create');

  const { categoryService } = await import('@/lib/runtime');

  const categories = await categoryService.listCategories();
  const departments = await prisma.department.findMany({
    where: { isDeleted: false },
    select: { id: true, departmentName: true },
  });

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Create Course"
        description="Define a new curriculum template globally for all branches."
        backUrl="/courses-catalog"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Courses', href: '/courses-catalog', icon: <BookOpen className="h-3.5 w-3.5" /> },
              { label: 'Create', icon: <PlusCircle className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div>
        <CourseForm
          categories={categories}
          departments={departments}
          onSubmitAction={createCourseAction}
        />
      </div>
    </div>
  );
}
