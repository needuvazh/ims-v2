import type { PropsWithChildren, ReactNode } from 'react';
import { SidebarNav, StatusRail } from './navigation';
import { Badge } from './badge';

type AppShellProps = PropsWithChildren<{
  appName: string;
  branchName?: string;
  userName?: string;
  items: Array<{ href: string; label: string; current?: boolean }>;
  aside?: ReactNode;
}>;

export function AppShell({ appName, branchName, userName, items, aside, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(184,146,111,0.18),_transparent_24%),linear-gradient(180deg,_#f4efe6_0%,_#fbf8f2_100%)] text-[color:var(--ims-ink)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 p-4 lg:p-6">
        <aside className="hidden w-72 shrink-0 lg:flex lg:flex-col">
          <div className="sticky top-6 flex min-h-[calc(100vh-3rem)] flex-col rounded-[32px] border border-[color:var(--ims-border)] bg-[color:var(--ims-paper)] p-5 shadow-[0_18px_50px_rgba(17,24,39,0.08)]">
            <div className="space-y-3 border-b border-[color:var(--ims-border)] pb-5">
              <Badge>{appName}</Badge>
              <div className="space-y-1">
                <p className="font-[family-name:var(--font-display)] text-2xl">{appName}</p>
                <p className="text-sm text-[color:var(--ims-muted)]">
                  {branchName ? `Branch ${branchName}` : 'Single-client branch scope'}
                </p>
              </div>
            </div>
            <div className="py-5">
              <SidebarNav items={items} />
            </div>
            <div className="mt-auto space-y-3 border-t border-[color:var(--ims-border)] pt-4">
              <StatusRail>{userName ?? 'Guest'} signed in</StatusRail>
              {aside}
            </div>
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-6 rounded-[36px] border border-[color:var(--ims-border)] bg-[color:var(--ims-paper)] p-5 shadow-[0_18px_50px_rgba(17,24,39,0.08)] lg:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-[color:var(--ims-border)] pb-4 lg:hidden">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--ims-muted)]">
                {appName}
              </p>
              <p className="text-lg font-semibold">{branchName ?? 'Single-client branch scope'}</p>
            </div>
            <StatusRail>{userName ?? 'Guest'}</StatusRail>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
