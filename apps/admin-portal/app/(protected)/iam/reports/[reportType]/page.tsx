import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Breadcrumbs,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
} from '@ims/shared-ui';
import {
  Home,
  ShieldCheck,
  FileSpreadsheet,
  Clock3,
  FileText,
  BarChart3,
  LayoutDashboard,
  Users,
  AlertTriangle,
  History,
  Lock,
  Key,
  Database,
  ArrowLeft,
} from 'lucide-react';
import { permissions } from '@ims/shared-auth';
import { prisma } from '@ims/database';
import { getSession, assertPermission } from '../../../../lib/auth-guard';
import { ExportButton } from '../_components/ExportButton';

export const dynamic = 'force-dynamic';

const reportsMap: Record<string, { label: string; permission: string; icon: any }> = {
  'user-directory': { label: 'User Directory', permission: permissions.report.iam.user, icon: Users },
  'user-access': { label: 'User Access', permission: permissions.report.iam.userAccess, icon: ShieldCheck },
  'login-history': { label: 'Login History', permission: permissions.report.iam.loginHistory, icon: Clock3 },
  'failed-logins': { label: 'Failed Logins', permission: permissions.report.iam.loginHistory, icon: AlertTriangle },
  'locked-accounts': { label: 'Locked Accounts', permission: permissions.report.iam.security, icon: Lock },
  'password-resets': { label: 'Password Resets', permission: permissions.report.iam.security, icon: Key },
  'roles': { label: 'Roles', permission: permissions.report.iam.role, icon: FileText },
  'permission-matrix': { label: 'Permission Matrix', permission: permissions.report.iam.permission, icon: Database },
  'branch-access': { label: 'Branch Access', permission: permissions.report.iam.branch, icon: ShieldCheck },
  'privileged-users': { label: 'Privileged Users', permission: permissions.report.iam.privileged, icon: Users },
  'security-events': { label: 'Security Events', permission: permissions.report.iam.security, icon: ShieldCheck },
  'permission-changes': { label: 'Permission Changes', permission: permissions.report.iam.permission, icon: Database },
  'sessions': { label: 'Sessions', permission: permissions.report.iam.session, icon: BarChart3 },
  'audit-trail': { label: 'Audit Trail', permission: permissions.iam.audit.read, icon: LayoutDashboard },
};

type SearchParams = Promise<{
  page?: string;
  pageSize?: string;
  branchId?: string;
  status?: string;
}>;

export async function generateMetadata({ params }: { params: Promise<{ reportType: string }> }) {
  const resolved = await params;
  const config = reportsMap[resolved.reportType];
  return { title: config ? `${config.label} Report | IMS Admin` : 'IAM Report | IMS Admin' };
}

function isPrivilegedRole(roleCode: string): boolean {
  return ['Admin', 'Owner', 'Management', 'CEO'].includes(roleCode);
}

export default async function IamReportDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportType: string }>;
  searchParams: SearchParams;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const reportType = resolvedParams.reportType;

  const config = reportsMap[reportType];
  if (!config) {
    notFound();
  }

  // Authorize the request
  const session = await assertPermission(config.permission);

  const page = Number.parseInt(resolvedSearch.page ?? '1', 10) || 1;
  const pageSize = Number.parseInt(resolvedSearch.pageSize ?? '20', 10) || 20;
  const branchId = resolvedSearch.branchId?.trim() ?? '';
  const status = resolvedSearch.status?.trim() ?? '';

  // Get service classes
  const {
    userService,
    loginHistoryQueryService,
    auditQueryService,
    roleService,
    sessionService,
    permissionService,
    branchAccessService,
    organizationService,
    branchScopeResolver,
  } = await import('../../../../lib/runtime');

  // Load branches for filter list
  const branchResult = await organizationService.listBranches({ pageSize: 1000 });
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(session.userId as any, session.activeBranchId as any);
  const branches = {
    items: allowedBranchIds.length === 0
      ? branchResult.items
      : branchResult.items.filter((b) => allowedBranchIds.includes(b.id as any)),
  };

  const context = {
    actorId: session.userId as any,
    actorPermissions: session.permissions,
    activeBranchId: session.activeBranchId as any,
  };

  let data: { items: any[]; total: number } = { items: [], total: 0 };

  // Fetch report data
  if (reportType === 'user-directory') {
    const filters = { branchId: branchId || undefined, status: (status || undefined) as any };
    const rawData = await userService.searchUsers(filters, page, pageSize, context);
    const userIds = rawData.items.map((u) => u.id);
    const details = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: {
        person: true,
        roles: { include: { role: true } },
      },
    });
    const items = rawData.items.map((user) => {
      const detail = details.find((d) => d.id === user.id);
      return {
        ...user,
        fullName: detail ? `${detail.person.firstName} ${detail.person.lastName}`.trim() : '—',
        mobile: detail?.person.mobile || '—',
        rolesList: detail?.roles.map((r) => r.role.roleName).join(', ') || '—',
      };
    });
    data = { items, total: rawData.total };
  } else if (reportType === 'user-access' || reportType === 'branch-access') {
    const filters = { branchId: branchId || undefined, status: (status || undefined) as any };
    const rawUsers = await userService.searchUsers(filters, page, pageSize, context);
    const items = [];
    for (const user of rawUsers.items) {
      const branchAccesses = await branchAccessService.getUserBranchAccess(user.id, context);
      items.push({ user, branches: branchAccesses });
    }
    data = { items, total: rawUsers.total };
  } else if (reportType === 'login-history' || reportType === 'failed-logins') {
    const filters = { branchId: branchId || undefined, status: reportType === 'failed-logins' ? 'Failure' : status || undefined };
    data = await loginHistoryQueryService.listSecurityLoginHistory(filters, page, pageSize, context);
  } else if (reportType === 'locked-accounts') {
    const rawData = await userService.searchUsers({ branchId: branchId || undefined, status: 'Locked' }, page, pageSize, context);
    data = rawData;
  } else if (reportType === 'password-resets') {
    data = await auditQueryService.listAuditLogs(
      { action: 'iam.user.password-reset-requested', branchId: branchId || undefined },
      page,
      pageSize,
      context
    );
  } else if (reportType === 'roles') {
    data = await roleService.listRoles(page, pageSize, context);
  } else if (reportType === 'permission-matrix') {
    const items = await permissionService.searchPermissions(status || undefined, undefined, context);
    data = { items, total: items.length };
  } else if (reportType === 'privileged-users') {
    const filters = { branchId: branchId || undefined, status: (status || undefined) as any };
    const rawUsers = await userService.searchUsers(filters, page, pageSize, context);
    const items = [];
    for (const user of rawUsers.items) {
      const roles = await userService.listRolesForUser(user.id);
      if (roles.some((role) => isPrivilegedRole(role.roleCode))) {
        items.push({ user, roles });
      }
    }
    data = { items, total: items.length };
  } else if (reportType === 'security-events' || reportType === 'audit-trail') {
    data = await auditQueryService.listAuditLogs(
      { branchId: branchId || undefined, module: 'iam' },
      page,
      pageSize,
      context
    );
  } else if (reportType === 'permission-changes') {
    data = await auditQueryService.listAuditLogs(
      { branchId: branchId || undefined, module: 'iam', entityType: 'Permission' },
      page,
      pageSize,
      context
    );
  } else if (reportType === 'sessions') {
    const filters = { branchId: branchId || undefined, status: (status || undefined) as any };
    const rawUsers = await userService.searchUsers(filters, page, pageSize, context);
    const items = [];
    for (const user of rawUsers.items) {
      const sessions = await sessionService.listUserSessions(user.id, context);
      items.push({ user, sessions });
    }
    data = { items, total: items.length };
  }

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  // Determine which status options are appropriate
  let statusOptions: { value: string; label: string }[] | null = null;
  if (['user-directory', 'user-access', 'branch-access', 'privileged-users'].includes(reportType)) {
    statusOptions = [
      { value: '', label: 'All Statuses' },
      { value: 'Active', label: 'Active' },
      { value: 'Pending', label: 'Pending' },
      { value: 'Locked', label: 'Locked' },
      { value: 'Archived', label: 'Archived' },
    ];
  } else if (['login-history', 'failed-logins'].includes(reportType)) {
    statusOptions = [
      { value: '', label: 'All Statuses' },
      { value: 'Success', label: 'Success' },
      { value: 'Failure', label: 'Failure' },
    ];
  } else if (reportType === 'permission-matrix') {
    statusOptions = [
      { value: '', label: 'All Statuses' },
      { value: 'Active', label: 'Active' },
      { value: 'Inactive', label: 'Inactive' },
    ];
  }

  const IconComponent = config.icon;

  return (
    <div className="space-y-8">
      <PageHeader
        title={config.label}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Reports', href: '/iam/reports', icon: <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" /> },
              { label: config.label, icon: <IconComponent className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/iam/reports" className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--ims-brass)] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to reports
        </Link>
        <ExportButton reportType={reportType} filters={{ branchId: branchId || undefined, status: status || undefined }} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><IconComponent className="h-5 w-5" /> Filters</CardTitle>
          <CardDescription>Filter report data below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2 md:grid-cols-4" action={`/iam/reports/${reportType}`} method="get">
            <Select
              name="branchId"
              label="Branch"
              defaultValue={branchId}
              options={[
                { value: '', label: 'All Branches' },
                ...branches.items.map((b) => ({ value: b.id, label: b.branchName })),
              ]}
            />
            {statusOptions && (
              <Select
                name="status"
                label="Status"
                defaultValue={status}
                options={statusOptions}
              />
            )}
            <Select
              name="pageSize"
              label="Limit"
              defaultValue={String(pageSize)}
              options={[
                { value: '10', label: '10' },
                { value: '20', label: '20' },
                { value: '50', label: '50' },
                { value: '100', label: '100' },
              ]}
            />
            <input type="hidden" name="page" value="1" />
            <div className="flex gap-2 items-end md:col-span-1">
              <Button type="submit" className="w-full">Apply Filters</Button>
              <Link
                href={`/iam/reports/${reportType}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl font-semibold tracking-tight transition-all duration-200 border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] text-[color:var(--ims-ink)] shadow-sm hover:border-[color:var(--ims-brass)] hover:bg-[color:var(--ims-accent-soft)] h-10 px-4 text-sm"
              >
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{config.label} Records</CardTitle>
          <CardDescription>
            {data.total} record(s) found. Page {page} of {totalPages}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <div className="py-8 text-center text-sm text-[color:var(--ims-muted)]">No records found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {reportType === 'user-directory' && (
                        <>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Roles</TableHead>
                        </>
                      )}
                      {(reportType === 'user-access' || reportType === 'branch-access') && (
                        <>
                          <TableHead>User ID</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Assigned Branches</TableHead>
                        </>
                      )}
                      {(reportType === 'login-history' || reportType === 'failed-logins') && (
                        <>
                          <TableHead>Time</TableHead>
                          <TableHead>Attempted Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Failure Reason</TableHead>
                          <TableHead>Browser/OS</TableHead>
                        </>
                      )}
                      {reportType === 'locked-accounts' && (
                        <>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Locked Until</TableHead>
                          <TableHead>Failed Logins</TableHead>
                        </>
                      )}
                      {reportType === 'roles' && (
                        <>
                          <TableHead>Role Code</TableHead>
                          <TableHead>Role Name</TableHead>
                          <TableHead>System Role</TableHead>
                          <TableHead>Status</TableHead>
                        </>
                      )}
                      {reportType === 'permission-matrix' && (
                        <>
                          <TableHead>Permission Code</TableHead>
                          <TableHead>Permission Type</TableHead>
                          <TableHead>Status</TableHead>
                        </>
                      )}
                      {reportType === 'privileged-users' && (
                        <>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Privileged Roles</TableHead>
                        </>
                      )}
                      {reportType === 'sessions' && (
                        <>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Active Sessions</TableHead>
                        </>
                      )}
                      {['security-events', 'audit-trail', 'password-resets', 'permission-changes'].includes(reportType) && (
                        <>
                          <TableHead>Performed At</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Module</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Performed By</TableHead>
                          <TableHead>Reason</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        {reportType === 'user-directory' && (
                          <>
                            <TableCell className="font-medium">{item.fullName}</TableCell>
                            <TableCell>{item.username}</TableCell>
                            <TableCell>{item.email}</TableCell>
                            <TableCell>{item.mobile}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'Active' ? 'success' : item.status === 'Locked' ? 'error' : 'warning'}>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{item.rolesList}</TableCell>
                          </>
                        )}
                        {(reportType === 'user-access' || reportType === 'branch-access') && (
                          <>
                            <TableCell className="font-mono text-xs">{item.user.id}</TableCell>
                            <TableCell className="font-medium">{item.user.username}</TableCell>
                            <TableCell>{item.user.email}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {item.branches.map((b: any) => (
                                  <Badge key={b.branchId} variant={b.status === 'Active' ? 'success' : 'warning'}>
                                    {b.branchId.substring(0, 8)} {b.isDefault ? '(Default)' : ''}
                                  </Badge>
                                ))}
                                {item.branches.length === 0 && <span className="text-[color:var(--ims-muted)]">—</span>}
                              </div>
                            </TableCell>
                          </>
                        )}
                        {(reportType === 'login-history' || reportType === 'failed-logins') && (
                          <>
                            <TableCell className="whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</TableCell>
                            <TableCell className="font-medium">{item.attemptedEmail}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'Success' ? 'success' : 'error'}>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.ipAddress || '—'}</TableCell>
                            <TableCell>{item.failureReason || '—'}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {[item.browser, item.os].filter(Boolean).join(' / ') || '—'}
                            </TableCell>
                          </>
                        )}
                        {reportType === 'locked-accounts' && (
                          <>
                            <TableCell className="font-medium">{item.username}</TableCell>
                            <TableCell>{item.email}</TableCell>
                            <TableCell>
                              {item.lockedUntil ? new Date(item.lockedUntil).toLocaleString() : 'Permanent'}
                            </TableCell>
                            <TableCell>{item.failedLoginCount}</TableCell>
                          </>
                        )}
                        {reportType === 'roles' && (
                          <>
                            <TableCell className="font-mono text-xs">{item.roleCode}</TableCell>
                            <TableCell className="font-medium">{item.roleName}</TableCell>
                            <TableCell>
                              <Badge variant={item.isSystemRole ? 'success' : 'warning'}>
                                {item.isSystemRole ? 'System' : 'Custom'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'Active' ? 'success' : 'error'}>
                                {item.status}
                              </Badge>
                            </TableCell>
                          </>
                        )}
                        {reportType === 'permission-matrix' && (
                          <>
                            <TableCell className="font-mono text-xs">{item.permissionCode}</TableCell>
                            <TableCell>{item.permissionType}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'Active' ? 'success' : 'error'}>
                                {item.status}
                              </Badge>
                            </TableCell>
                          </>
                        )}
                        {reportType === 'privileged-users' && (
                          <>
                            <TableCell className="font-medium">{item.user.username}</TableCell>
                            <TableCell>{item.user.email}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {item.roles.map((r: any) => (
                                  <Badge key={r.id} variant="success">{r.roleName}</Badge>
                                ))}
                              </div>
                            </TableCell>
                          </>
                        )}
                        {reportType === 'sessions' && (
                          <>
                            <TableCell className="font-medium">{item.user.username}</TableCell>
                            <TableCell>{item.user.email}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 text-xs">
                                {item.sessions.map((s: any) => (
                                  <div key={s.id} className="border-b border-[color:var(--ims-border)] pb-1 last:border-0">
                                    <span className="font-mono text-[10px] text-[color:var(--ims-muted)] block">{s.id}</span>
                                    <span className="font-semibold block">Expires: {new Date(s.expiresAt).toLocaleString()}</span>
                                    <Badge variant={s.status === 'Active' ? 'success' : 'error'}>{s.status}</Badge>
                                  </div>
                                ))}
                                {item.sessions.length === 0 && <span className="text-[color:var(--ims-muted)]">—</span>}
                              </div>
                            </TableCell>
                          </>
                        )}
                        {['security-events', 'audit-trail', 'password-resets', 'permission-changes'].includes(reportType) && (
                          <>
                            <TableCell className="whitespace-nowrap">{new Date(item.performedAt).toLocaleString()}</TableCell>
                            <TableCell className="font-medium font-mono text-xs">{item.action}</TableCell>
                            <TableCell>{item.module}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              <span className="font-semibold">{item.entityType}</span>
                              {item.entityId && <span className="font-mono text-[10px] block text-[color:var(--ims-muted)]">{item.entityId}</span>}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.performedBy}</TableCell>
                            <TableCell className="max-w-xs truncate">{item.reason || '—'}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalCount={data.total}
                  limit={pageSize}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
