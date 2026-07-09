import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { Home, Layers, Users } from 'lucide-react';
import { FacultyAssignmentClient } from './_components/faculty-assignment-client';

export const metadata = { title: 'Manage Faculty Assignments - Admin Portal | ASTI IMS' };

export default async function FacultyAssignmentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  // Assert assign permission
  await assertPermission('batch.delivery.assign');

  const batch = await prisma.batch.findUnique({
    where: { id, isDeleted: false },
    include: {
      course: true,
    },
  });

  if (!batch) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        Batch not found or has been deleted.
      </div>
    );
  }

  // Fetch published courses for the dropdown filter
  const courses = await prisma.course.findMany({
    where: { status: 'Published', isDeleted: false },
    select: { id: true, courseCode: true, nameEnglish: true },
    orderBy: { nameEnglish: 'asc' },
  });

  const courseList = courses.map((c) => ({
    id: c.id,
    courseCode: c.courseCode,
    nameEnglish: c.nameEnglish,
  }));

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Faculty Assignments: ${batch.batchCode}`}
        description={`Manage trainer assignments for batch ${batch.batchNameEnglish}`}
        backUrl={`/batches/${batch.id}`}
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Batches',
                href: '/batches',
                icon: <Layers className="h-3.5 w-3.5" />,
              },
              {
                label: batch.batchCode,
                href: `/batches/${batch.id}`,
                icon: <Layers className="h-3.5 w-3.5" />,
              },
              {
                label: 'Faculty Assignments',
                icon: <Users className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
      />

      <div className="bg-white/80 border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-6 backdrop-blur-md">
        <FacultyAssignmentClient
          batchId={batch.id}
          batchCode={batch.batchCode}
          courseId={batch.courseId}
          courseName={batch.course.nameEnglish}
          startDate={batch.startDate.toISOString().split('T')[0]}
          endDate={batch.endDate.toISOString().split('T')[0]}
          courses={courseList}
        />
      </div>
    </div>
  );
}
