import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { assertPermission } from '@/lib/auth-guard';
import { LeadForm } from '../_components/lead-form';
import { createLeadAction } from '../actions';
import { createUuid } from '@ims/shared-kernel';
import { prisma } from '@ims/database';
import { Home, ClipboardList, PlusCircle } from 'lucide-react';

export const metadata = { title: 'Create Lead - CRM | ASTI IMS' };

export default async function CreateLeadPage() {
  const session = await assertPermission('lead.create');

  const { branchScopeResolver, organizationService, userService } = await import('@/lib/runtime');

  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  const branchesResult = await organizationService.listBranches({ pageSize: 100 });
  const branches =
    allowedBranchIds.length === 0
      ? branchesResult.items.map((b) => ({ id: b.id, name: b.branchName }))
      : branchesResult.items
          .filter((b) => allowedBranchIds.includes(b.id as any))
          .map((b) => ({ id: b.id, name: b.branchName }));

  const coursesResult = await prisma.course.findMany({
    where: { status: 'Active' },
    select: { id: true, name: true },
  });
  const courses = coursesResult.length > 0
    ? coursesResult.map((c: any) => ({ id: c.id, name: c.name }))
    : [
        { id: 'CS-FSWD', name: 'Full Stack Web Development (Fallback)' },
        { id: 'CS-MDEV', name: 'Mobile App Development (Fallback)' },
        { id: 'CS-CSEC', name: 'Advanced Cyber Security & Ethical Hacking (Fallback)' },
        { id: 'CS-DSAI', name: 'Data Science and Artificial Intelligence (Fallback)' },
        { id: 'CS-CLAW', name: 'Cloud Solutions Architecture (Fallback)' },
        { id: 'CS-UIUX', name: 'UI/UX Design & Product Strategy (Fallback)' },
      ];

  const usersResult = (await userService.listUsers({
    actorId: session.userId,
    actorPermissions: session.permissions,
    activeBranchId: session.activeBranchId,
  })) as any[];
  const counselors = usersResult.map((u: any) => ({ id: u.id, name: u.username }));

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Create Lead"
        description="Add a new lead or enquiry to the CRM pipeline."
        backUrl="/leads"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Leads', href: '/leads', icon: <ClipboardList className="h-3.5 w-3.5" /> },
              { label: 'Create', icon: <PlusCircle className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div>
        <LeadForm branches={branches} counselors={counselors} courses={courses} onSubmitAction={createLeadAction} />
      </div>
    </div>
  );
}
