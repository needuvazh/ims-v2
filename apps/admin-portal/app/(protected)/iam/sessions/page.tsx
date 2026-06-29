import React from 'react';
import Link from 'next/link';
import { Clock3, ExternalLink } from 'lucide-react';
import { Breadcrumbs, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from '@ims/shared-ui';
import { getSession } from '../../../lib/auth-guard';
import { terminateSessionAction, terminateAllSessionsAction } from './actions';

export const metadata = { title: 'Sessions | IMS Admin' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ userId?: string }>;

export default async function IamSessionsPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const targetUserId = resolved.userId?.trim() ?? '';
  const session = await getSession();
  const { sessionService } = await import('../../../lib/runtime');

  let sessions: Array<{ id: string; userId: string; activeBranchId: string | null; status: string; expiresAt: Date; lastActivityAt: Date; userAgent: string | null; ipAddress: string | null }> = [];
  if (targetUserId) {
    sessions = await sessionService.listUserSessions(targetUserId as never, { actorId: session.userId as never, actorPermissions: session.permissions, activeBranchId: session.activeBranchId as never });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access Control"
        title="Sessions"
        description="Review active login sessions. Termination controls remain permission-gated and branch-aware."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'IAM', href: '/iam' }, { label: 'Sessions' }]} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" /> Find sessions</CardTitle>
          <CardDescription>Enter a user id to inspect that account&apos;s active sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row" action="/iam/sessions" method="get">
            <Input name="userId" label="User ID" placeholder="Paste a user id" defaultValue={targetUserId} />
            <Button type="submit" className="sm:mt-8">Load sessions</Button>
          </form>
        </CardContent>
      </Card>

      {!targetUserId ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[color:var(--ims-muted)]">
            Choose a user id to inspect active sessions, or open the user profile screen to manage them from the user context.
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[color:var(--ims-muted)]">No active sessions were found for this user.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>{sessions.length} session(s) found for the selected user.</CardDescription>
              </div>
              <form action={terminateAllSessionsAction}>
                <input type="hidden" name="userId" value={targetUserId} />
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
