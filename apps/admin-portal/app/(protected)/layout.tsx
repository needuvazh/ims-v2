import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { AppShell } from '@ims/shared-ui';
import { resolvePortalNavigation, resolvePortalShellUser } from '@ims/identity-access';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(sessionCookieName)?.value);
  const shellUser = resolvePortalShellUser(session);
  const nav = resolvePortalNavigation('admin', session);

  return (
    <AppShell
      appName="IMS Admin"
      branchName="Central Campus"
      userName={shellUser.userName}
      items={nav}
      aside={<p className="text-xs leading-5 text-[color:var(--ims-muted)]">Branch-scoped access is enforced on every mutation path.</p>}
    >
      {children}
    </AppShell>
  );
}
