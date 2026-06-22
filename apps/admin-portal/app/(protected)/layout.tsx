import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession, sessionCookieName, isGlobalScope } from '@ims/shared-auth';
import { AppShell } from '@ims/shared-ui';
import { resolvePortalNavigation, resolvePortalShellUser } from '@ims/identity-access';
import { UserControls } from './user-controls';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const session = await decodeSession(cookieStore.get(sessionCookieName)?.value);

  if (!session) redirect('/sign-in');

  const shellUser = resolvePortalShellUser(session);
  const nav = resolvePortalNavigation('admin', session);

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
