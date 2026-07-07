import { prisma } from '@ims/database';
import { assertPermission } from '@/lib/auth-guard';
import { ApprovalQueueClientList } from './_components/approval-queue-client-list';
import { AdminListPageLayout, PageHeader, Breadcrumbs } from '@ims/shared-ui';
import { Home, Layers, CheckSquare } from 'lucide-react';

export const metadata = { title: 'Approval Queue - Admin Portal | ASTI IMS' };

export default async function ApprovalQueuePage() {
  await assertPermission('completion.view');

  const completions = await prisma.courseCompletion.findMany({
    where: {
      completionStatus: {
        in: ['AwaitingTrainerRecommendation', 'AwaitingCoordinatorReview', 'AwaitingFinalApproval'],
      },
      isDeleted: false,
    },
    include: {
      enrollment: {
        select: {
          enrollmentNumber: true,
          studentProfile: {
            select: {
              person: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          course: {
            select: {
              nameEnglish: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        eyebrow="Evaluation & Training"
        title="Completion Approval Queue"
        description="Sequential academic verification: Trainer Recommendation → Coordinator Review → Final Management Approval."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Completions', href: '/exam-completion/completions', icon: <Layers className="h-3.5 w-3.5" /> },
              { label: 'Approval Queue', icon: <CheckSquare className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />

      <ApprovalQueueClientList
        initialCompletions={completions.map((c) => ({
          ...c,
          attendancePercentage: c.attendancePercentage?.toNumber() ?? null,
        }))}
      />
    </AdminListPageLayout>
  );
}
