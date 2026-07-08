import type { ReactNode } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isGlobalScope } from '@ims/shared-auth';
import { AppShell } from '@ims/shared-ui';
import {
  resolvePortalNavigation,
  resolvePortalShellUser,
} from '@ims/identity-access';
import { DomainError } from '@ims/shared-kernel';
import { UserControls } from './user-controls';
import { getSession } from '../lib/auth-guard';
import { Toaster } from 'sonner';
import {
  LayoutDashboard,
  Building2,
  Building,
  MapPin,
  Layers,
  GraduationCap,
  FolderTree,
  Users,
  UserCheck,
  Key,
  ShieldCheck,
  TrendingUp,
  Activity,
  History,
  Lock,
  FileSliders,
  FileSpreadsheet,
  BookOpen,
  CalendarDays,
  ClipboardList,
  UsersRound,
  UserCog,
  BadgeCheck,
  CalendarClock,
  BarChart3,
  Landmark,
  Receipt,
  CreditCard,
  Undo2,
  FilePlus,
  Award,
  FileText,
} from 'lucide-react';

function mapNavigationIcons(item: any): any {
  let icon: ReactNode | undefined;

  switch (item.href) {
    case '/dashboard':
      icon = <LayoutDashboard className="h-4.5 w-4.5" />;
      break;
    case '/dashboards/crm':
    case '/dashboards/admissions':
      icon = <LayoutDashboard className="h-4.5 w-4.5" />;
      break;
    case '/leads':
      icon = <TrendingUp className="h-4.5 w-4.5" />;
      break;
    case '/admissions':
      icon = <UserCheck className="h-4.5 w-4.5" />;
      break;
    case '/enrollments':
      icon = <GraduationCap className="h-4.5 w-4.5" />;
      break;
    case '/students':
      icon = <Users className="h-4.5 w-4.5" />;
      break;
    case '/courses-catalog':
      icon = <BookOpen className="h-4.5 w-4.5" />;
      break;
    case '/scheduling':
      icon = <CalendarDays className="h-4.5 w-4.5" />;
      break;
    case '/scheduling/calendars':
      icon = <CalendarClock className="h-4.5 w-4.5" />;
      break;
    case '/scheduling/venues':
      icon = <MapPin className="h-4.5 w-4.5" />;
      break;
    case '/scheduling/conflicts':
      icon = <ShieldCheck className="h-4.5 w-4.5" />;
      break;
    case '/batches':
      icon = <Layers className="h-4.5 w-4.5" />;
      break;
    case '/faculty':
      icon = <UsersRound className="h-4.5 w-4.5" />;
      break;
    case '/faculty/dashboard':
      icon = <BarChart3 className="h-4.5 w-4.5" />;
      break;
    case '/faculty/trainers':
      icon = <UserCog className="h-4.5 w-4.5" />;
      break;
    case '/faculty/eligible-trainers':
      icon = <BadgeCheck className="h-4.5 w-4.5" />;
      break;
    case '/faculty/reports':
      icon = <CalendarClock className="h-4.5 w-4.5" />;
      break;
    case '/attendance':
      icon = <ClipboardList className="h-4.5 w-4.5" />;
      break;
    case '/organization':
      icon = <Building2 className="h-4.5 w-4.5" />;
      break;
    case '/organization/institutes':
      icon = <Building className="h-4.5 w-4.5" />;
      break;
    case '/organization/branches':
      icon = <MapPin className="h-4.5 w-4.5" />;
      break;
    case '/organization/departments':
      icon = <Layers className="h-4.5 w-4.5" />;
      break;
    case '/organization/classrooms':
      icon = <GraduationCap className="h-4.5 w-4.5" />;
      break;
    case '/organization/hierarchy':
      icon = <FolderTree className="h-4.5 w-4.5" />;
      break;
    case '/organization/documents':
      icon = <FileText className="h-4.5 w-4.5" />;
      break;
    case '/iam':
      icon = <ShieldCheck className="h-4.5 w-4.5" />;
      break;
    case '/iam/dashboards':
      icon = <LayoutDashboard className="h-4.5 w-4.5" />;
      break;
    case '/iam/users':
      icon = <Users className="h-4.5 w-4.5" />;
      break;
    case '/iam/roles':
      icon = <UserCheck className="h-4.5 w-4.5" />;
      break;
    case '/iam/permissions':
      icon = <Key className="h-4.5 w-4.5" />;
      break;
    case '/iam/sessions':
      icon = <Activity className="h-4.5 w-4.5" />;
      break;
    case '/iam/login-history':
      icon = <History className="h-4.5 w-4.5" />;
      break;
    case '/iam/security-policy':
      icon = <Lock className="h-4.5 w-4.5" />;
      break;
    case '/iam/audit':
      icon = <FileSliders className="h-4.5 w-4.5" />;
      break;
    case '/iam/reports':
      icon = <FileSpreadsheet className="h-4.5 w-4.5" />;
      break;
    case '/finance':
      icon = <Landmark className="h-4.5 w-4.5" />;
      break;
    case '/finance/invoices':
      icon = <Receipt className="h-4.5 w-4.5" />;
      break;
    case '/finance/invoices/create':
      icon = <FilePlus className="h-4.5 w-4.5" />;
      break;
    case '/finance/payments':
      icon = <CreditCard className="h-4.5 w-4.5" />;
      break;
    case '/finance/refunds':
      icon = <Undo2 className="h-4.5 w-4.5" />;
      break;
    case '/exam-completion':
      icon = <Award className="h-4.5 w-4.5" />;
      break;
    case '/exam-completion/dashboard':
      icon = <LayoutDashboard className="h-4.5 w-4.5" />;
      break;
    case '/exam-completion/exams':
      icon = <FileText className="h-4.5 w-4.5" />;
      break;
    case '/exam-completion/results':
      icon = <FileSpreadsheet className="h-4.5 w-4.5" />;
      break;
    case '/exam-completion/completions':
      icon = <BadgeCheck className="h-4.5 w-4.5" />;
      break;
    case '/exam-completion/approval-queue':
      icon = <UserCheck className="h-4.5 w-4.5" />;
      break;
  }

  return {
    ...item,
    icon: icon || item.icon,
    items: item.items ? item.items.map(mapNavigationIcons) : undefined,
  };
}

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  let session;
  try {
    session = await getSession();
  } catch (err) {
    if (err instanceof DomainError && err.code === 'unauthorized') {
      // Break the redirect loop and show a clear "Session Expired" UI
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="w-full max-w-md space-y-8 rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-200/50">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Lock className="h-10 w-10" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-black text-slate-900">
                Session Expired
              </h1>
              <p className="text-sm leading-relaxed text-slate-500">
                {err.message ||
                  'Your session has expired or been revoked for security reasons.'}
              </p>
            </div>
            <div className="pt-4">
              <Link
                href="/sign-in"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-[0.98]"
              >
                Sign In Again
              </Link>
            </div>
          </div>
        </div>
      );
    }
    throw err;
  }

  const shellUser = resolvePortalShellUser(session);
  const rawNav = resolvePortalNavigation('admin', session);
  const nav = rawNav.map(mapNavigationIcons);

  const isGlobal = isGlobalScope(session);
  let branches: Array<{ id: string; name: string }> = [];
  let activeBranchId: string | null = session.activeBranchId ?? null;

  try {
    const { organizationService } = await import('../lib/runtime');
    if (isGlobal) {
      const { items: allBranches } = await organizationService.listBranches({
        pageSize: 100,
      });
      branches = allBranches.map((b) => ({ id: b.id, name: b.branchName }));
    } else if (session.dataScopes && session.dataScopes.length > 0) {
      const branchScopes = session.dataScopes.filter(
        (s) => s.scopeType === 'Branch' && s.branchId,
      );
      for (const scope of branchScopes) {
        if (scope.branchId) {
          try {
            const b = await organizationService.getBranch(scope.branchId);
            branches.push({ id: b.id, name: b.branchName });
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error('Failed to load branches in layout:', err);
  }

  // Fallback activeBranchId for non-global users if not set
  if (!isGlobal && !activeBranchId && branches.length > 0) {
    activeBranchId = branches[0].id;
  }

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  let branchName = activeBranch ? activeBranch.name : 'Central Campus';
  if (isGlobal && !activeBranchId) {
    branchName = 'All Branches (Global)';
  }

  return (
    <AppShell
      appName="IMS Admin"
      branchName={branchName}
      userName={shellUser.userName}
      items={nav}
      aside={
        <div className="space-y-4">
          <UserControls
            userName={shellUser.userName}
            activeBranchId={activeBranchId}
            branches={branches}
            isGlobal={isGlobal}
          />
          <p className="text-[10px] leading-4 text-[color:var(--ims-muted)]">
            Branch-scoped access is enforced on every mutation path.
          </p>
        </div>
      }
    >
      {children}
      <Toaster richColors position="top-right" />
    </AppShell>
  );
}
