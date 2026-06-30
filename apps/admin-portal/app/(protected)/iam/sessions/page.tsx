import React from 'react';
import Link from 'next/link';
import { Clock3, ExternalLink, Home, ShieldCheck, Activity } from 'lucide-react';
import { Breadcrumbs, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from '@ims/shared-ui';
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

  return (
    <div className="space-y-8">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell>{item.activeBranchId ?? 'All Branches'}</TableCell>
                    <TableCell><Badge variant={item.status === 'Active' ? 'success' : 'muted'}>{item.status}</Badge></TableCell>
                    <TableCell>{new Date(item.lastActivityAt).toLocaleString()}</TableCell>
                    <TableCell>{new Date(item.expiresAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <form action={terminateSessionAction}>
                          <input type="hidden" name="sessionId" value={item.id} />
                          <Button type="submit" size="sm" variant="ghost">Terminate</Button>
                        </form>
                        <Link href={`/iam/users/${item.userId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--ims-brass)] hover:underline">
                          Open user <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
