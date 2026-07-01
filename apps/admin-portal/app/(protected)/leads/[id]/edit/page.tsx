import { notFound } from 'next/navigation';
import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { assertPermission } from '@/lib/auth-guard';
import { LeadForm } from '../../_components/lead-form';
import { updateLeadAction } from '../../actions';
import { createUuid, type Uuid } from '@ims/shared-kernel';
import { prisma } from '@ims/database';
import { Home, ClipboardList, Pencil } from 'lucide-react';

export const metadata = { title: 'Edit Lead - CRM | ASTI IMS' };

export default async function EditLeadPage(props: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await props.params;

  // Enforce lead update permissions
  const session = await assertPermission('lead.update');

  const { branchScopeResolver, leadService, organizationService, userService } = await import('@/lib/runtime');

  const lead = await leadService.getLeadById(leadId);
  if (!lead) {
    notFound();
  }

  // Branch Scope Check
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );
  if (allowedBranchIds.length > 0 && !allowedBranchIds.includes(lead.branchId as Uuid)) {
    throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
  }

  // Counselor Scope Check
  const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
  if (!hasGlobalRead && lead.counselorId !== session.userId) {
    throw new Error('ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION');
  }

  const branches =
    allowedBranchIds.length === 0
      ? (await organizationService.listBranches({ pageSize: 100 })).items.map((b: any) => ({ id: b.id, name: b.branchName }))
      : (await organizationService.listBranches({ pageSize: 100 })).items
          .filter((b: any) => allowedBranchIds.includes(b.id as any))
          .map((b: any) => ({ id: b.id, name: b.branchName }));

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
        title={`Edit Lead: ${lead.firstName} ${lead.lastName}`}
        description="Update lead details, pipeline status, or capture follow-up lost notes."
        backUrl="/leads"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Leads', href: '/leads', icon: <ClipboardList className="h-3.5 w-3.5" /> },
              { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div>
        <LeadForm
          initialData={{
            ...lead,
            dateOfBirth: lead.person?.dateOfBirth,
          }}
          branches={branches}
          counselors={counselors}
          courses={courses}
          onSubmitAction={updateLeadAction}
        />
      </div>
    </div>
  );
}
