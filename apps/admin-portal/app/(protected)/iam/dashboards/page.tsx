import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  ShieldAlert,
  Users, 
  Home, 
  LayoutDashboard,
  Clock,
  Lock,
  Key,
  Clock3,
  Server,
  UserCheck,
  ExternalLink,
  Plus
} from 'lucide-react';
import { 
  Breadcrumbs, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  PageHeader,
  Badge,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Avatar,
  Button
} from '@ims/shared-ui';
import { getSession, assertAnyPermission } from '../../../lib/auth-guard';
import { prisma } from '@ims/database';

export const metadata = { title: 'Dashboards | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IamDashboardsPage() {
  const session = await getSession();
  await assertAnyPermission([
    'dashboard.view',
    'dashboard.security',
    'dashboard.admin',
    'dashboard.compliance',
    'iam.user.read',
  ]);

  const { 
    userService, 
    roleService, 
    permissionService, 
    loginHistoryQueryService, 
    auditQueryService, 
    securityPolicyService 
  } = await import('../../../lib/runtime');

  // Load dashboard data in parallel
  const [
    users,
    rolesResult,
    permissionsList,
    policy,
    auditsResult,
    loginsResult,
    loginsTotalCount,
    loginsFailedCount,
    auditsTotalCount,
    activeSessionsCount,
    recentActiveSessions
  ] = await Promise.all([
    userService.listUsers(),
    roleService.listRoles(1, 1000, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId }),
    permissionService.searchPermissions(undefined, undefined, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId }),
    securityPolicyService.getSecurityPolicy({ actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId }),
    auditQueryService.listAuditLogs({ module: 'iam' }, 1, 5, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId }),
    loginHistoryQueryService.listSecurityLoginHistory({}, 1, 5, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId }),
    loginHistoryQueryService.listSecurityLoginHistory({}, 1, 1, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId }).then(r => r.total),
    loginHistoryQueryService.listSecurityLoginHistory({ status: 'Failure' }, 1, 1, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId }).then(r => r.total),
    auditQueryService.listAuditLogs({ module: 'iam' }, 1, 1, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId }).then(r => r.total),
    prisma.userSession.count({ where: { status: 'Active' } }),
    prisma.userSession.findMany({
      where: { status: 'Active' },
      take: 5,
      orderBy: { lastAccessAt: 'desc' },
      include: {
        user: {
          include: {
            person: true
          }
        }
      }
    })
  ]);

  // Resolve branch name for active scope
  let branchName = 'Global (All Branches)';
  if (session.activeBranchId) {
    try {
      const { organizationService } = await import('../../../lib/runtime');
      const b = await organizationService.getBranch(session.activeBranchId);
      branchName = b.branchName;
    } catch {}
  }

  // Derived user statistics
  const totalUsers = users.length;
  const activeUsersCount = users.filter((u: any) => u.status === 'Active').length;
  const lockedUsersCount = users.filter((u: any) => u.status === 'Locked').length;
  const pendingUsersCount = users.filter((u: any) => u.status === 'PendingActivation').length;
  
  // Sort users to get most recently added
  const recentUsers = [...users]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const policyRows = [
    { label: 'Max Failed Attempts', value: policy.maxFailedAttempts, desc: 'Lockout threshold' },
    { label: 'Lockout Duration', value: `${policy.lockoutDurationMinutes} min`, desc: 'Cool-off duration' },
    { label: 'Password Min Length', value: policy.passwordMinLength, desc: 'Minimum character rule' },
    { label: 'Password Expiry', value: `${policy.passwordExpiryDays} days`, desc: 'Password cycle time' },
    { label: 'Session Lifetime', value: `${policy.accessTokenExpiryMinutes} min`, desc: 'Token lifespan' },
    { label: 'Concurrent Limit', value: policy.maxConcurrentSessions, desc: 'Max active devices' },
  ];

  return (
    <div className="space-y-8">
      {/* Dynamic Header & Integrity Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-950 p-6 md:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-200 border border-indigo-500/30 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Security Operation Command
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Welcome, <span className="bg-gradient-to-r from-indigo-200 via-sky-100 to-white bg-clip-text text-transparent">{session?.displayName ?? 'Operator'}</span>
            </h1>
            <p className="text-sm text-neutral-300 font-medium">
              IAM and branch scope analytics for <span className="text-indigo-300 font-bold">{branchName}</span>.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-auto rounded-xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-md">
            <div className="relative flex h-3.5 w-3.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Policy Integrity</p>
              <p className="text-xs font-black text-emerald-400">ACTIVE & COMPLIANT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Directory Users"
          value={totalUsers}
          description={`${activeUsersCount} Active · ${lockedUsersCount} Locked · ${pendingUsersCount} Pending`}
          icon={<Users className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Active Sessions"
          value={activeSessionsCount}
          description="Concurrent authentication tokens"
          icon={<Server className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Failed Logins"
          value={loginsFailedCount}
          description={`Out of ${loginsTotalCount} total attempts`}
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          title="Compliance Audits"
          value={auditsTotalCount}
          description="Recorded IAM events"
          icon={<Activity className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Main Dashboard Details (Left Col span 2) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Active Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Active Secure Sessions</CardTitle>
                <CardDescription>Live session records currently active in the directory.</CardDescription>
              </div>
              <Link href="/iam/sessions">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Manage Sessions <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentActiveSessions.length === 0 ? (
                <div className="py-6 text-center text-sm text-[color:var(--ims-muted)]">No active sessions.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Platform/Device</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActiveSessions.map((s) => {
                      const userFullName = s.user?.person 
                        ? `${s.user.person.firstName} ${s.user.person.lastName}`.trim() 
                        : s.user?.email ?? 'System User';
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar size="sm" fallback={userFullName} />
                              <div>
                                <p className="font-semibold text-xs text-[color:var(--ims-ink)]">{userFullName}</p>
                                <p className="text-[10px] text-[color:var(--ims-muted)]">{s.user?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{s.ipAddress ?? 'Unknown'}</TableCell>
                          <TableCell className="text-xs text-[color:var(--ims-muted)] max-w-[150px] truncate" title={s.userAgent ?? ''}>
                            {s.userAgent ? s.userAgent.split(' ')[0] : 'Unknown Device'}
                          </TableCell>
                          <TableCell className="text-xs text-[color:var(--ims-muted)]">{new Date(s.lastAccessAt).toLocaleTimeString()}</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/iam/sessions?userId=${s.userId}`}>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600">
                                <Lock className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent User Additions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>User Directory Activity</CardTitle>
                <CardDescription>Most recently added administrators, coordinators, and counselors.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/iam/users/create">
                  <Button size="sm" className="h-8 text-xs">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add User
                  </Button>
                </Link>
                <Link href="/iam/users">
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    View Directory <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar size="sm" fallback={u.fullName} />
                          <div>
                            <p className="font-semibold text-xs text-[color:var(--ims-ink)]">{u.fullName}</p>
                            <p className="text-[10px] text-[color:var(--ims-muted)]">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-[color:var(--ims-muted)]">{u.userType}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(u.roleSummaries ?? []).map((r: any) => (
                            <Badge key={r.id} variant="default" className="text-[9px] px-1 py-0">
                              {r.roleName}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          u.status === 'Active' ? 'success'
                          : u.status === 'Locked' ? 'error'
                          : u.status === 'PendingActivation' ? 'warning'
                          : 'muted'
                        } className="text-[9px]">
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/iam/users/${u.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs">Edit</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Login History Log */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Recent Authentication Attempts</CardTitle>
                <CardDescription>Auditing success/failure cycles of user logins.</CardDescription>
              </div>
              <Link href="/iam/login-history">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Full History <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loginsResult.items.length === 0 ? (
                <div className="py-6 text-center text-sm text-[color:var(--ims-muted)]">No login attempts recorded.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Attempted User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Browser/IP</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginsResult.items.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-[color:var(--ims-muted)]">{new Date(log.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-xs text-[color:var(--ims-ink)]">{log.attemptedEmail}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'Success' ? 'success' : 'error'} className="text-[9px]">
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[color:var(--ims-muted)]">
                          {log.ipAddress} ({log.browser ?? 'Unknown'})
                        </TableCell>
                        <TableCell className="text-xs text-[color:var(--ims-error)] max-w-[150px] truncate" title={log.failureReason ?? ''}>
                          {log.failureReason ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Compliance Audits */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Security Audit Timeline</CardTitle>
                <CardDescription>Latest access policy, user status, and security audit logs.</CardDescription>
              </div>
              <Link href="/iam/audit">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Full Audit Trail <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {auditsResult.items.length === 0 ? (
                <div className="py-6 text-center text-sm text-[color:var(--ims-muted)]">No audit entries found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditsResult.items.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs text-[color:var(--ims-muted)] whitespace-nowrap">{new Date(a.performedAt).toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-xs text-indigo-600">{a.action}</TableCell>
                        <TableCell className="text-xs">
                          {a.performedBy ? (
                            <Link href={`/iam/users/${a.performedBy}`} className="font-semibold text-[color:var(--ims-brass)] hover:underline">
                              {a.performedBy.substring(0, 8)}...
                            </Link>
                          ) : (
                            <span className="text-[color:var(--ims-muted)]">System</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-[color:var(--ims-muted)]">
                          {a.branchId ? `Branch (${a.branchId.substring(0, 8)})` : 'Global'}
                        </TableCell>
                        <TableCell className="text-xs text-[color:var(--ims-muted)] max-w-[150px] truncate" title={a.reason ?? ''}>
                          {a.reason ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Access Directory Summary & Policy Rules (Right Col span 1) */}
        <div className="space-y-6">
          {/* Access Control Catalog */}
          <Card>
            <CardHeader>
              <CardTitle>Directory Controls</CardTitle>
              <CardDescription>Active components catalog in the security domain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--ims-muted)]">Active Roles</p>
                  <p className="mt-2 text-3xl font-black text-slate-800">{rolesResult.total ?? rolesResult.length}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--ims-muted)]">Permission Keys</p>
                  <p className="mt-2 text-3xl font-black text-slate-800">{permissionsList.length}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-[color:var(--ims-muted)] uppercase tracking-wider">Access Directory Shortcuts</p>
                <div className="flex flex-col gap-2">
                  <Link href="/iam/roles" className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-xs font-semibold hover:bg-slate-50 transition-colors">
                    <span className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-indigo-500" /> Manage Roles</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[color:var(--ims-muted)]" />
                  </Link>
                  <Link href="/iam/permissions" className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-xs font-semibold hover:bg-slate-50 transition-colors">
                    <span className="flex items-center gap-2"><Key className="h-4 w-4 text-indigo-500" /> Catalog Permissions</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[color:var(--ims-muted)]" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Policy Controls */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Enforced Access Policies</CardTitle>
                <CardDescription>Hardened system rule limits and timeout schedules.</CardDescription>
              </div>
              <Link href="/iam/security-policy">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  View Detail
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {policyRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-700">{row.label}</p>
                      <p className="text-[9px] text-[color:var(--ims-muted)]">{row.desc}</p>
                    </div>
                    <Badge variant="default" className="font-mono text-xs px-2 py-0.5">
                      {String(row.value)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Operations Hub Quicklinks */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Reports</CardTitle>
              <CardDescription>Jump straight to filtered tables and export schedules.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Link href="/iam/reports" className="flex items-center justify-between rounded-lg bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50 p-3 text-xs font-semibold transition-colors group">
                <span className="flex items-center gap-2 text-indigo-900">
                  <Activity className="h-4 w-4 text-indigo-600" /> Advanced IAM Reports
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link href="/iam/reports/export-jobs" className="flex items-center justify-between rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 p-3 text-xs font-semibold transition-colors group">
                <span className="flex items-center gap-2 text-slate-900">
                  <Clock className="h-4 w-4 text-slate-600" /> Export Downloads Queue
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
