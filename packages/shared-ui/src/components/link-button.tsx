import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const linkButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ims-background)] active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-[color:var(--ims-ink)] text-[color:var(--ims-surface)] shadow-[0_14px_30px_rgba(16,36,58,0.18)] hover:bg-[color:var(--ims-brass)] hover:shadow-[0_16px_34px_rgba(227,101,38,0.18)]',
        secondary:
          'border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] text-[color:var(--ims-ink)] shadow-sm hover:border-[color:var(--ims-brass)]',
        outline:
          'border border-[color:var(--ims-brass)] bg-transparent text-[color:var(--ims-brass)] hover:bg-[color:var(--ims-brass-soft)]',
        ghost:
          'bg-transparent text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)] hover:text-[color:var(--ims-brass)]',
        link:
          'underline-offset-4 text-[color:var(--ims-brass)] hover:underline rounded-none',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface LinkButtonProps
  extends Omit<ComponentProps<typeof Link>, 'className'>,
    VariantProps<typeof linkButtonVariants> {
  className?: string;
}

/** Server-compatible button-style link using Next.js Link. */
export function LinkButton({ className, variant, size, children, ...props }: LinkButtonProps) {
  return (
    <Link className={cn(linkButtonVariants({ variant, size }), className)} {...props}>
      {children}
    </Link>
  );
}
