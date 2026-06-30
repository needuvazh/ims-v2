import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession, sessionCookieName, isGlobalScope } from '@ims/shared-auth';
import { AppShell } from '@ims/shared-ui';
import { resolvePortalNavigation, resolvePortalShellUser } from '@ims/identity-access';
import { UserControls } from './user-controls';
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
} from 'lucide-react';

function mapNavigationIcons(item: any): any {
  let icon: ReactNode | undefined;

  switch (item.href) {
    case '/dashboard':
      icon = <LayoutDashboard className="h-4.5 w-4.5" />;
      break;
    case '/leads':
      icon = <TrendingUp className="h-4.5 w-4.5" />;
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
  }

  return {
    ...item,
    icon: icon || item.icon,
    items: item.items ? item.items.map(mapNavigationIcons) : undefined,
  };
}

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const session = await decodeSession(cookieStore.get(sessionCookieName)?.value);

  if (!session) redirect('/sign-in');

  const shellUser = resolvePortalShellUser(session);
  const rawNav = resolvePortalNavigation('admin', session);
  const nav = rawNav.map(mapNavigationIcons);

  const isGlobal = isGlobalScope(session);
  let branches: Array<{ id: string; name: string }> = [];
  let activeBranchId: string | null = session.activeBranchId ?? null;

  try {
    const { organizationService } = await import('../lib/runtime');
    if (isGlobal) {
      const { items: allBranches } = await organizationService.listBranches({ pageSize: 100 });
      branches = allBranches.map((b) => ({ id: b.id, name: b.branchName }));
    } else if (session.dataScopes && session.dataScopes.length > 0) {
      const branchScopes = session.dataScopes.filter((s) => s.scopeType === 'Branch' && s.branchId);
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
    </AppShell>
  );
}
