import { prisma } from '@ims/database';
import { getSession } from '@/lib/auth-guard';
import { notFound } from 'next/navigation';
import { ExamDetailClient } from './_components/exam-detail-client';
import { AdminDetailPageLayout } from '@ims/shared-ui';

export const metadata = { title: 'Exam Detail - Admin Portal | ASTI IMS' };

export default async function ExamDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    notFound();
  }

  const exam = await prisma.exam.findUnique({
    where: { id, isDeleted: false },
    include: {
      course: { select: { nameEnglish: true } },
      batch: { select: { batchNameEnglish: true, branchId: true } },
    },
  });

  if (!exam) {
    notFound();
  }

  const results = await prisma.result.findMany({
    where: { examId: id, isDeleted: false },
    include: {
      enrollment: {
        select: {
          enrollmentNumber: true,
          studentProfile: {
            select: {
              person: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  const resultStats = {
    total: results.length,
    recorded: results.filter((r) => r.resultStatus === 'Recorded').length,
    finalized: results.filter((r) => r.resultStatus === 'Finalized').length,
    pending: results.filter((r) => r.resultStatus === 'Pending').length,
  };

  return (
    <AdminDetailPageLayout className="pt-1 sm:pt-0">
      <ExamDetailClient
        exam={exam}
        results={results}
        resultStats={resultStats}
        permissions={session.permissions}
      />
    </AdminDetailPageLayout>
  );
}
