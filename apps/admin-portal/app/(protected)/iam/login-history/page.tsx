import React from 'react';
import Link from 'next/link';
import { Breadcrumbs, Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, AdminListPageLayout, PageHeader, ResponsiveDataTable, Select } from '@ims/shared-ui';
import { Clock3, Home, ShieldCheck, History } from 'lucide-react';
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

  let resolvedUserId: string | null = null;
  let userNotFound = false;

  if (userId) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId);
    if (isUuid) {
      resolvedUserId = userId;
    } else if (session.permissions.includes('iam.user.read')) {
      const { userRepository } = await import('../../../lib/runtime');
      const user = await userRepository.findByEmail(userId.toLowerCase()) || await userRepository.findByUsername(userId);
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
    ? await loginHistoryQueryService.listUserLoginHistory(resolvedUserId as never, page, pageSize, {
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

  const columns = [
    { header: 'Time', render: (item: (typeof rows)[number]) => <span>{new Date(item.createdAt).toLocaleString()}</span>, headerClassName: 'w-[170px]' },
    { header: 'Email', render: (item: (typeof rows)[number]) => <span className="font-medium">{item.attemptedEmail}</span> },
    { header: 'Status', render: (item: (typeof rows)[number]) => <Badge variant={item.status === 'Success' ? 'success' : 'error'}>{item.status}</Badge>, headerClassName: 'w-[110px]' },
    { header: 'Reason', render: (item: (typeof rows)[number]) => <span className="text-sm text-[color:var(--ims-muted)]">{item.failureReason ?? '—'}</span> },
    { header: 'Browser', render: (item: (typeof rows)[number]) => <span className="text-sm text-[color:var(--ims-muted)]">{[item.browser, item.os, item.device].filter(Boolean).join(' / ') || '—'}</span> },
    { header: 'IP', render: (item: (typeof rows)[number]) => <span className="text-sm text-[color:var(--ims-muted)]">{item.ipAddress ?? '—'}</span> },
    { header: 'Branch', render: (item: (typeof rows)[number]) => <span className="text-sm text-[color:var(--ims-muted)]">{item.branchId ?? '—'}</span> },
    { header: 'Open', className: 'text-right', render: (item: (typeof rows)[number]) => (item.userId ? <Link href={`/iam/users/${item.userId}`} className="font-semibold text-[color:var(--ims-brass)] hover:underline">User</Link> : '—'), headerClassName: 'text-right w-[100px]' },
  ];

  const renderCard = (item: (typeof rows)[number]) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">{new Date(item.createdAt).toLocaleString()}</p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">{item.attemptedEmail}</p>
          </div>
          <Badge variant={item.status === 'Success' ? 'success' : 'error'}>{item.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><p className="font-semibold text-[var(--ims-muted)]">Reason</p><p className="truncate">{item.failureReason ?? '—'}</p></div>
          <div className="col-span-2"><p className="font-semibold text-[var(--ims-muted)]">Browser</p><p className="truncate">{[item.browser, item.os, item.device].filter(Boolean).join(' / ') || '—'}</p></div>
          <div><p className="font-semibold text-[var(--ims-muted)]">IP</p><p className="truncate">{item.ipAddress ?? '—'}</p></div>
          <div><p className="font-semibold text-[var(--ims-muted)]">Branch</p><p className="truncate">{item.branchId ?? '—'}</p></div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        {item.userId ? <Link href={`/iam/users/${item.userId}`} className="text-sm font-semibold text-[color:var(--ims-brass)] hover:underline">Open user</Link> : <span className="text-sm text-[color:var(--ims-muted)]">—</span>}
      </CardFooter>
    </Card>
  );

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        title="Login History"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Login History', icon: <History className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
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
          <ResponsiveDataTable data={rows} columns={columns} renderCard={renderCard} keyExtractor={(item) => item.id} emptyState={null} />
          <div className="mt-6 flex items-center justify-between text-sm text-[color:var(--ims-muted)]">
            <span>Showing {result.items.length} of {result.total}</span>
            <div className="flex items-center gap-2">
              <Link href={{ pathname: '/iam/login-history', query: { userId: userId || undefined, status: status || undefined, page: Math.max(1, page - 1), pageSize } }} className="font-semibold text-[color:var(--ims-brass)] hover:underline">Previous</Link>
              <Link href={{ pathname: '/iam/login-history', query: { userId: userId || undefined, status: status || undefined, page: Math.min(totalPages, page + 1), pageSize } }} className="font-semibold text-[color:var(--ims-brass)] hover:underline">Next</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminListPageLayout>
  );
}
