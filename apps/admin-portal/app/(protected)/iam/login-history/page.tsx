import { AdminListPageLayout } from '@ims/shared-ui';
import { LoginHistoryClientList } from './_components/login-history-client-list';

export const metadata = { title: 'Login History | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IamLoginHistoryPage(props: {
  searchParams: Promise<{
    userId?: string;
    status?: string;
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: string;
    q?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const { loginHistoryQueryService } = await import('../../../lib/runtime');
  const { getSession } = await import('../../../lib/auth-guard');

  const session = await getSession();

  const page = Number.parseInt(searchParams.page ?? '1', 10) || 1;
  const pageSize = Number.parseInt(searchParams.pageSize ?? '20', 10) || 20;
  const status = searchParams.status?.trim() ?? '';
  const userId = searchParams.userId?.trim() ?? '';

  let resolvedUserId: string | null = null;
  let userNotFound = false;

  if (userId) {
    const isUuid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        userId,
      );
    if (isUuid) {
      resolvedUserId = userId;
    } else if (session.permissions.includes('iam.user.read')) {
      const { userRepository } = await import('../../../lib/runtime');
      const user =
        (await userRepository.findByEmail(userId.toLowerCase())) ||
        (await userRepository.findByUsername(userId));
      if (user) {
        resolvedUserId = user.id;
      } else {
        userNotFound = true;
      }
    } else {
      userNotFound = true;
    }
  }

  const result = userNotFound
    ? { items: [], total: 0 }
    : resolvedUserId
      ? await loginHistoryQueryService.listUserLoginHistory(
          resolvedUserId as never,
          page,
          pageSize,
          {
            actorId: session.userId as never,
            actorPermissions: session.permissions,
            activeBranchId: session.activeBranchId as never,
          },
        )
      : await loginHistoryQueryService.listSecurityLoginHistory(
          { status: status || undefined },
          page,
          pageSize,
          {
            actorId: session.userId as never,
            actorPermissions: session.permissions,
            activeBranchId: session.activeBranchId as never,
          },
        );

  const rows = result.items.map((item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    attemptedEmail: item.attemptedEmail,
    status: item.status,
    failureReason: item.failureReason,
    browser: item.browser,
    os: item.os,
    device: item.device,
    ipAddress: item.ipAddress,
    branchId: item.branchId,
    userId: item.userId,
  }));

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <LoginHistoryClientList
        rows={rows}
        userNotFound={userNotFound}
        initialSearch={searchParams.q || ''}
        initialStatus={status}
        initialSortBy={searchParams.sortBy || 'createdAt'}
        initialSortOrder={searchParams.sortOrder === 'desc' ? 'desc' : 'asc'}
        initialPage={page}
        initialLimit={pageSize}
      />
    </AdminListPageLayout>
  );
}
