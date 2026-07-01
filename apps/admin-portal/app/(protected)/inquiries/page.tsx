import { createUuid, type Uuid } from '@ims/shared-kernel';
import { assertPermission } from '../../lib/auth-guard';
import { InquiriesClientList } from './_components/inquiries-client-list';

export default async function InquiriesPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    branchId?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // Assert user is allowed to read leads/CRM data
  const session = await assertPermission('lead.read');

  const { branchScopeResolver, inquiryService, organizationService } = await import('../../lib/runtime');

  // Resolve counselor's scoped allowed branches
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  // Counselor Scoping: if user lacks broad visibility, restrict read queries to counselor's assigned items
  const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
  const counselorId = hasGlobalRead ? undefined : session.userId;

  let filterBranchIds = allowedBranchIds;
  if (searchParams.branchId) {
    const requestedUuid = createUuid(searchParams.branchId);
    if (allowedBranchIds.includes(requestedUuid)) {
      filterBranchIds = [requestedUuid];
    } else if (allowedBranchIds.length === 0) {
      filterBranchIds = [requestedUuid];
    } else {
      // Force empty to block cross-branch queries
      filterBranchIds = [createUuid('00000000-0000-0000-0000-000000000000')];
    }
  }

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 10;

  const filters = {
    branchIds: filterBranchIds.length > 0 ? filterBranchIds : undefined,
    status: searchParams.status || undefined,
    counselorId,
    search: searchParams.q,
  };

  const { items: inquiries, total } = await inquiryService.findAll(filters, { page, limit });

  const branchesResult = await organizationService.listBranches({ pageSize: 100 });
  const branches =
    allowedBranchIds.length === 0
      ? branchesResult.items.map((b) => ({ id: b.id, name: b.branchName }))
      : branchesResult.items
          .filter((b) => allowedBranchIds.includes(b.id as any))
          .map((b) => ({ id: b.id, name: b.branchName }));

  return (
    <div className="p-6">
      <InquiriesClientList inquiries={inquiries} branches={branches} total={total} />
    </div>
  );
}
