import { assertPermission } from '@/lib/auth-guard';
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { Home, Layers, PlusCircle } from 'lucide-react';
import { prisma } from '@ims/database';
import { ExamForm } from './_components/exam-form';

export const metadata = { title: 'Create Exam - Admin Portal | ASTI IMS' };

export default async function CreateExamPage() {
  await assertPermission('exam.create');

  const courses = await prisma.course.findMany({
    where: { isDeleted: false },
    select: { id: true, nameEnglish: true },
  });

  const batches = await prisma.batch.findMany({
    where: {
      isDeleted: false,
      status: { in: ['InProgress', 'Completed'] },
    },
    select: { id: true, batchNameEnglish: true, courseId: true },
  });

  return (
    <AdminFormPageLayout>
      <PageHeader
        title="Create Exam"
        description="Establish a new exam schedule, configure maximum and passing marks."
        backUrl="/exam-completion/exams"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Exams',
                href: '/exam-completion/exams',
                icon: <Layers className="h-3.5 w-3.5" />,
              },
              { label: 'Create', icon: <PlusCircle className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div>
        <ExamForm courses={courses} batches={batches} />
      </div>
    </AdminFormPageLayout>
  );
}
