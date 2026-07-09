import { assertPermission } from '@/lib/auth-guard';
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { Home, Layers, PlusCircle } from 'lucide-react';
import { prisma } from '@ims/database';
import { BatchForm } from '../_components/batch-form';
import { createBatchAction } from '../actions';

export const metadata = { title: 'Create Batch - Admin Portal | ASTI IMS' };

export default async function CreateBatchPage() {
  const session = await assertPermission('schedule.manage');

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
        title="Create Batch"
        description="Establish a new training batch schedule, select the classroom, and allocate capacity."
        backUrl="/batches"
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
              { label: 'Create', icon: <PlusCircle className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div>
        <BatchForm
          courses={courses}
          branches={branches}
          classrooms={classrooms}
          trainersList={trainersList}
          onSubmitAction={createBatchAction}
        />
      </div>
    </AdminFormPageLayout>
  );
}
