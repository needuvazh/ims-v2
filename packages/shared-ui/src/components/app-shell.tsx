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
}: Omit<AppShellProps, 'children'> & { onClose?: () => void }) {
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
                  'group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-300',
                  item.current
                    ? 'bg-[color:var(--ims-ink)] text-[color:var(--ims-paper)] shadow-md'
                    : 'text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)] hover:translate-x-1',
                )}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.icon && (
                  <span className={cn('h-4 w-4 shrink-0 transition-transform duration-300', !item.current && 'group-hover:text-[color:var(--ims-brass)] group-hover:scale-110')} aria-hidden="true">
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
          <div className="flex items-center gap-3 rounded-2xl bg-[color:var(--ims-accent-soft)] px-4 py-2.5 hover:shadow-md transition-shadow">
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
        'min-h-screen bg-[color:var(--ims-paper)] text-[color:var(--ims-ink)] relative overflow-hidden',
        className,
      )}
    >
      {/* Decorative background blobs/particles to match the vibrant aesthetic */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft geometric blobs */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[color:var(--ims-brass-soft)] blur-[120px] opacity-60 mix-blend-multiply" />
        <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full bg-[color:var(--ims-accent-soft)] blur-[120px] opacity-60 mix-blend-multiply" />
        
        {/* Floating geometric particles */}
        <svg className="absolute top-10 left-[20%] text-[color:var(--ims-brass)] opacity-20 animate-float" width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="50" cy="50" r="40" />
        </svg>
        <svg className="absolute bottom-20 right-[10%] text-[color:var(--ims-ink)] opacity-[0.03] animate-float-slow delay-200" width="120" height="120" viewBox="0 0 100 100" fill="currentColor">
          <rect x="20" y="20" width="60" height="60" rx="10" transform="rotate(15 50 50)" />
        </svg>
        <svg className="absolute top-1/2 left-[10%] text-[color:var(--ims-brass)] opacity-10 animate-float-rev delay-500" width="80" height="80" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
          <polygon points="50,10 90,90 10,90" />
        </svg>
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 p-4 lg:p-6 relative z-10">
        {/* ── Desktop Sidebar ── */}
        <aside className="hidden w-64 shrink-0 lg:flex lg:flex-col xl:w-72 animate-fade-in-left">
          <div className="sticky top-6 flex min-h-[calc(100vh-3rem)] flex-col rounded-[32px] border border-white/40 bg-white/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(20,33,61,0.04)]">
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
            <aside className="absolute left-0 top-0 flex h-full w-72 flex-col rounded-r-[32px] border-r border-white/40 bg-white/90 backdrop-blur-3xl shadow-2xl animate-fade-in-left">
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
        <main className="flex min-w-0 flex-1 flex-col gap-6 rounded-[36px] border border-white/40 bg-white/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(20,33,61,0.04)] animate-fade-in-up">
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
              className="rounded-2xl border border-[color:var(--ims-border)] bg-white/50 p-2 text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)]"
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
