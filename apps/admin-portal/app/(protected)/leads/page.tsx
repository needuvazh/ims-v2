import { createUuid, type Uuid } from '@ims/shared-kernel';
import { prisma } from '@ims/database';
import { assertPermission } from '../../lib/auth-guard';
import { LeadsClientList } from './_components/leads-client-list';

export default async function LeadsPage(props: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    source?: string;
    branchId?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // Enforce read permission at the route entry point
  const session = await assertPermission('lead.read');

  const { branchScopeResolver, leadService, organizationService, userService } =
    await import('../../lib/runtime');

  // Resolve allowed branch IDs for the active user context
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  // Counselor Isolation Check: non-global users only see their own assigned leads
  const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
  const counselorId = hasGlobalRead ? undefined : session.userId;

  // Build filters checking that requested branchId parameter lies within session permissions bounds
  let filterBranchIds = allowedBranchIds;
  if (searchParams.branchId) {
    const requestedUuid = createUuid(searchParams.branchId);
    if (allowedBranchIds.includes(requestedUuid)) {
      filterBranchIds = [requestedUuid];
    } else if (allowedBranchIds.length === 0) {
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
  };

  const { items: rawLeads, total } = await leadService.findAll(filters, { page, limit });

  // Map database lead fields to match UI expectations
  const leads = rawLeads.map((l) => ({
    ...l,
    branch: l.branch ? { id: l.branchId, name: l.branch.branchName } : null,
    counselor: l.counselor ? { id: l.counselorId, name: l.counselor.username } : null,
    interestedCourse: l.interestedCourse ? { id: l.interestedCourseId, nameEnglish: l.interestedCourse.name } : null,
  }));

  // Resolve master values lists (branches, courses, counselors) for the form inputs
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
  const courses = coursesResult.map((c: any) => ({ id: c.id, name: c.name }));

  const usersResult = (await userService.listUsers({
    actorId: session.userId,
    actorPermissions: session.permissions,
    activeBranchId: session.activeBranchId,
  })) as any[];
  const counselors = usersResult.map((u: any) => ({ id: u.id, name: u.username }));

  return (
    <div className="p-6">
      <LeadsClientList
        leads={leads}
        branches={branches}
        counselors={counselors}
        courses={courses}
        total={total}
        sessionUserId={session.userId}
      />
    </div>
  );
}
