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

  const enrollments = await prisma.enrollment.findMany({
    where: { batchId: exam.batchId, isDeleted: false },
    include: {
      studentProfile: {
        include: {
          person: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  });

  const existingResults = await prisma.result.findMany({
    where: { examId: id, isDeleted: false },
  });

  const rosterResults = enrollments.map((enr) => {
    const existing = existingResults.find((r) => r.enrollmentId === enr.id);
    return {
      id: existing?.id || `temp-${enr.id}`,
      enrollmentId: enr.id,
      examId: id,
      marksObtained: existing ? existing.marksObtained.toNumber() : 0,
      grade: existing?.grade || '',
      resultStatus: existing?.resultStatus || 'Pending',
      enrollment: {
        enrollmentNumber: enr.enrollmentNumber,
        studentProfile: {
          person: {
            firstName: enr.studentProfile?.person?.firstName || 'Unknown',
            lastName: enr.studentProfile?.person?.lastName || 'Student',
          },
        },
      },
      exam: {
        examName: exam.examName,
        maxMarks: exam.maxMarks.toNumber(),
        passMarks: exam.passMarks.toNumber(),
        status: exam.status,
      },
    };
  });

  const resultStats = {
    total: rosterResults.length,
    recorded: rosterResults.filter((r) => r.resultStatus === 'Recorded').length,
    finalized: rosterResults.filter((r) => r.resultStatus === 'Finalized').length,
    pending: rosterResults.filter((r) => r.resultStatus === 'Pending').length,
  };

  const serializedExam = {
    ...exam,
    maxMarks: exam.maxMarks.toNumber(),
    passMarks: exam.passMarks.toNumber(),
  };

  return (
    <AdminDetailPageLayout className="pt-1 sm:pt-0">
      <ExamDetailClient
        exam={serializedExam}
        results={rosterResults}
        resultStats={resultStats}
        permissions={session.permissions}
      />
    </AdminDetailPageLayout>
  );
}
