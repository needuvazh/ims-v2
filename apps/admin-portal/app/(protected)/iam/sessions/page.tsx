import React from 'react';
import { AdminListPageLayout } from '@ims/shared-ui';
import { getSession } from '../../../lib/auth-guard';
import { SessionsClientList } from './_components/sessions-client-list';

export const metadata = { title: 'Sessions | IMS Admin' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ query?: string; sortBy?: string; sortOrder?: string }>;

export default async function IamSessionsPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const query = resolved.query?.trim() ?? '';
  const session = await getSession();
  const { sessionService, userService } = await import('../../../lib/runtime');

  let user: any = null;
  let sessions: Array<{ id: string; userId: string; activeBranchId: string | null; status: string; expiresAt: Date; lastActivityAt: Date; userAgent: string | null; ipAddress: string | null }> = [];

  if (query) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
    try {
      if (isUuid) {
        user = await userService.getUserById(query, {
          actorId: session.userId as never,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId as never,
        });
      } else {
        user = await userService.getUserByEmail(query, {
          actorId: session.userId as never,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId as never,
        });
      }
    } catch {
      // User not found or access denied
    }

    if (user) {
      try {
        sessions = await sessionService.listUserSessions(user.id as never, {
          actorId: session.userId as never,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId as never,
        });
      } catch {
        // Could not retrieve sessions
      }
    }
  }

  const sessionRows = sessions.map((item) => ({
    id: item.id,
    userId: item.userId,
    userEmail: user?.email ?? null,
    activeBranchId: item.activeBranchId,
    status: item.status,
    expiresAt: item.expiresAt.toISOString(),
    lastActivityAt: item.lastActivityAt.toISOString(),
    userAgent: item.userAgent,
    ipAddress: item.ipAddress,
  }));

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <SessionsClientList
        sessions={sessionRows}
        userEmail={user?.email ?? null}
        userId={user?.id ?? null}
        initialQuery={query}
        initialSortBy={resolved.sortBy || 'lastActivityAt'}
        initialSortOrder={resolved.sortOrder === 'desc' ? 'desc' : 'asc'}
      />
    </AdminListPageLayout>
  );
}
