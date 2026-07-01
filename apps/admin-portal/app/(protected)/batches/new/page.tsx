import { assertPermission } from '@/lib/auth-guard';
import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
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

  // Fetch Branches the user has access to
  const isSuperAdmin = session.roles.includes('SUPER_ADMIN') || session.roles.includes('OWNER');
  let branches;
  if (isSuperAdmin) {
    branches = await prisma.branch.findMany({
      where: { isDeleted: false },
      select: { id: true, branchName: true },
    });
  } else {
    // Resolve based on user branch access mappings
    const access = await prisma.userBranchAccess.findMany({
      where: { userId: session.userId, status: 'Active' },
      include: { branch: true },
    });
    branches = access.map((a) => ({
      id: a.branch.id,
      branchName: a.branch.branchName,
    }));
  }

  // Fetch active classrooms
  const classrooms = await prisma.classroom.findMany({
    where: { isDeleted: false, status: 'Active' },
    select: { id: true, classroomName: true, capacity: true },
  });

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Create Batch"
        description="Establish a new training batch schedule, select the classroom, and allocate capacity."
        backUrl="/batches"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Batches', href: '/batches', icon: <Layers className="h-3.5 w-3.5" /> },
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
          onSubmitAction={createBatchAction}
        />
      </div>
    </div>
  );
}
