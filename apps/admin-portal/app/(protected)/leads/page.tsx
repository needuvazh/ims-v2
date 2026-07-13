import { createUuid, type Uuid } from '@ims/shared-kernel';
import { assertPermission } from '../../lib/auth-guard';
import { LeadsClientList } from './_components/leads-client-list';
import { AdminListPageLayout } from '@ims/shared-ui';

export default async function LeadsPage(props: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    source?: string;
    branchId?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
    nationalId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // Enforce read permission at the route entry point
  const session = await assertPermission('lead.read');

  const { branchScopeResolver, leadService, organizationService } =
    await import('../../lib/runtime');

  // Resolve allowed branch IDs for the active user context
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  // Counselor Isolation Check: non-global users only see their own assigned leads
  const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
  const counselorId = hasGlobalRead ? undefined : session.userId;

  // Build filters checking that requested branchId parameter lies within session permissions bounds
  let filterBranchIds = allowedBranchIds;
  if (filterBranchIds.length === 0) {
    filterBranchIds = [createUuid('00000000-0000-0000-0000-000000000000')];
  } else if (searchParams.branchId) {
    const requestedUuid = createUuid(searchParams.branchId);
    if (allowedBranchIds.includes(requestedUuid)) {
      filterBranchIds = [requestedUuid];
    } else {
      // Force empty to return no leads if unauthorized branch was requested
      filterBranchIds = [createUuid('00000000-0000-0000-0000-000000000000')];
    }
  }

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 10;

  const filters = {
    branchIds: filterBranchIds.length > 0 ? filterBranchIds : undefined,
    stage: searchParams.stage as any,
    source: searchParams.source as any,
    counselorId,
    search: searchParams.q,
    sortBy: searchParams.sortBy as any,
    sortOrder: searchParams.sortOrder as any,
    nationalId: searchParams.nationalId,
  };

  const { items: rawLeads, total } = await leadService.findAll(filters, {
    page,
    limit,
  });

  // Map database lead fields to match UI expectations
  const leads = rawLeads.map((l) => ({
    ...l,
    branch: l.branch ? { id: l.branchId, name: l.branch.branchName } : null,
    counselor: l.counselor
      ? { id: l.counselorId, name: l.counselor.username }
      : null,
    interestedCourse: l.interestedCourse
      ? {
          id: l.interestedCourseId,
          nameEnglish: l.interestedCourse.nameEnglish,
        }
      : null,
  }));

  // Resolve master values lists (branches, courses, counselors) for the form inputs
  const branchesResult = await organizationService.listBranches({
    pageSize: 100,
  });
  const branches =
    allowedBranchIds.length === 0
      ? branchesResult.items.map((b) => ({ id: b.id, name: b.branchName }))
      : branchesResult.items
          .filter((b) => allowedBranchIds.includes(b.id as any))
          .map((b) => ({ id: b.id, name: b.branchName }));

  const canCreate =
    session.permissions.includes('lead.create') ||
    session.permissions.includes('lead.write');

  const canUpdate =
    session.permissions.includes('lead.update') ||
    session.permissions.includes('lead.write');

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <LeadsClientList
        leads={leads}
        branches={branches}
        total={total}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />
    </AdminListPageLayout>
  );
}
