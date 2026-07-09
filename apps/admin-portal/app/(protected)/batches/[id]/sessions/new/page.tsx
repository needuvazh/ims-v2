import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { Breadcrumbs, PageHeader, Button } from '@ims/shared-ui';
import { Home, Layers, CalendarPlus, ShieldAlert } from 'lucide-react';
import { SessionScheduleForm } from '../_components/session-schedule-form';
import { createSessionAction } from '../../../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'Schedule New Session - Admin Portal | ASTI IMS' };

export default async function NewSessionPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: batchId } = await props.params;

  // Assert scheduling manager permission
  await assertPermission('schedule.manage');

  const batch = await prisma.batch.findUnique({
    where: { id: batchId, isDeleted: false },
    include: {
      course: true,
    },
  });

  if (!batch) {
    notFound();
  }

  // Fetch assigned faculty for the batch
  const assignedTrainers = await prisma.batchTrainer.findMany({
    where: { batchId: batch.id, isDeleted: false, status: 'Active' },
  });

  // If no faculty is assigned, prevent scheduling sessions
  if (assignedTrainers.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Schedule Session"
          description="Configure date, time, trainer, and classroom with live availability validation."
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
                  label: 'Schedule Session',
                  icon: <CalendarPlus className="h-3.5 w-3.5" />,
                },
              ]}
            />
          }
        />

        <div className="p-8 max-w-2xl mx-auto text-center bg-white/80 backdrop-blur-md border border-[color:var(--ims-border)] shadow-sm rounded-2xl space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-50 text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Faculty Assignment Required</h3>
          <p className="text-sm text-slate-500">
            You must assign at least one faculty member to this batch before you can schedule sessions.
          </p>
          <div className="pt-2">
            <Link href={`/batches/${batch.id}`}>
              <Button size="sm">Go back to Batch details</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Resolve personIds from assigned trainer User IDs
  const assignedUserIds = assignedTrainers.map((at) => at.trainerId);
  const users = await prisma.user.findMany({
    where: { id: { in: assignedUserIds } },
    select: { personId: true },
  });
  const personIds = users.map((u) => u.personId);

  // Fetch active trainers from TrainerProfile matching the assigned personIds
  const trainersListRaw = await prisma.trainerProfile.findMany({
    where: {
      personId: { in: personIds },
      isDeleted: false,
      status: 'Active',
    },
    select: {
      id: true,
      person: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  const trainersList = trainersListRaw.map((t) => ({
    id: t.id,
    email: t.person.email || '',
    displayName: `${t.person.firstName} ${t.person.lastName}`,
  }));

  // Fetch active classrooms for this branch
  const classroomsList = await prisma.classroom.findMany({
    where: { branchId: batch.branchId, isDeleted: false, status: 'Active' },
    select: {
      id: true,
      classroomName: true,
      capacity: true,
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Schedule Session"
        description="Configure date, time, trainer, and classroom with live availability validation."
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
                label: 'Schedule Session',
                icon: <CalendarPlus className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
      />

      <SessionScheduleForm
        batchId={batch.id}
        courseId={batch.courseId}
        branchId={batch.branchId}
        batchCode={batch.batchCode}
        batchName={batch.batchNameEnglish}
        trainersList={trainersList}
        classroomsList={classroomsList}
        onSubmitAction={createSessionAction}
        batchStartDate={batch.startDate.toISOString().split('T')[0]}
        batchEndDate={batch.endDate.toISOString().split('T')[0]}
      />
    </div>
  );
}
