import { notFound } from 'next/navigation';
import { assertPermission } from '@/lib/auth-guard';
import { type Uuid } from '@ims/shared-kernel';
import { prisma } from '@ims/database';
import { ConvertLeadWizard } from './_components/convert-lead-wizard';

export const metadata = { title: 'Convert Lead to Student | ASTI IMS' };

export default async function ConvertLeadPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: leadId } = await props.params;

  // Enforce permissions
  const session = await assertPermission('lead.convert');

  const { branchScopeResolver, leadService } = await import('@/lib/runtime');

  const lead = await leadService.getLeadById(leadId);
  if (!lead) {
    notFound();
  }

  // Branch Scope Check
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );
  if (
    allowedBranchIds.length > 0 &&
    !allowedBranchIds.includes(lead.branchId as Uuid)
  ) {
    throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
  }

  // Counselor Scope Check
  const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
  if (!hasGlobalRead && lead.counselorId !== session.userId) {
    throw new Error('ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION');
  }

  // Fetch existing documents for the lead's Person
  const existingDocs = await prisma.document.findMany({
    where: {
      isDeleted: false,
      owners: {
        some: {
          ownerId: lead.personId,
          ownerType: 'Person',
        },
      },
    },
  });

  const initialDocuments = existingDocs.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    fileKey: doc.fileKey,
    fileType: doc.fileType,
    documentType: doc.documentType,
  }));

  // Fetch lead's course details
  const course = lead.interestedCourse
    ? {
        id: lead.interestedCourse.id,
        nameEnglish: lead.interestedCourse.nameEnglish,
      }
    : null;

  const mappedLead = {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    nationalId: lead.nationalId,
    nationality: lead.nationality,
    personId: lead.personId,
    branchId: lead.branchId,
    interestedCourseId: lead.interestedCourseId,
    stage: lead.stage,
    gender: lead.person?.gender || 'Male',
    dateOfBirth: lead.person?.dateOfBirth ? lead.person.dateOfBirth.toISOString().split('T')[0] : '',
    course,
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <ConvertLeadWizard lead={mappedLead} initialDocuments={initialDocuments} />
    </div>
  );
}
