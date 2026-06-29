import React from 'react';
import Link from 'next/link';
import { Breadcrumbs, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, PageHeader, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ims/shared-ui';
import { Clock3 } from 'lucide-react';
import { getSession } from '../../../lib/auth-guard';

export const metadata = { title: 'Login History | IMS Admin' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ userId?: string; status?: string; page?: string; pageSize?: string }>;

export default async function IamLoginHistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const session = await getSession();
  const { loginHistoryQueryService } = await import('../../../lib/runtime');

  const page = Number.parseInt(resolved.page ?? '1', 10) || 1;
  const pageSize = Number.parseInt(resolved.pageSize ?? '20', 10) || 20;
  const status = resolved.status?.trim() ?? '';
  const userId = resolved.userId?.trim() ?? '';

  const result = userId
    ? await loginHistoryQueryService.listUserLoginHistory(userId as never, page, pageSize, {
        actorId: session.userId as never,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId as never,
      })
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

  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Security"
        title="Login History"
        description="Browse authentication attempts and lockout-related activity."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'IAM', href: '/iam' }, { label: 'Login History' }]} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" /> Filters</CardTitle>
          <CardDescription>Switch between security-wide history and a single user&apos;s login history.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" action="/iam/login-history" method="get">
            <Input name="userId" label="User ID" placeholder="Optional user id" defaultValue={userId} />
            <Select
              name="status"
              label="Status"
              defaultValue={status}
              options={[
                { value: '', label: 'All' },
                { value: 'Success', label: 'Success' },
                { value: 'Failure', label: 'Failure' },
              ]}
            />
            <Input name="page" label="Page" type="number" min={1} defaultValue={String(page)} />
            <Input name="pageSize" label="Page Size" type="number" min={1} max={100} defaultValue={String(pageSize)} />
            <div className="md:col-span-4">
              <Button type="submit">Apply filters</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{userId ? 'User Login History' : 'Security Login History'}</CardTitle>
          <CardDescription>{result.total} login event(s) found. Page {page} of {totalPages}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Browser</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{item.attemptedEmail}</TableCell>
                  <TableCell><Badge variant={item.status === 'Success' ? 'success' : 'error'}>{item.status}</Badge></TableCell>
                  <TableCell>{item.failureReason ?? '—'}</TableCell>
                  <TableCell>{[item.browser, item.os, item.device].filter(Boolean).join(' / ') || '—'}</TableCell>
                  <TableCell>{item.ipAddress ?? '—'}</TableCell>
                  <TableCell>{item.branchId ?? '—'}</TableCell>
                  <TableCell>
                    {item.userId ? <Link href={`/iam/users/${item.userId}`} className="font-semibold text-[color:var(--ims-brass)] hover:underline">User</Link> : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-6 flex items-center justify-between text-sm text-[color:var(--ims-muted)]">
            <span>Showing {result.items.length} of {result.total}</span>
            <div className="flex items-center gap-2">
              <Link href={{ pathname: '/iam/login-history', query: { userId: userId || undefined, status: status || undefined, page: Math.max(1, page - 1), pageSize } }} className="font-semibold text-[color:var(--ims-brass)] hover:underline">Previous</Link>
              <Link href={{ pathname: '/iam/login-history', query: { userId: userId || undefined, status: status || undefined, page: Math.min(totalPages, page + 1), pageSize } }} className="font-semibold text-[color:var(--ims-brass)] hover:underline">Next</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
