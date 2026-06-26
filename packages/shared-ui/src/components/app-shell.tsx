'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense, type ReactNode } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '../utils/cn';

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  current?: boolean;
  items?: NavItem[];
  category?: string;
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30">
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
  const searchParams = useSearchParams();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const isItemActive = (href: string) => {
    const [itemPath] = href.split('?');
    return pathname === itemPath;
  };

  const isParentActive = (item: NavItem) => {
    const [itemPath] = item.href.split('?');
    if (pathname === itemPath && !item.items) return true;
    if (item.items) {
      return item.items.some((subItem) => isItemActive(subItem.href));
    }
    return pathname === itemPath;
  };

  // Group items by category
  const categories: Record<string, NavItem[]> = {};
  items.forEach((item) => {
    const cat = item.category || 'System';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  });

  useEffect(() => {
    items.forEach((item) => {
      if (item.items && isParentActive(item)) {
        setExpandedItems((prev) => ({ ...prev, [item.href]: true }));
      }
    });
  }, [pathname, items]);

  return (
    <div className="space-y-6">
      {Object.entries(categories).map(([categoryName, catItems]) => (
        <div key={categoryName} className="space-y-1.5">
          {!isCollapsed ? (
            <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
              {categoryName}
            </p>
          ) : (
            <div className="mx-4 my-2 border-t border-slate-100" />
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
                          'group flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300',
                          isActive
                            ? 'bg-white/80 text-violet-700 font-bold border border-white shadow-sm'
                            : 'text-slate-600 hover:bg-white/60 hover:text-violet-700',
                          isCollapsed && 'justify-center px-0'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon && (
                            <span
                              className={cn(
                                'h-5 w-5 shrink-0 transition-transform duration-300',
                                isActive ? 'text-violet-600' : 'text-slate-400 group-hover:text-violet-600 group-hover:scale-110'
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
                              'h-4 w-4 text-slate-400 transition-transform duration-300',
                              isExpanded && 'rotate-180'
                            )}
                          />
                        )}
                      </button>

                      {isExpanded && !isCollapsed && (
                        <ul className="mt-1 ml-6 border-l border-slate-100 pl-3 space-y-1">
                          {item.items!.map((subItem) => {
                            const isSubActive = isItemActive(subItem.href);
                            return (
                              <li key={subItem.href}>
                                <Link
                                  href={subItem.href}
                                  onClick={onClose}
                                  className={cn(
                                    'group flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-300',
                                    isSubActive
                                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-500/15'
                                      : 'text-slate-500 hover:text-violet-700 hover:bg-white/60 hover:translate-x-1',
                                  )}
                                >
                                  {subItem.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300',
                        isActive
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-500/20'
                          : 'text-slate-600 hover:bg-white/60 hover:text-violet-700 hover:translate-x-1',
                        isCollapsed && 'justify-center px-0 hover:translate-x-0'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.icon && (
                        <span
                          className={cn(
                            'h-5 w-5 shrink-0 transition-transform duration-300',
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-violet-600 group-hover:scale-110'
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

  return (
    <div className={cn("min-h-screen bg-[#f8f7fb] text-[color:var(--ims-ink)] relative overflow-hidden", className)}>
      {/* Background Effect Layer */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay pointer-events-none z-0" />
      <div className="absolute -top-[10%] -right-[5%] h-[600px] w-[600px] rounded-full bg-fuchsia-400/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[0%] -left-[10%] h-[700px] w-[700px] rounded-full bg-violet-400/20 blur-[120px] pointer-events-none z-0" />

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden h-screen border-r border-white/60 bg-white/70 backdrop-blur-2xl transition-all duration-300 lg:flex lg:flex-col",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-slate-50 px-5">
          <BrandLogo appName={appName} isCollapsed={sidebarCollapsed} />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Suspense fallback={
            <div className="animate-pulse space-y-4 p-4">
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-100 rounded-lg" />
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
          <div className="border-t border-slate-50 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">{branchName}</p>
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
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/60 bg-white/60 backdrop-blur-xl shadow-sm px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Collapse toggle (desktop) */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-3 pl-4 py-1.5 focus:outline-none rounded-lg hover:bg-slate-50 transition-colors"
              >
                {userAvatar || (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white shadow-sm shadow-slate-900/10">
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
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-100 bg-white p-4 shadow-xl z-50 animate-fade-in-up">
                    <div className="mb-4 flex items-center gap-3 border-b border-slate-50 pb-4 xl:hidden">
                      {userAvatar || (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white shadow-sm shadow-slate-900/10">
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
