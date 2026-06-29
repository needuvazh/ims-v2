import Link from 'next/link';
import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '../utils/cn';

type NavigationItem = {
  href: string;
  label: string;
  current?: boolean;
};

/** @deprecated Use AppShell which includes its own sidebar navigation. */
export function SidebarNav({ items }: { items: NavigationItem[] }) {
  return (
    <nav aria-label="Sidebar navigation" className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'block rounded-2xl px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2',
            item.current
              ? 'bg-[linear-gradient(135deg,var(--ims-ink),#16314c)] text-[color:var(--ims-surface)] shadow-[0_10px_24px_rgba(16,36,58,0.16)]'
              : 'text-[color:var(--ims-muted)] hover:bg-[color:var(--ims-accent-soft)] hover:text-[color:var(--ims-brass)]',
          )}
          aria-current={item.current ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** @deprecated Use PageHeader from page-header.tsx */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[color:var(--ims-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--ims-muted)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[color:var(--ims-ink)] sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-[color:var(--ims-muted)] sm:text-base">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}

export function StatusRail({ children }: PropsWithChildren) {
  return (
    <div className="rounded-full border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--ims-muted)] shadow-sm">
      {children}
    </div>
  );
}
