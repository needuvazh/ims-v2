import { notFound } from 'next/navigation';
import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { assertPermission } from '@/lib/auth-guard';
import { CourseEditClient } from './_components/course-edit-client';
import { prisma } from '@ims/database';
import { Home, BookOpen, Pencil } from 'lucide-react';

export const metadata = { title: 'Edit Course - Admin Portal | ASTI IMS' };

export default async function EditCoursePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  // Enforce lead update permissions
  const session = await assertPermission('course.catalog.update');

  const { courseService, categoryService } = await import('@/lib/runtime');

  const course = await courseService.getCourseById(id);
  if (!course) {
    notFound();
  }

  const categories = await categoryService.listCategories();
  const departments = await prisma.department.findMany({
    where: { isDeleted: false },
    select: { id: true, departmentName: true },
  });

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title={`Edit Course: ${course.nameEnglish}`}
        description="Update course details, classify under taxonomies, or transition statuses."
        backUrl="/courses-catalog"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Courses', href: '/courses-catalog', icon: <BookOpen className="h-3.5 w-3.5" /> },
              { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div>
        <CourseEditClient
          course={course}
          categories={categories}
          departments={departments}
          sessionPermissions={session.permissions}
        />
      </div>
    </div>
  );
}
