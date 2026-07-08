import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { notFound } from 'next/navigation';
import {
  GetCompletionDetailQueryHandler,
  PrismaCourseCompletionRepository,
  PrismaCompletionApprovalRepository,
} from '@ims/exam-result-completion';
import { CompletionDetailClient } from './_components/completion-detail-client';
import { AdminDetailPageLayout } from '@ims/shared-ui';

export const metadata = {
  title: 'Course Completion Detail - Admin Portal | ASTI IMS',
};

export default async function CompletionDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const session = await assertPermission('completion.view');

  // 1. Fetch student/course contextual details from Prisma
  const completionDb = await prisma.courseCompletion.findUnique({
    where: { id, isDeleted: false },
    include: {
      enrollment: {
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
      },
    },
  });

  if (!completionDb) {
    notFound();
  }

  // 2. Fetch aggregate/timeline details using domain query handler
  const completionRepository = new PrismaCourseCompletionRepository(prisma);
  const approvalRepository = new PrismaCompletionApprovalRepository(prisma);
  const handler = new GetCompletionDetailQueryHandler(
    completionRepository,
    approvalRepository,
  );

  const detail = await handler.execute({ completionId: id });
  if (!detail) {
    notFound();
  }

  return (
    <AdminDetailPageLayout className="pt-1 sm:pt-0">
      <CompletionDetailClient
        completion={detail}
        context={{
          studentName: completionDb.enrollment.studentProfile?.person
            ? `${completionDb.enrollment.studentProfile.person.firstName} ${completionDb.enrollment.studentProfile.person.lastName}`
            : 'Unknown Student',
          enrollmentNumber: completionDb.enrollment.enrollmentNumber,
          courseName:
            completionDb.enrollment.course?.nameEnglish || 'Unknown Course',
        }}
        permissions={session.permissions}
      />
    </AdminDetailPageLayout>
  );
}
