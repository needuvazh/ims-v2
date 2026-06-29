'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  Search,
  HelpCircle,
  Home,
  Plus,
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
  CreditCard,
  Award,
  Calendar,
  ClipboardCheck,
} from 'lucide-react';
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

export function getIconForHref(href: string): ReactNode | null {
  const norm = normalizePath(href);
  switch (norm) {
    case '/dashboard':
      return <LayoutDashboard className="h-4.5 w-4.5" />;
    case '/leads':
      return <TrendingUp className="h-4.5 w-4.5" />;
    case '/organization':
      return <Building2 className="h-4.5 w-4.5" />;
    case '/organization/institutes':
      return <Building className="h-4.5 w-4.5" />;
    case '/organization/branches':
      return <MapPin className="h-4.5 w-4.5" />;
    case '/organization/departments':
      return <Layers className="h-4.5 w-4.5" />;
    case '/organization/classrooms':
      return <GraduationCap className="h-4.5 w-4.5" />;
    case '/organization/hierarchy':
      return <FolderTree className="h-4.5 w-4.5" />;
    case '/iam':
      return <ShieldCheck className="h-4.5 w-4.5" />;
    case '/iam/users':
      return <Users className="h-4.5 w-4.5" />;
    case '/iam/roles':
      return <UserCheck className="h-4.5 w-4.5" />;
    case '/iam/permissions':
      return <Key className="h-4.5 w-4.5" />;
    case '/iam/sessions':
      return <Activity className="h-4.5 w-4.5" />;
    case '/iam/login-history':
      return <History className="h-4.5 w-4.5" />;
    case '/iam/security-policy':
      return <Lock className="h-4.5 w-4.5" />;
    case '/iam/audit':
      return <FileSliders className="h-4.5 w-4.5" />;
    case '/iam/reports':
      return <FileSpreadsheet className="h-4.5 w-4.5" />;
    case '/fees':
      return <CreditCard className="h-4.5 w-4.5" />;
    case '/certificates':
      return <Award className="h-4.5 w-4.5" />;
    case '/schedule':
      return <Calendar className="h-4.5 w-4.5" />;
    case '/attendance':
      return <ClipboardCheck className="h-4.5 w-4.5" />;
    default:
      return null;
  }
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
          'relative shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg flex items-center justify-center p-1.5',
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
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--ims-sidebar-muted)]">Admin</p>
          <p className="truncate text-sm font-black text-[color:var(--ims-sidebar-ink)]">{appName}</p>
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
      className="flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100/60 shadow-sm transition-all outline-none"
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
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
    'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-300 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ims-sidebar)]',
    depth > 0 && 'rounded-lg px-3 py-1.5 text-xs font-semibold',
    isActive
      ? 'bg-[color:var(--ims-brass-soft)] text-[color:var(--ims-brass)] shadow-[0_4px_16px_rgba(99,102,241,0.04)] border border-[color:var(--ims-sidebar-border)]'
      : 'text-slate-500 hover:bg-slate-50 hover:text-[color:var(--ims-ink)] border border-transparent',
    collapsed && 'justify-center px-2',
    depth > 0 && 'ml-1',
  );

  const resolvedIcon = item.icon || getIconForHref(item.href);

  const iconMarkup = resolvedIcon ? (
    <div className={cn(
      'rounded-lg flex items-center justify-center transition-all duration-300 shrink-0 border shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
      depth > 0 ? 'w-6 h-6 rounded-md' : 'w-8 h-8 rounded-lg',
      isActive 
        ? 'bg-[color:var(--ims-brass)] text-white border-transparent shadow-[0_3px_8px_rgba(99,102,241,0.22)]' 
        : 'bg-white text-slate-400 border-[color:var(--ims-border)] group-hover:text-[color:var(--ims-brass)] group-hover:border-[color:var(--ims-brass-soft)] group-hover:shadow-sm'
    )}>
      <div className={cn(
        'shrink-0 transition-all duration-300 flex items-center justify-center',
        depth > 0 ? 'w-3 h-3' : 'w-4 h-4'
      )}>
        {resolvedIcon}
      </div>
    </div>
  ) : null;

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
          'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-opacity bg-[color:var(--ims-brass)]',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50',
        )}
      />
      {iconMarkup}
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
          'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-opacity bg-[color:var(--ims-brass)]',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50',
        )}
      />
      {iconMarkup}
      {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
      {!collapsed && item.badge !== undefined ? (
        <span
          className={cn(
            'ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
            isActive ? 'bg-[color:var(--ims-brass)] text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-100',
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
          <h3 className="px-3 text-[9px] font-black text-[color:var(--ims-sidebar-muted)] uppercase tracking-[0.3em] opacity-60">{section.label}</h3>
        ) : (
          <div className="mx-3 border-t border-[color:var(--ims-sidebar-border)]" aria-hidden="true" />
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
                <ul id={`sidebar-item-${normalizePath(item.href).replace(/\//g, '-')}`} className="space-y-1 border-l border-slate-200 pl-3 pt-1.5">
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
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--ims-border)] bg-slate-50 p-3">
      {userAvatar || (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-200/50">
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
      <div className="space-y-3 rounded-xl border border-[color:var(--ims-border)] bg-slate-50/50 p-3">
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
        'fixed inset-y-0 left-0 z-30 hidden h-screen flex-col border-r border-[color:var(--ims-sidebar-border)] bg-[color:var(--ims-sidebar)] backdrop-blur-xl shadow-2xl shadow-slate-200/20 transition-[width] duration-300 lg:flex',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-[color:var(--ims-sidebar-border)] px-4">
        <div className={cn('min-w-0', collapsed && 'mx-auto')}>
          <BrandLogo appName={appName} collapsed={collapsed} />
        </div>
        <SidebarCollapseButton collapsed={collapsed} onToggle={() => onCollapsedChange(!collapsed)} />
      </div>

      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto custom-sidebar-scrollbar px-3 py-4">
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
      {/* Profile info in the bottom removed as requested */}
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
        <DialogPrimitive.Content aria-label="Primary navigation" className="fixed inset-y-0 left-0 z-50 flex h-full w-[18rem] flex-col border-r border-[color:var(--ims-sidebar-border)] bg-[color:var(--ims-sidebar)] backdrop-blur-xl shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left-4 data-[state=open]:slide-in-from-left-4 lg:hidden">
          <div className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-[color:var(--ims-sidebar-border)] px-4">
            <BrandLogo appName={appName} />
            <DialogPrimitive.Close
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100/60 outline-none"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto custom-sidebar-scrollbar px-3 py-4">
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
    <div className={cn('min-h-screen bg-[#fbf9f5] text-[color:var(--ims-ink)]', className)}>
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

      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-300 lg:pl-64', sidebarCollapsed && 'lg:pl-20')}>
        <header className="sticky top-0 z-20 flex h-20 shrink-0 items-center justify-between border-b border-[color:var(--ims-border)] bg-white/70 px-4 shadow-[0_2px_20px_rgba(0,0,0,0.02)] backdrop-blur-xl md:px-6 lg:px-8">
          {/* Left section: Hamburger (mobile), Breadcrumbs (desktop), and active branch badge */}
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 border border-[#c1c7ce]/60 outline-none lg:hidden transition-all active:scale-95"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop breadcrumbs */}
            <nav className="hidden lg:flex items-center gap-2 text-xs font-semibold text-[color:var(--ims-muted)]">
              <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-[color:var(--ims-brass)] transition-colors text-slate-400 hover:text-[color:var(--ims-brass)]">
                <Home className="h-4 w-4" />
              </Link>
              {activeTrail.length > 0 ? (
                activeTrail.map((item, index) => {
                  const isLast = index === activeTrail.length - 1;
                  return (
                    <div key={item.href} className="flex items-center gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                      {isLast ? (
                        <span className="text-[color:var(--ims-ink)] font-bold text-sm tracking-tight">{item.label}</span>
                      ) : (
                        <Link href={item.href} className="hover:text-[color:var(--ims-brass)] transition-colors">
                          {item.label}
                        </Link>
                      )}
                    </div>
                  );
                })
              ) : (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  <span className="text-[color:var(--ims-ink)] font-bold text-sm tracking-tight">Dashboard</span>
                </>
              )}
            </nav>

            {/* Mobile/Tablet title */}
            <div className="lg:hidden min-w-0">
              <span className="truncate text-sm font-bold text-[color:var(--ims-ink)]">
                {activeLabel ?? appName}
              </span>
            </div>

            {/* Active Branch Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[color:var(--ims-brass)] transition-all hover:bg-indigo-50/50 shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--ims-brass)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[color:var(--ims-brass)]"></span>
              </span>
              {branchName ?? 'HQ Campus'}
            </div>
          </div>

          {/* Center Section: Sleek capsule-shaped search mock */}
          <div className="hidden md:flex flex-1 items-center justify-center px-4 max-w-sm">
            <button
              type="button"
              className="flex items-center gap-2 w-full rounded-xl border border-[color:var(--ims-border)] bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 px-3.5 py-2 text-left text-xs font-semibold text-[color:var(--ims-muted)] transition-all duration-200 cursor-pointer shadow-sm hover:shadow"
            >
              <Search className="h-3.5 w-3.5 text-[color:var(--ims-muted)]" />
              <span className="flex-1">Search or jump to...</span>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 font-mono text-[9px] font-medium text-slate-400">
                <span>⌘</span>K
              </kbd>
            </button>
          </div>

          {/* Right section: Actions and Profile menu */}
          <div className="flex items-center gap-3">
            {/* Quick action shortcuts button */}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--ims-border)] bg-white hover:border-slate-300 hover:shadow-sm text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              title="Quick Action"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>

            {/* Notification bell button */}
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--ims-border)] bg-white hover:border-slate-300 hover:shadow-sm text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              title="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-2.5 top-2.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </button>

            {/* Help/Documentation */}
            <button
              type="button"
              className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--ims-border)] bg-white hover:border-slate-300 hover:shadow-sm text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              title="Documentation"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </button>

            {/* User Profile dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2.5 rounded-xl border border-[color:var(--ims-border)] bg-white px-3 py-1.5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md focus-visible:outline-none cursor-pointer"
              >
                {userAvatar || (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-xs font-bold text-white shadow-md shadow-indigo-150/40">
                    {userName?.[0]?.toUpperCase() ?? 'A'}
                  </div>
                )}
                <div className="hidden flex-col text-left xl:flex">
                  <span className="text-xs font-semibold text-[color:var(--ims-ink)] leading-tight">{userName ?? 'Administrator'}</span>
                  <span className="max-w-[120px] truncate text-[9px] font-bold text-[color:var(--ims-muted)] uppercase tracking-wider">
                    {branchName ?? 'HQ Branch'}
                  </span>
                </div>
                <ChevronDown className={cn('h-4 w-4 text-[color:var(--ims-muted)] transition-transform duration-200', profileMenuOpen && 'rotate-180')} />
              </button>

              {profileMenuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Close profile menu"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2.5 w-72 rounded-xl border border-[#c1c7ce]/80 bg-white/95 backdrop-blur-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in-50 slide-in-from-top-2 duration-200">
                    <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4 xl:hidden">
                      {userAvatar || (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-sm font-bold text-white shadow-md shadow-indigo-200/50">
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
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
