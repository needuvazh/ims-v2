'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { SimpleTooltip } from './tooltip';

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  current?: boolean;
  items?: NavItem[];
  category?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export function normalizePath(path: string) {
  return path.split(/[?#]/)[0].replace(/\/$/, '') || '/';
}

export function isPathActive(pathname: string, href: string, exact = false) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (exact) return current === target;
  return current === target || current.startsWith(`${target}/`);
}

function hasActiveDescendant(item: NavItem, pathname: string): boolean {
  if (isPathActive(pathname, item.href, Boolean(item.current))) return true;
  return item.items?.some((child) => hasActiveDescendant(child, pathname)) ?? false;
}

export function getNavigationTrail(items: NavItem[], pathname: string): NavItem[] {
  for (const item of items) {
    if (item.items?.length) {
      const childTrail = getNavigationTrail(item.items, pathname);
      if (childTrail.length > 0) return [item, ...childTrail];
    }

    if (isPathActive(pathname, item.href, Boolean(item.current))) {
      return [item];
    }
  }

  return [];
}

export function groupNavigationSections(items: NavItem[]): NavSection[] {
  const sections = new Map<string, NavItem[]>();
  const order: string[] = [];

  for (const item of items) {
    const label = item.category?.trim() || 'Navigation';
    if (!sections.has(label)) {
      sections.set(label, []);
      order.push(label);
    }
    sections.get(label)!.push(item);
  }

  return order.map((label) => ({ label, items: sections.get(label) ?? [] }));
}

export function getInitialExpandedItems(items: NavItem[], pathname?: string) {
  return items.reduce<Record<string, boolean>>((acc, item) => {
    if (!item.items?.length) return acc;

    if (!pathname || hasActiveDescendant(item, pathname)) {
      acc[item.href] = true;
    }

    return acc;
  }, {});
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

function BrandLogo({ appName, collapsed }: { appName: string; collapsed?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-2xl border border-[color:var(--ims-border)] bg-white',
          collapsed ? 'h-11 w-11' : 'h-11 w-40',
        )}
      >
        <Image
          src="/alsaud/logo.png"
          alt={appName}
          fill
          priority
          sizes={collapsed ? '44px' : '160px'}
          className={cn('object-contain p-2', collapsed ? 'object-center' : 'object-left')}
        />
      </div>
      {!collapsed ? (
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ims-muted)]">Admin</p>
          <p className="truncate text-sm font-semibold text-[color:var(--ims-ink)]">{appName}</p>
        </div>
      ) : null}
    </div>
  );
}

export function SidebarCollapseButton({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] text-[color:var(--ims-muted)] transition-all duration-200 hover:bg-[color:var(--ims-accent-soft)] hover:text-[color:var(--ims-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2"
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
    </button>
  );
}

export function SidebarItem({
  item,
  pathname,
  collapsed = false,
  active,
  expanded,
  depth = 0,
  onToggle,
  onExpandRequest,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed?: boolean;
  active?: boolean;
  expanded?: boolean;
  depth?: number;
  onToggle?: () => void;
  onExpandRequest?: () => void;
  onNavigate?: () => void;
}) {
  const hasChildren = Boolean(item.items?.length);
  const isActive = active ?? isPathActive(pathname, item.href, Boolean(item.current));
  const labelId = `sidebar-item-${normalizePath(item.href).replace(/\//g, '-')}`;

  const base = cn(
    'group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2',
    depth > 0 && 'rounded-xl px-3 py-2 text-sm',
    isActive
      ? depth > 0
        ? 'bg-[color:var(--ims-ink)] text-[color:var(--ims-paper)] shadow-[0_8px_18px_rgba(20,33,61,0.16)] ring-1 ring-[color:var(--ims-brass)]/20'
        : 'bg-[color:var(--ims-ink)] text-[color:var(--ims-paper)] shadow-[0_10px_24px_rgba(20,33,61,0.18)] ring-1 ring-[color:var(--ims-brass)]/20'
      : 'text-[color:var(--ims-muted)] hover:bg-[color:var(--ims-accent-soft)] hover:text-[color:var(--ims-ink)]',
    collapsed && 'justify-center px-2',
    depth > 0 && 'ml-1',
  );

  const content = hasChildren ? (
    <button
      type="button"
      onClick={() => {
        if (collapsed) {
          onExpandRequest?.();
          return;
        }

        onToggle?.();
      }}
      className={base}
      aria-expanded={expanded}
      aria-controls={labelId}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-opacity',
          isActive ? 'bg-[color:var(--ims-brass)] opacity-100' : 'bg-transparent opacity-0 group-hover:opacity-40',
        )}
      />
      {item.icon ? (
        <span aria-hidden="true" className={cn('shrink-0', isActive ? 'text-inherit' : 'text-[color:var(--ims-muted)]')}>
          {item.icon}
        </span>
      ) : null}
      {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
      {!collapsed ? (
        <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
      ) : null}
    </button>
  ) : (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={base}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-opacity',
          isActive ? 'bg-[color:var(--ims-brass)] opacity-100' : 'bg-transparent opacity-0 group-hover:opacity-40',
        )}
      />
      {item.icon ? (
        <span aria-hidden="true" className={cn('shrink-0', isActive ? 'text-inherit' : 'text-[color:var(--ims-muted)]')}>
          {item.icon}
        </span>
      ) : null}
      {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
      {!collapsed && item.badge !== undefined ? (
        <span
          className={cn(
            'ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
            isActive ? 'bg-white/15 text-white' : 'bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-ink)]',
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );

  if (!collapsed) return content;

  return <SimpleTooltip content={item.label}>{content}</SimpleTooltip>;
}

export function SidebarGroup({
  section,
  pathname,
  collapsed,
  openMap,
  setOpenMap,
  onNavigate,
  onExpandRequest,
}: {
  section: NavSection;
  pathname: string;
  collapsed: boolean;
  openMap: Record<string, boolean>;
  setOpenMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onNavigate?: () => void;
  onExpandRequest?: () => void;
}) {
  return (
    <section className="space-y-2">
      {!collapsed ? (
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ims-muted)]">{section.label}</p>
      ) : (
        <div className="mx-3 border-t border-[color:var(--ims-border)]" aria-hidden="true" />
      )}

      <ul className="space-y-1">
        {section.items.map((item) => {
          const hasChildren = Boolean(item.items?.length);
          const expanded = Boolean(openMap[item.href]);
          const active = hasChildren ? hasActiveDescendant(item, pathname) : isPathActive(pathname, item.href, Boolean(item.current));

          return (
            <li key={item.href} className="space-y-1">
              <SidebarItem
                item={item}
                pathname={pathname}
                collapsed={collapsed}
                active={active}
                expanded={expanded}
                onToggle={hasChildren ? () => setOpenMap((prev) => ({ ...prev, [item.href]: !prev[item.href] })) : undefined}
                onExpandRequest={onExpandRequest}
                onNavigate={onNavigate}
              />

              {hasChildren && !collapsed && expanded ? (
                <ul id={`sidebar-item-${normalizePath(item.href).replace(/\//g, '-')}`} className="space-y-1 border-l border-[color:var(--ims-border)] pl-3 pt-1.5">
                  {item.items!.map((child) => (
                    <li key={child.href}>
                      <SidebarItem item={child} pathname={pathname} depth={1} onNavigate={onNavigate} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SidebarUserProfile({
  userName,
  branchName,
  userAvatar,
}: {
  userName?: string;
  branchName?: string;
  userAvatar?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-3">
      {userAvatar || (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--ims-ink),var(--ims-brass))] text-sm font-bold text-white">
          {userName?.[0]?.toUpperCase() ?? 'A'}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[color:var(--ims-ink)]">{userName ?? 'Administrator'}</p>
        <p className="truncate text-xs text-[color:var(--ims-muted)]">{branchName ?? 'HQ Branch'}</p>
      </div>
    </div>
  );
}

export function SidebarFooter({
  branchName,
  userName,
  userAvatar,
  children,
}: {
  branchName?: string;
  userName?: string;
  userAvatar?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-t border-[color:var(--ims-border)] p-4">
      <div className="space-y-3 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-background)] p-3">
        <SidebarUserProfile userName={userName} branchName={branchName} userAvatar={userAvatar} />
        {children ? <div className="space-y-3">{children}</div> : null}
      </div>
    </div>
  );
}

export function AdminSidebar({
  appName,
  branchName,
  userName,
  userAvatar,
  sections,
  collapsed,
  onCollapsedChange,
  onNavigate,
}: {
  appName: string;
  branchName?: string;
  userName?: string;
  userAvatar?: ReactNode;
  sections: NavSection[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    getInitialExpandedItems(sections.flatMap((section) => section.items), pathname),
  );

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden h-screen flex-col border-r border-[color:var(--ims-border)] bg-[color:var(--ims-surface)]/96 shadow-[0_12px_40px_rgba(20,33,61,0.06)] backdrop-blur-xl transition-[width] duration-300 lg:flex',
        collapsed ? 'w-20' : 'w-72',
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[color:var(--ims-border)] px-4">
        <div className={cn('min-w-0', collapsed && 'mx-auto')}>
          <BrandLogo appName={appName} collapsed={collapsed} />
        </div>
        <SidebarCollapseButton collapsed={collapsed} onToggle={() => onCollapsedChange(!collapsed)} />
      </div>

      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {sections.map((section) => (
            <SidebarGroup
              key={section.label}
              section={section}
              pathname={pathname}
              collapsed={collapsed}
              openMap={openMap}
              setOpenMap={setOpenMap}
              onNavigate={onNavigate}
              onExpandRequest={() => onCollapsedChange(false)}
            />
          ))}
        </div>
      </nav>

      {!collapsed ? <SidebarFooter branchName={branchName} userName={userName} userAvatar={userAvatar} /> : null}
    </aside>
  );
}

export function MobileSidebar({
  appName,
  sections,
  open,
  onOpenChange,
  onNavigate,
}: {
  appName: string;
  sections: NavSection[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    getInitialExpandedItems(sections.flatMap((section) => section.items), pathname),
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[color:var(--ims-ink)]/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
        <DialogPrimitive.Content aria-label="Primary navigation" className="fixed inset-y-0 left-0 z-50 flex h-full w-[18rem] flex-col border-r border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] shadow-[0_24px_80px_rgba(20,33,61,0.18)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left-4 data-[state=open]:slide-in-from-left-4 lg:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[color:var(--ims-border)] px-4">
            <BrandLogo appName={appName} />
            <DialogPrimitive.Close
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[color:var(--ims-muted)] transition-all hover:bg-[color:var(--ims-accent-soft)] hover:text-[color:var(--ims-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-6">
              {sections.map((section) => (
                <SidebarGroup
                  key={section.label}
                  section={section}
                  pathname={pathname}
                  collapsed={false}
                  openMap={openMap}
                  setOpenMap={setOpenMap}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

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
  const pathname = usePathname();
  const sections = useMemo(() => groupNavigationSections(items), [items]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const activeTrail = getNavigationTrail(items, pathname);
  const activeLabel = activeTrail.at(-1)?.label;
  const activeParentLabel = activeTrail.length > 1 ? activeTrail[0]?.label : undefined;

  return (
    <div className={cn('min-h-screen bg-[color:var(--ims-background)] text-[color:var(--ims-ink)]', className)}>
      <AdminSidebar
        key={`desktop-${pathname}`}
        appName={appName}
        branchName={branchName}
        userName={userName}
        userAvatar={userAvatar}
        sections={sections}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <MobileSidebar
        key={`mobile-${pathname}`}
        appName={appName}
        sections={sections}
        open={mobileSidebarOpen}
        onOpenChange={setMobileSidebarOpen}
        onNavigate={() => setMobileSidebarOpen(false)}
      />

      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-300 lg:pl-72', sidebarCollapsed && 'lg:pl-20')}>
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-[color:var(--ims-border)] bg-[color:var(--ims-surface)]/85 px-4 backdrop-blur-xl md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[color:var(--ims-muted)] transition-all hover:bg-[color:var(--ims-accent-soft)] hover:text-[color:var(--ims-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ims-muted)]">
                {activeParentLabel ?? branchName ?? 'Workspace'}
              </p>
              <p className="truncate text-sm font-semibold text-[color:var(--ims-ink)]">
                {activeLabel ?? appName}
              </p>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 px-6 xl:flex" />

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-1.5 transition-all duration-200 hover:border-[color:var(--ims-border)] hover:bg-[color:var(--ims-surface)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2"
            >
              {userAvatar || (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--ims-ink),var(--ims-brass))] text-sm font-bold text-white shadow-sm">
                  {userName?.[0]?.toUpperCase() ?? 'A'}
                </div>
              )}
              <div className="hidden flex-col text-left xl:flex">
                <span className="text-xs font-semibold text-[color:var(--ims-ink)]">{userName ?? 'Administrator'}</span>
                <span className="max-w-[120px] truncate text-[10px] font-medium text-[color:var(--ims-muted)]">
                  {branchName ?? 'HQ Branch'}
                </span>
              </div>
              <ChevronDown className={cn('h-4 w-4 text-[color:var(--ims-muted)] transition-transform', profileMenuOpen && 'rotate-180')} />
            </button>

            {profileMenuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label="Close profile menu"
                  onClick={() => setProfileMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 shadow-[0_20px_40px_rgba(20,33,61,0.12)]">
                  <div className="mb-4 flex items-center gap-3 border-b border-[color:var(--ims-border)] pb-4 xl:hidden">
                    {userAvatar || (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--ims-ink),var(--ims-brass))] text-sm font-bold text-white shadow-sm">
                        {userName?.[0]?.toUpperCase() ?? 'A'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[color:var(--ims-ink)]">{userName ?? 'Administrator'}</p>
                      <p className="truncate text-xs text-[color:var(--ims-muted)]">{branchName ?? 'HQ Branch'}</p>
                    </div>
                  </div>
                  {aside ? <div>{aside}</div> : null}
                </div>
              </>
            ) : null}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
