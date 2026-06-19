import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const linkButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ims-paper)] active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-[color:var(--ims-ink)] text-[color:var(--ims-paper)] shadow-[0_4px_14px_rgba(20,33,61,0.25)] hover:bg-[color:var(--ims-brass)] hover:shadow-[0_4px_14px_rgba(196,125,70,0.35)]',
        secondary:
          'border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] text-[color:var(--ims-ink)] hover:border-[color:var(--ims-ink)]',
        outline:
          'border border-[color:var(--ims-brass)] bg-transparent text-[color:var(--ims-brass)] hover:bg-[color:var(--ims-accent-soft)]',
        ghost:
          'bg-transparent text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)]',
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
