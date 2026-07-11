import { assertPermission } from '@/lib/auth-guard';
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { Home, Layers, Copy } from 'lucide-react';
import { prisma } from '@ims/database';
import { CloneBatchForm } from '../../_components/clone-batch-form';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Clone Batch - Admin Portal | ASTI IMS' };

export default async function CloneBatchPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  // Assert permissions required
  const session = await assertPermission('batch.delivery.create');
  await assertPermission('schedule.manage');

  // Fetch the source batch to clone
  const sourceBatch = await prisma.batch.findUnique({
    where: { id, isDeleted: false },
    include: {
      course: true,
    },
  });

  if (!sourceBatch) {
    notFound();
  }

  // Fetch Scheduled Sessions of original batch
  const sessions = await prisma.session.findMany({
    where: { batchId: id, isDeleted: false },
    orderBy: { sessionNumber: 'asc' },
  });

  // Fetch the active primary trainer (if any)
  const primaryTrainer = await prisma.batchTrainer.findFirst({
    where: {
      batchId: id,
      role: 'Primary',
      status: 'Active',
      isDeleted: false,
    },
    select: {
      trainerId: true,
    },
  });

  // Fetch Published courses for selection
  const courses = await prisma.course.findMany({
    where: { status: 'Published', isDeleted: false },
    select: { id: true, courseCode: true, nameEnglish: true },
  });

  // Fetch active branch context from the session
  const branches = [];
  if (session.activeBranchId) {
    const activeBranch = await prisma.branch.findUnique({
      where: { id: session.activeBranchId as string, isDeleted: false },
      select: { id: true, branchName: true },
    });
    if (activeBranch) {
      branches.push(activeBranch);
    }
  }

  // Fetch active classrooms
  const classrooms = await prisma.classroom.findMany({
    where: { isDeleted: false, status: 'Active' },
    select: { id: true, classroomName: true, capacity: true },
  });

  // Fetch active trainers with person details
  const trainersListRaw = await prisma.user.findMany({
    where: {
      isDeleted: false,
      status: 'Active',
      roles: {
        some: {
          role: {
            roleCode: 'TRAINER',
          },
        },
      },
    },
    include: {
      person: true,
    },
  });

  const trainersList = trainersListRaw.map((t) => ({
    id: t.id,
    displayName: t.person
      ? `${t.person.firstName} ${t.person.lastName}`
      : t.email,
    email: t.email,
  }));

  return (
    <AdminFormPageLayout>
      <PageHeader
        title={`Clone Batch: ${sourceBatch.batchCode}`}
        description={`Duplicate all batch settings and session schedule configurations for ${sourceBatch.batchNameEnglish}.`}
        backUrl={`/batches/${id}`}
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
                label: sourceBatch.batchCode,
                href: `/batches/${id}`,
                icon: <Layers className="h-3.5 w-3.5" />,
              },
              { label: 'Clone', icon: <Copy className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div>
        <CloneBatchForm
          courses={courses}
          branches={branches}
          classrooms={classrooms}
          trainersList={trainersList}
          sourceBatch={sourceBatch}
          sourceSessions={sessions}
          initialTrainerId={primaryTrainer?.trainerId || ''}
        />
      </div>
    </AdminFormPageLayout>
  );
}
