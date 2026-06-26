'use client';

import Link from 'next/link';
import { useState, Suspense, type ReactNode } from 'react';
import { Menu, X, ChevronDown, ChevronRight, PanelsTopLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '../utils/cn';

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  current?: boolean;
  items?: NavItem[];
  category?: string;
}

export function normalizePath(href: string) {
  return href.split('?')[0];
}

export function isPathActive(pathname: string, href: string) {
  const itemPath = normalizePath(href);
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function getInitialExpandedItems(items: NavItem[]) {
  return items.reduce<Record<string, boolean>>((acc, item) => {
    if (item.items?.length) {
      acc[item.href] = true;
    }
    return acc;
  }, {});
}

export function getNavigationTrail(items: NavItem[], pathname: string): NavItem[] {
  for (const item of items) {
    if (item.items?.length) {
      const childTrail = getNavigationTrail(item.items, pathname);
      if (childTrail.length > 0) {
        return [item, ...childTrail];
      }
    }

    if (isPathActive(pathname, item.href)) {
      return [item];
    }
  }

  return [];
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

function BrandLogo({ appName, isCollapsed }: { appName: string; isCollapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 transition-all duration-300", isCollapsed ? "justify-center" : "px-2")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#c96a22] to-[#8a4a1d] text-white shadow-md shadow-[#c96a22]/25">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="m12 3-10 9h3v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8h3L12 3z" />
        </svg>
      </div>
      {!isCollapsed && (
        <div className="flex flex-col">
          <span className="font-[family-name:var(--font-display)] text-base font-extrabold tracking-tight text-slate-800 leading-none">
            {appName}
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
            Management Portal
          </span>
        </div>
      )}
    </div>
  );
}

function SidebarNavList({
  items,
  isCollapsed,
  onClose,
  onExpand,
}: {
  items: NavItem[];
  isCollapsed?: boolean;
  onClose?: () => void;
  onExpand?: () => void;
}) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() =>
    getInitialExpandedItems(items)
  );

  const isItemActive = (href: string) => {
    return isPathActive(pathname, href);
  };

  const isParentActive = (item: NavItem) => {
    if (isItemActive(item.href)) {
      return true;
    }
    if (item.items) {
      return item.items.some((subItem) => isItemActive(subItem.href));
    }
    return false;
  };

  // Group items by category
  const categories: Record<string, NavItem[]> = {};
  items.forEach((item) => {
    const cat = item.category || 'System';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  });

  return (
    <div className="space-y-6">
      {Object.entries(categories).map(([categoryName, catItems]) => (
        <div key={categoryName} className="space-y-1.5">
          {!isCollapsed ? (
            <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-[#b08b68]/80">
              {categoryName}
            </p>
          ) : (
            <div className="mx-4 my-2 border-t border-[#f0e3d2]" />
          )}

          <ul className="space-y-1">
            {catItems.map((item) => {
              const hasSubmenu = item.items && item.items.length > 0;
              const isExpanded = !!expandedItems[item.href];
              const isActive = isParentActive(item);

              return (
                <li key={item.href} className="space-y-1">
                  {hasSubmenu ? (
                    <div>
                      <button
                        onClick={() => {
                          if (isCollapsed && onExpand) {
                            onExpand();
                          }
                          setExpandedItems((prev) => ({
                            ...prev,
                            [item.href]: !prev[item.href],
                          }));
                        }}
                        className={cn(
                          'group relative flex w-full items-center justify-between overflow-hidden rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-out',
                          isActive
                            ? 'border border-[#efd8bf]/80 bg-gradient-to-r from-[#fff7ef] via-white to-[#f8e9d9] text-[#9a5a26] font-semibold shadow-[0_8px_24px_rgba(201,106,34,0.10)]'
                            : 'border border-transparent text-slate-600 hover:border-[#f0e3d2] hover:bg-white/80 hover:text-[#b75c16] hover:shadow-sm',
                          isCollapsed && 'justify-center px-0'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-violet-500 to-fuchsia-500 transition-all duration-300 ease-out',
                            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                          )}
                          aria-hidden="true"
                        />
                        <div className="flex items-center gap-3">
                          {item.icon && (
                            <span
                              className={cn(
                                'h-5 w-5 shrink-0 transition-all duration-300 ease-out',
                                isActive
                                  ? 'text-[#c96a22]'
                                  : 'text-slate-400 group-hover:text-[#c96a22] group-hover:scale-110'
                              )}
                              aria-hidden="true"
                            >
                              {item.icon}
                            </span>
                          )}
                          {!isCollapsed && <span>{item.label}</span>}
                        </div>
                          {!isCollapsed && (
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 text-slate-400 transition-transform duration-300 ease-out',
                                isExpanded && 'rotate-180 text-[#c96a22]'
                              )}
                            />
                          )}
                      </button>

                      {!isCollapsed && (
                        <div
                          className={cn(
                            'grid overflow-hidden pl-6 transition-all duration-300 ease-out motion-reduce:transition-none',
                            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          )}
                        >
                          <ul className="min-h-0 space-y-1 border-l border-slate-100/80 pl-3 pt-2">
                          {item.items!.map((subItem) => {
                            const isSubActive = isItemActive(subItem.href);
                            return (
                              <li key={subItem.href}>
                                <Link
                                  href={subItem.href}
                                  onClick={onClose}
                                  className={cn(
                                    'group flex items-center gap-3 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-300 ease-out motion-reduce:transition-none',
                                    isSubActive
                                      ? 'bg-[linear-gradient(135deg,rgba(124,58,237,0.98),rgba(217,70,239,0.92))] text-white shadow-[0_8px_18px_rgba(124,58,237,0.22)]'
                                      : 'text-slate-500 hover:bg-white/80 hover:text-violet-700 hover:translate-x-1',
                                  )}
                                  aria-current={isSubActive ? 'page' : undefined}
                                >
                                  <span
                                    className={cn(
                                      'h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300',
                                      isSubActive
                                        ? 'bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.16)]'
                                        : 'bg-slate-300 group-hover:bg-[#c96a22]'
                                    )}
                                    aria-hidden="true"
                                  />
                                  {subItem.label}
                                </Link>
                              </li>
                            );
                          })}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-out motion-reduce:transition-none',
                        isActive
                            ? 'border border-[#d8a06d]/80 bg-gradient-to-r from-[#c96a22] via-[#b75c16] to-[#8a4a1d] text-white shadow-[0_10px_22px_rgba(201,106,34,0.18)]'
                            : 'border border-transparent text-slate-600 hover:border-[#f0e3d2] hover:bg-white/80 hover:text-[#b75c16] hover:translate-x-1 hover:shadow-sm',
                        isCollapsed && 'justify-center px-0 hover:translate-x-0'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span
                        className={cn(
                          'absolute inset-y-2 left-0 w-1 rounded-r-full bg-white transition-all duration-300 ease-out',
                          isActive ? 'opacity-100' : 'opacity-0'
                        )}
                        aria-hidden="true"
                      />
                      {item.icon && (
                        <span
                          className={cn(
                            'h-5 w-5 shrink-0 transition-all duration-300 ease-out',
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#c96a22] group-hover:scale-110'
                          )}
                          aria-hidden="true"
                        >
                          {item.icon}
                        </span>
                      )}
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const pathname = usePathname();
  const activeTrail = getNavigationTrail(items, pathname);
  const activeLabel = activeTrail.at(-1)?.label;
  const activeParentLabel = activeTrail.length > 1 ? activeTrail[0]?.label : undefined;

  return (
    <div className={cn("min-h-screen bg-[#fbf8f3] text-[color:var(--ims-ink)] relative overflow-hidden", className)}>
      {/* Background Effect Layer */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.12] mix-blend-overlay pointer-events-none z-0" />
      <div className="absolute -top-[10%] -right-[5%] h-[600px] w-[600px] rounded-full bg-[#d8a06d]/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[0%] -left-[10%] h-[700px] w-[700px] rounded-full bg-[#ead1b2]/30 blur-[120px] pointer-events-none z-0" />

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden h-screen border-r border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(251,248,243,0.9))] backdrop-blur-2xl shadow-[inset_-1px_0_0_rgba(255,255,255,0.7)] transition-all duration-300 lg:flex lg:flex-col",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
          <div className="flex h-16 shrink-0 items-center border-b border-[#f0e3d2]/80 px-5">
          <BrandLogo appName={appName} isCollapsed={sidebarCollapsed} />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Suspense fallback={
            <div className="animate-pulse space-y-4 p-4">
              <div className="h-10 bg-[#f6efe6] rounded-lg" />
              <div className="h-10 bg-[#f6efe6] rounded-lg" />
              <div className="h-10 bg-[#f6efe6] rounded-lg" />
            </div>
          }>
            <SidebarNavList 
              items={items} 
              isCollapsed={sidebarCollapsed} 
              onExpand={() => setSidebarCollapsed(false)}
            />
          </Suspense>
        </div>

        {!sidebarCollapsed && branchName && (
          <div className="border-t border-slate-100/80 p-4">
            <div className="rounded-2xl border border-slate-100 bg-white/80 p-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Branch</p>
              <p className="mt-1 text-xs font-semibold text-slate-700 truncate">{branchName}</p>
            </div>
          </div>
        )}
      </aside>

      {/* ─── MOBILE DRAWER SIDEBAR ─── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-white border-r border-slate-100 shadow-2xl animate-fade-in-left">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/50 px-5 bg-white/50 backdrop-blur-md">
              <BrandLogo appName={appName} />
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <Suspense fallback={
                <div className="animate-pulse space-y-4 p-4">
                  <div className="h-10 bg-slate-100 rounded-lg" />
                  <div className="h-10 bg-slate-100 rounded-lg" />
                </div>
              }>
                <SidebarNavList items={items} onClose={() => setMobileSidebarOpen(false)} />
              </Suspense>
            </div>
          </aside>
        </div>
      )}

      {/* ─── MAIN CONTENT WRAPPER ─── */}
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300 relative z-10",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        {/* Sticky Header Top Navbar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,248,241,0.74))] backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.8),0_12px_30px_rgba(15,23,42,0.04)] px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Collapse toggle (desktop) */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex rounded-xl p-2 text-slate-400 transition-all duration-200 ease-out hover:bg-white hover:text-[#b75c16] hover:shadow-sm"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden rounded-xl p-2 text-slate-400 transition-all duration-200 ease-out hover:bg-white hover:text-[#b75c16] hover:shadow-sm"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 px-6 xl:flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#efd8bf] bg-[#fff6ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b75c16]">
              <PanelsTopLeft className="h-3.5 w-3.5" />
              {activeParentLabel ?? 'Portal'}
            </div>
            {activeLabel ? (
              <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                <span className="truncate font-medium text-slate-700">{activeLabel}</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-1.5 transition-all duration-200 ease-out hover:border-[#f0e3d2] hover:bg-white hover:shadow-sm focus:outline-none"
              >
                {userAvatar || (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#c96a22,#8a4a1d)] text-sm font-bold text-white shadow-sm shadow-[#c96a22]/10">
                    {userName?.[0]?.toUpperCase() ?? "A"}
                  </div>
                )}
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {userName ?? "Administrator"}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[120px]">
                    {branchName ?? "HQ Branch"}
                  </span>
                </div>
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", profileMenuOpen && "rotate-180")} />
                </button>
                
                {profileMenuOpen && (
                  <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-[#f0e3d2] bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.12)] z-50 animate-fade-in-up">
                    <div className="mb-4 flex items-center gap-3 border-b border-[#faf1e5] pb-4 xl:hidden">
                      {userAvatar || (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#c96a22,#8a4a1d)] text-sm font-bold text-white shadow-sm shadow-[#c96a22]/10">
                          {userName?.[0]?.toUpperCase() ?? "A"}
                        </div>
                      )}
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-slate-800 leading-tight">
                          {userName ?? "Administrator"}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {branchName ?? "HQ Branch"}
                        </span>
                      </div>
                    </div>
                    {aside && <div>{aside}</div>}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  );
}
