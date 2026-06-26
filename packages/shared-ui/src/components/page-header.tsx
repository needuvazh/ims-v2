import type { HTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';

export interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  backUrl?: string;
}

/** Server-compatible Page Header with entrance animations. */
export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  backUrl,
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
        {breadcrumbs && <div className="animate-fade-in-down">{breadcrumbs}</div>}
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--ims-muted)] animate-fade-in-right">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-4 animate-fade-in-up">
          {backUrl && (
            <Link href={backUrl} aria-label="Go back">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-[color:var(--ims-border)]">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <h1 className="font-[family-name:var(--font-display,serif)] text-3xl tracking-tight text-[color:var(--ims-ink)] sm:text-4xl">
            {title}
          </h1>
        </div>
        {description && (
          <p className="max-w-2xl text-sm leading-6 text-[color:var(--ims-muted)] sm:text-base animate-fade-in-up delay-100">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3 animate-fade-in-left delay-200">{actions}</div>}
    </header>
  );
}
