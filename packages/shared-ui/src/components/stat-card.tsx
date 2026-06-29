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
  tone?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'orange' | 'rose' | 'teal' | 'violet';
}

const dashboardStatTones = {
  indigo: {
    card: 'border-indigo-300/85 bg-gradient-to-br from-indigo-50 via-indigo-100 to-indigo-200/85',
    badge: 'border-indigo-300/80 bg-indigo-50/95',
    icon: 'text-indigo-700',
    eyebrow: 'text-indigo-800/90',
    note: 'text-indigo-950/70',
    glow: 'bg-gradient-to-r from-transparent via-indigo-400/90 to-transparent',
  },
  emerald: {
    card: 'border-emerald-300/85 bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-200/80',
    badge: 'border-emerald-300/80 bg-emerald-50/95',
    icon: 'text-emerald-700',
    eyebrow: 'text-emerald-800/90',
    note: 'text-emerald-950/70',
    glow: 'bg-gradient-to-r from-transparent via-emerald-400/90 to-transparent',
  },
  amber: {
    card: 'border-amber-300/85 bg-gradient-to-br from-amber-50 via-amber-100 to-orange-200/80',
    badge: 'border-amber-300/80 bg-amber-50/95',
    icon: 'text-amber-700',
    eyebrow: 'text-amber-800/90',
    note: 'text-amber-950/70',
    glow: 'bg-gradient-to-r from-transparent via-amber-400/90 to-transparent',
  },
  violet: {
    card: 'border-violet-300/85 bg-gradient-to-br from-violet-50 via-violet-100 to-fuchsia-200/75',
    badge: 'border-violet-300/80 bg-violet-50/95',
    icon: 'text-violet-700',
    eyebrow: 'text-violet-800/90',
    note: 'text-violet-950/70',
    glow: 'bg-gradient-to-r from-transparent via-violet-400/90 to-transparent',
  },
  sky: {
    card: 'border-sky-300/85 bg-gradient-to-br from-sky-50 via-sky-100 to-cyan-200/80',
    badge: 'border-sky-300/80 bg-sky-50/95',
    icon: 'text-sky-700',
    eyebrow: 'text-sky-800/90',
    note: 'text-sky-950/70',
    glow: 'bg-gradient-to-r from-transparent via-sky-400/90 to-transparent',
  },
  teal: {
    card: 'border-teal-300/85 bg-gradient-to-br from-teal-50 via-teal-100 to-emerald-200/80',
    badge: 'border-teal-300/80 bg-teal-50/95',
    icon: 'text-teal-700',
    eyebrow: 'text-teal-800/90',
    note: 'text-teal-950/70',
    glow: 'bg-gradient-to-r from-transparent via-teal-400/90 to-transparent',
  },
  orange: {
    card: 'border-orange-300/85 bg-gradient-to-br from-orange-50 via-orange-100 to-amber-200/80',
    badge: 'border-orange-300/80 bg-orange-50/95',
    icon: 'text-orange-700',
    eyebrow: 'text-orange-800/90',
    note: 'text-orange-950/70',
    glow: 'bg-gradient-to-r from-transparent via-orange-400/90 to-transparent',
  },
  rose: {
    card: 'border-rose-300/85 bg-gradient-to-br from-rose-50 via-rose-100 to-pink-200/75',
    badge: 'border-rose-300/80 bg-rose-50/95',
    icon: 'text-rose-700',
    eyebrow: 'text-rose-800/90',
    note: 'text-rose-950/70',
    glow: 'bg-gradient-to-r from-transparent via-rose-400/90 to-transparent',
  },
} as const;

/** Server-compatible dashboard stat card. */
export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  loading,
  tone,
  className,
  ...props
}: StatCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] backdrop-blur-xl p-6',
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
  const toneData = tone ? dashboardStatTones[tone] : null;

  if (toneData) {
    return (
      <div
        className={cn(
          'group relative overflow-hidden rounded-2xl border p-5 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.34)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-30px_rgba(15,23,42,0.38)]',
          toneData.card,
          className,
        )}
        {...props}
      >
        <div className={cn('pointer-events-none absolute inset-x-6 top-0 h-px', toneData.glow)} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className={cn('text-[10px] font-black uppercase tracking-[0.28em]', toneData.eyebrow)}>
              {title}
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              {value}
            </p>
            {(description || trend) && (
              <div className={cn('mt-2 text-xs font-semibold', toneData.note)}>
                {trend && (
                  <span className="mr-1.5">
                    {isPositive ? '+' : ''}{trend.value}%
                  </span>
                )}
                {description && <span>{description}</span>}
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('rounded-xl border p-3 shadow-sm shadow-white/40 flex items-center justify-center shrink-0', toneData.badge)}>
              <div className={cn('h-5 w-5 flex items-center justify-center', toneData.icon)}>
                {icon}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] backdrop-blur-xl p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(16,36,58,0.10)] group',
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--ims-brass-soft)] text-[color:var(--ims-brass)] transition-transform duration-500 group-hover:scale-110">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
