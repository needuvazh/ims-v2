import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors',
  {
    variants: {
      variant: {
        default:
          'border border-[color:var(--ims-border)] bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-ink)]',
        success:
          'border border-[color:var(--ims-success-border)] bg-[color:var(--ims-success-bg)] text-[color:var(--ims-success)]',
        warning:
          'border border-[color:var(--ims-warning-border)] bg-[color:var(--ims-warning-bg)] text-[color:var(--ims-warning)]',
        error:
          'border border-[color:var(--ims-error-border)] bg-[color:var(--ims-error-bg)] text-[color:var(--ims-error)]',
        info:
          'border border-[color:var(--ims-info-border)] bg-[color:var(--ims-info-bg)] text-[color:var(--ims-info)]',
        outline:
          'border border-[color:var(--ims-border)] bg-transparent text-[color:var(--ims-ink)]',
        muted:
          'border border-transparent bg-[color:var(--ims-border)] text-[color:var(--ims-muted)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** Server-compatible Badge component. */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
