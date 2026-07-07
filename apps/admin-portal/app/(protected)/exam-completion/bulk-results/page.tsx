import { assertPermission } from '@/lib/auth-guard';
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { Home, Layers, Upload } from 'lucide-react';
import { prisma } from '@ims/database';
import { BulkResultsForm } from './_components/bulk-results-form';

export const metadata = { title: 'Bulk Result Entry - Admin Portal | ASTI IMS' };

export default async function BulkResultsPage() {
  await assertPermission('result.create');

  // Fetch only exams that are active and open for result entry
  const exams = await prisma.exam.findMany({
    where: { status: 'OpenForResultEntry', isDeleted: false },
    include: {
      course: { select: { nameEnglish: true } },
      batch: { select: { batchNameEnglish: true } },
    },
  });

  // Fetch enrollments to map enrollmentNumber -> studentName on the client side
  const enrollments = await prisma.enrollment.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      enrollmentNumber: true,
      studentProfile: {
        select: {
          person: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const formattedExams = exams.map(e => ({
    id: e.id,
    examName: e.examName,
    courseName: e.course.nameEnglish,
    batchName: e.batch.batchNameEnglish,
    maxMarks: e.maxMarks.toNumber(),
    passMarks: e.passMarks.toNumber(),
  }));

  const formattedEnrollments = enrollments.map(e => ({
    id: e.id,
    enrollmentNumber: e.enrollmentNumber,
    studentName: e.studentProfile?.person
      ? `${e.studentProfile.person.firstName} ${e.studentProfile.person.lastName}`
      : 'Unknown Student',
  }));

  return (
    <AdminFormPageLayout>
      <PageHeader
        title="Bulk Result Entry"
        description="Upload CSV or paste raw comma-separated records to import grades and marks in bulk for an exam roster."
        backUrl="/exam-completion/results"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Results', href: '/exam-completion/results', icon: <Layers className="h-3.5 w-3.5" /> },
              { label: 'Bulk Entry', icon: <Upload className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div>
        <BulkResultsForm exams={formattedExams} enrollments={formattedEnrollments} />
      </div>
    </AdminFormPageLayout>
  );
}
