import React from 'react';
import Link from 'next/link';
import { Clock3, ExternalLink, Home, ShieldCheck, Activity } from 'lucide-react';
import { Breadcrumbs, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, AdminListPageLayout, PageHeader, ResponsiveDataTable, Badge } from '@ims/shared-ui';
import { getSession } from '../../../lib/auth-guard';
import { terminateSessionAction, terminateAllSessionsAction } from './actions';

export const metadata = { title: 'Sessions | IMS Admin' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ userId?: string; query?: string }>;

export default async function IamSessionsPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const query = (resolved.query || resolved.userId)?.trim() ?? '';
  const session = await getSession();
  const { sessionService, userService } = await import('../../../lib/runtime');

  let user: any = null;
  let errorMsg = '';
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
    } catch (e: any) {
      if (e.errorCode === 'IAM-SYS-001' || e.message === 'Unexpected server error') {
        errorMsg = 'User not found.';
      } else {
        errorMsg = e.message || 'User not found or access denied.';
      }
    }

    if (user) {
      try {
        sessions = await sessionService.listUserSessions(user.id as never, {
          actorId: session.userId as never,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId as never,
        });
      } catch (e: any) {
        errorMsg = e.message || 'Could not retrieve sessions.';
      }
    }
  }

  const rows = sessions.map((item) => ({
    id: item.id,
    userId: item.userId,
    activeBranchId: item.activeBranchId,
    status: item.status,
    expiresAt: item.expiresAt.toISOString(),
    lastActivityAt: item.lastActivityAt.toISOString(),
    userAgent: item.userAgent,
    ipAddress: item.ipAddress,
  }));

  const columns = [
    { header: 'Session', render: (item: (typeof rows)[number]) => <span className="font-mono text-xs">{item.id}</span>, headerClassName: 'w-[180px]' },
    { header: 'Branch', render: (item: (typeof rows)[number]) => <span>{item.activeBranchId ?? 'All Branches'}</span> },
    { header: 'Status', render: (item: (typeof rows)[number]) => <Badge variant={item.status === 'Active' ? 'success' : 'muted'}>{item.status}</Badge>, headerClassName: 'w-[110px]' },
    { header: 'Last Activity', render: (item: (typeof rows)[number]) => <span className="text-sm text-[color:var(--ims-muted)]">{new Date(item.lastActivityAt).toLocaleString()}</span> },
    { header: 'Expires', render: (item: (typeof rows)[number]) => <span className="text-sm text-[color:var(--ims-muted)]">{new Date(item.expiresAt).toLocaleString()}</span> },
    { header: 'Details', className: 'text-right', render: (item: (typeof rows)[number]) => (
      <div className="flex items-center justify-end gap-3">
        <form action={terminateSessionAction}>
          <input type="hidden" name="sessionId" value={item.id} />
          <Button type="submit" size="sm" variant="ghost">Terminate</Button>
        </form>
        <Link href={`/iam/users/${item.userId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--ims-brass)] hover:underline">
          Open user <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    ), headerClassName: 'text-right w-[220px]' },
  ];

  const renderCard = (item: (typeof rows)[number]) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">{item.id}</p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">{item.activeBranchId ?? 'All Branches'}</p>
          </div>
          <Badge variant={item.status === 'Active' ? 'success' : 'muted'}>{item.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div><p className="font-semibold text-[var(--ims-muted)]">Last Activity</p><p className="truncate">{new Date(item.lastActivityAt).toLocaleString()}</p></div>
          <div><p className="font-semibold text-[var(--ims-muted)]">Expires</p><p className="truncate">{new Date(item.expiresAt).toLocaleString()}</p></div>
          <div className="col-span-2"><p className="font-semibold text-[var(--ims-muted)]">User Agent</p><p className="line-clamp-2">{item.userAgent ?? '—'}</p></div>
          <div><p className="font-semibold text-[var(--ims-muted)]">IP</p><p className="truncate">{item.ipAddress ?? '—'}</p></div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <div className="flex w-full gap-2">
          <form action={terminateSessionAction} className="flex-1">
            <input type="hidden" name="sessionId" value={item.id} />
            <Button type="submit" size="sm" variant="outline" className="w-full">Terminate</Button>
          </form>
          <Link href={`/iam/users/${item.userId}`} className="flex-1">
            <Button size="sm" variant="ghost" className="w-full">Open user</Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        title="Sessions"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Sessions', icon: <Activity className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" /> Find sessions</CardTitle>
          <CardDescription>Enter a user ID or email to inspect that account&apos;s active sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row" action="/iam/sessions" method="get">
            <Input name="query" label="User ID or Email" placeholder="Enter user ID or email" defaultValue={query} />
            <Button type="submit" className="sm:mt-8">Load sessions</Button>
          </form>
        </CardContent>
      </Card>

      {!query ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[color:var(--ims-muted)]">
            Choose a user ID or email to inspect active sessions, or open the user profile screen to manage them from the user context.
          </CardContent>
        </Card>
      ) : errorMsg ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-red-500">
            {errorMsg}
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[color:var(--ims-muted)]">
            No active sessions were found for this user ({user?.email || query}).
          </CardContent>
        </Card>
      ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>{sessions.length} session(s) found for {user?.email || query}.</CardDescription>
                </div>
                <form action={terminateAllSessionsAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <Button type="submit" variant="secondary">Terminate All Sessions</Button>
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveDataTable data={rows} columns={columns} renderCard={renderCard} keyExtractor={(item) => item.id} emptyState={null} />
            </CardContent>
          </Card>
      )}
    </AdminListPageLayout>
  );
}
