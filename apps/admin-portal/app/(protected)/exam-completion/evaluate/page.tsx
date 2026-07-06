import { assertPermission } from '@/lib/auth-guard';
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { Home, Layers, PlayCircle } from 'lucide-react';
import { prisma } from '@ims/database';
import { EvaluateForm } from './_components/evaluate-form';

export const metadata = { title: 'Evaluate Course Completion - Admin Portal | ASTI IMS' };

export default async function EvaluateCompletionPage() {
  await assertPermission('completion.evaluate');

  const enrollments = await prisma.enrollment.findMany({
    where: { isDeleted: false },
    include: {
      studentProfile: {
        include: {
          person: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      course: {
        select: { nameEnglish: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formattedEnrollments = enrollments.map(e => ({
    id: e.id,
    enrollmentNumber: e.enrollmentNumber,
    studentName: e.studentProfile?.person 
      ? `${e.studentProfile.person.firstName} ${e.studentProfile.person.lastName}`
      : 'Unknown Student',
    courseName: e.course?.nameEnglish || 'Unknown Course',
  }));

  return (
    <AdminFormPageLayout>
      <PageHeader
        title="Evaluate Course Completion"
        description="Run the evaluation engine against a student's enrollment record to assess certificate eligibility based on grades, attendance, and financial standing."
        backUrl="/exam-completion/completions"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Completions', href: '/exam-completion/completions', icon: <Layers className="h-3.5 w-3.5" /> },
              { label: 'Evaluate', icon: <PlayCircle className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div>
        <EvaluateForm enrollments={formattedEnrollments} />
      </div>
    </AdminFormPageLayout>
  );
}
