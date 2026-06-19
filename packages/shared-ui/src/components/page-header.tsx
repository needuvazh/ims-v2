import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
}

/** Server-compatible Page Header. */
export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-[color:var(--ims-border)] pb-6 lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
      {...props}
    >
      <div className="space-y-2">
        {breadcrumbs && <div>{breadcrumbs}</div>}
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--ims-muted)]">
            {eyebrow}
          </p>
        )}
        <h1 className="font-[family-name:var(--font-display,serif)] text-3xl tracking-tight text-[color:var(--ims-ink)] sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-6 text-[color:var(--ims-muted)] sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
