import { AdminListPageLayout } from '@ims/shared-ui';
import { getSession } from '../../../lib/auth-guard';
import { AuditClientList } from './_components/audit-client-list';

export const metadata = { title: 'Audit | IMS Admin' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  page?: string;
  pageSize?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  performerId?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}>;

export default async function IamAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const session = await getSession();

  const page = Number.parseInt(resolved.page ?? '1', 10) || 1;
  const pageSize = Number.parseInt(resolved.pageSize ?? '20', 10) || 20;

  const action = resolved.action?.trim() ?? '';
  const entityType = resolved.entityType?.trim() ?? '';
  const entityId = resolved.entityId?.trim() ?? '';
  const performerId = resolved.performerId?.trim() ?? '';
  const moduleParam =
    resolved.module !== undefined ? resolved.module.trim() : 'iam';
  const startDateStr = resolved.startDate?.trim() ?? '';
  const endDateStr = resolved.endDate?.trim() ?? '';

  const { auditQueryService } = await import('../../../lib/runtime');

  let startDate: Date | undefined;
  if (startDateStr) {
    startDate = new Date(`${startDateStr}T00:00:00.000Z`);
  }
  let endDate: Date | undefined;
  if (endDateStr) {
    endDate = new Date(`${endDateStr}T23:59:59.999Z`);
  }

  const result = await auditQueryService.listAuditLogs(
    {
      action: action || undefined,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      performerId: performerId || undefined,
      module: moduleParam || undefined,
      startDate,
      endDate,
    },
    page,
    pageSize,
    {
      actorId: session.userId as never,
      actorPermissions: session.permissions,
      activeBranchId: session.activeBranchId as never,
    },
  );

  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

  const auditLogs = result.items.map((item) => ({
    id: item.id,
    performedAt: item.performedAt.toISOString(),
    module: item.module,
    action: item.action,
    entityType: item.entityType,
    entityId: item.entityId,
    performedBy: item.performedBy,
    branchId: item.branchId,
    reason: item.reason,
    oldValue: item.oldValue,
    newValue: item.newValue,
    ipAddress: item.ipAddress,
    userAgent: item.userAgent,
    correlationId: item.correlationId,
  }));

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <AuditClientList
        auditLogs={auditLogs}
        total={result.total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        initialAction={action}
        initialEntityType={entityType}
        initialEntityId={entityId}
        initialPerformerId={performerId}
        initialModule={moduleParam}
        initialStartDate={startDateStr}
        initialEndDate={endDateStr}
        initialSortBy={resolved.sortBy || 'performedAt'}
        initialSortOrder={resolved.sortOrder === 'asc' ? 'asc' : 'desc'}
      />
    </AdminListPageLayout>
  );
}
