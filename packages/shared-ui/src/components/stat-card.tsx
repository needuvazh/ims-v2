import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Skeleton } from './skeleton';

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: ReactNode;
  description?: string;
  trend?: { value: number; label?: string };
  icon?: ReactNode;
  loading?: boolean;
}

/** Server-compatible dashboard stat card. */
export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  loading,
  className,
  ...props
}: StatCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'rounded-[28px] border border-[color:var(--ims-border)] bg-white/80 backdrop-blur-xl p-6',
          className,
        )}
        {...props}
      >
        <Skeleton className="mb-3 h-3 w-24" />
        <Skeleton className="mb-2 h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  const isPositive = trend ? trend.value >= 0 : null;

  return (
    <div
      className={cn(
        'rounded-[28px] border border-[color:var(--ims-border)] bg-white/80 backdrop-blur-xl p-6 transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_16px_48px_rgba(20,33,61,0.12)] group',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            {title}
          </p>
          <p className="mt-2 font-[family-name:var(--font-display,serif)] text-3xl font-semibold tracking-tight text-[color:var(--ims-ink)]">
            {value}
          </p>
          {(description || trend) && (
            <div className="mt-2 flex items-center gap-2">
              {trend && (
                <span
                  className={cn(
                    'text-xs font-semibold',
                    isPositive
                      ? 'text-[color:var(--ims-success)]'
                      : 'text-[color:var(--ims-error)]',
                  )}
                >
                  {isPositive ? '+' : ''}{trend.value}%
                  {trend.label && (
                    <span className="ml-1 font-normal text-[color:var(--ims-muted)]">
                      {trend.label}
                    </span>
                  )}
                </span>
              )}
              {description && (
                <p className="text-xs text-[color:var(--ims-muted)]">{description}</p>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)] transition-transform duration-500 group-hover:scale-110">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
