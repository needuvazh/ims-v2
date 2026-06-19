'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Badge } from './badge';

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  current?: boolean;
}

export interface AppShellProps {
  appName: string;
  branchName?: string;
  userName?: string;
  userAvatar?: ReactNode;
  items: NavItem[];
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

function SidebarContent({
  appName,
  branchName,
  userName,
  userAvatar,
  items,
  aside,
  onClose,
}: AppShellProps & { onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col p-5">
      {/* Header */}
      <div className="space-y-3 border-b border-[color:var(--ims-border)] pb-5">
        <div className="flex items-center justify-between">
          <Badge>{appName}</Badge>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-full p-1 text-[color:var(--ims-muted)] hover:bg-[color:var(--ims-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          <p className="font-[family-name:var(--font-display,serif)] text-xl font-semibold text-[color:var(--ims-ink)]">
            {appName}
          </p>
          <p className="text-xs text-[color:var(--ims-muted)]">
            {branchName ? `Branch: ${branchName}` : 'Single-client scope'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Main navigation">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all',
                  item.current
                    ? 'bg-[color:var(--ims-ink)] text-[color:var(--ims-paper)]'
                    : 'text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)]',
                )}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.icon && (
                  <span className="h-4 w-4 shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer / user area */}
      <div className="space-y-3 border-t border-[color:var(--ims-border)] pt-4">
        {userAvatar || (
          <div className="flex items-center gap-3 rounded-2xl bg-[color:var(--ims-accent-soft)] px-4 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--ims-ink)] text-xs font-bold text-[color:var(--ims-paper)]">
              {userName?.[0]?.toUpperCase() ?? 'G'}
            </div>
            <span className="text-xs font-medium text-[color:var(--ims-ink)]">
              {userName ?? 'Guest'}
            </span>
          </div>
        )}
        {aside}
      </div>
    </div>
  );
}

/** Client component App Shell with responsive sidebar. */
export function AppShell({
  appName,
  branchName,
  userName,
  userAvatar,
  items,
  aside,
  children,
  className,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className={cn(
        'min-h-screen bg-[color:var(--ims-paper)] text-[color:var(--ims-ink)]',
        className,
      )}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 p-4 lg:p-6">
        {/* ── Desktop Sidebar ── */}
        <aside className="hidden w-64 shrink-0 lg:flex lg:flex-col xl:w-72">
          <div className="sticky top-6 flex min-h-[calc(100vh-3rem)] flex-col rounded-[32px] border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] shadow-[0_18px_50px_rgba(17,24,39,0.08)]">
            <SidebarContent
              appName={appName}
              branchName={branchName}
              userName={userName}
              userAvatar={userAvatar}
              items={items}
              aside={aside}
            />
          </div>
        </aside>

        {/* ── Mobile Overlay Sidebar ── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-[color:var(--ims-ink)]/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute left-0 top-0 flex h-full w-72 flex-col rounded-r-[32px] border-r border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] shadow-2xl">
              <SidebarContent
                appName={appName}
                branchName={branchName}
                userName={userName}
                userAvatar={userAvatar}
                items={items}
                aside={aside}
                onClose={() => setSidebarOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* ── Main Content ── */}
        <main className="flex min-w-0 flex-1 flex-col gap-6 rounded-[36px] border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] shadow-[0_18px_50px_rgba(17,24,39,0.08)]">
          {/* Mobile Top Bar */}
          <div className="flex items-center justify-between border-b border-[color:var(--ims-border)] px-5 py-4 lg:hidden">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--ims-muted)]">
                {appName}
              </p>
              <p className="text-sm font-semibold text-[color:var(--ims-ink)]">
                {branchName ?? 'Portal'}
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-2xl border border-[color:var(--ims-border)] p-2 text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)]"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-hidden p-5 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
