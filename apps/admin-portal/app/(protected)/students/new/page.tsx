import { assertAnyPermission } from '@/lib/auth-guard';
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { Home, Users, PlusCircle } from 'lucide-react';
import { StudentRegistrationWorkflow } from './_components/student-registration-workflow';

export const metadata = { title: 'Create Student | ASTI IMS' };

export default async function NewStudentPage() {
  const session = await assertAnyPermission(['student.create', 'student.write']);
  const { branchScopeResolver, prisma } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  const branches = await prisma.branch.findMany({
    where: { id: allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined, isDeleted: false },
    select: { id: true, branchName: true },
  });

  return (
    <AdminFormPageLayout>
      <PageHeader
        title="Create Student"
        description="Create a branch-scoped student profile."
        backUrl="/students"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Students', href: '/students', icon: <Users className="h-3.5 w-3.5" /> },
              { label: 'Create', icon: <PlusCircle className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />

      <StudentRegistrationWorkflow
        branches={branches.map((branch) => ({ id: branch.id, name: branch.branchName }))}
      />
    </AdminFormPageLayout>
  );
}
