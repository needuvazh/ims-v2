import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { Home, Layers, CalendarRange } from 'lucide-react';
import { SessionScheduleForm } from '../../_components/session-schedule-form';
import { updateSessionAction } from '../../../../actions';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Edit Session - Admin Portal | ASTI IMS' };

export default async function EditSessionPage(props: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id: batchId, sessionId } = await props.params;

  // Assert scheduling manager permission
  await assertPermission('schedule.manage');

  const [batch, session] = await Promise.all([
    prisma.batch.findUnique({
      where: { id: batchId, isDeleted: false },
      include: { course: true },
    }),
    prisma.session.findUnique({
      where: { id: sessionId, batchId, isDeleted: false },
    }),
  ]);

  if (!batch || !session) {
    notFound();
  }

  // Fetch assigned faculty for the batch to filter the trainers availability check
  const assignedTrainers = await prisma.batchTrainer.findMany({
    where: { batchId: batch.id, isDeleted: false, status: 'Active' },
  });

  // Resolve personIds from assigned trainer User IDs and session's current trainer User ID
  const assignedUserIds = assignedTrainers.map((at) => at.trainerId);
  if (session.trainerId) {
    assignedUserIds.push(session.trainerId);
  }
  const users = await prisma.user.findMany({
    where: { id: { in: assignedUserIds } },
    select: { id: true, personId: true },
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
      personId: true,
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

  // Resolve initial selected trainer profile ID from the session's current trainer (supports legacy User ID and TrainerProfile ID)
  let initialTrainerProfileId = '';
  if (session.trainerId) {
    const existsAsProfile = trainersListRaw.find((tp) => tp.id === session.trainerId);
    if (existsAsProfile) {
      initialTrainerProfileId = existsAsProfile.id;
    } else {
      const sessionTrainerUser = users.find((u) => u.id === session.trainerId);
      if (sessionTrainerUser) {
        const sessionTrainerProfile = trainersListRaw.find(
          (tp) => tp.personId === sessionTrainerUser.personId
        );
        if (sessionTrainerProfile) {
          initialTrainerProfileId = sessionTrainerProfile.id;
        }
      }
    }
  }

  // Fetch active classrooms for this branch
  const classroomsList = await prisma.classroom.findMany({
    where: { branchId: batch.branchId, isDeleted: false, status: 'Active' },
    select: {
      id: true,
      classroomName: true,
      capacity: true,
    },
  });

  const mappedSessionData = {
    id: session.id,
    sessionNumber: session.sessionNumber,
    titleEnglish: session.titleEnglish,
    titleArabic: session.titleArabic,
    sessionDate: session.sessionDate.toISOString(),
    startTime: session.startTime,
    endTime: session.endTime,
    trainerId: initialTrainerProfileId,
    classroomId: session.classroomId || '',
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Edit Session"
        description="Reschedule session parameters and re-evaluate live availability."
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
                label: `Session #${session.sessionNumber}`,
                href: `/batches/${batch.id}`,
                icon: <CalendarRange className="h-3.5 w-3.5" />,
              },
              {
                label: 'Edit',
                icon: <CalendarRange className="h-3.5 w-3.5" />,
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
        onSubmitAction={async (batchId, data) => {
          'use server';
          return updateSessionAction(batchId, session.id, data);
        }}
        initialData={mappedSessionData}
        batchStartDate={batch.startDate.toISOString().split('T')[0]}
        batchEndDate={batch.endDate.toISOString().split('T')[0]}
      />
    </div>
  );
}
