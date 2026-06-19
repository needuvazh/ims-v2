'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ims-paper)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-[color:var(--ims-ink)] text-[color:var(--ims-paper)] shadow-[0_4px_14px_rgba(20,33,61,0.25)] hover:bg-[color:var(--ims-brass)] hover:shadow-[0_4px_14px_rgba(196,125,70,0.35)]',
        secondary:
          'border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] text-[color:var(--ims-ink)] hover:border-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)]',
        destructive:
          'bg-[color:var(--ims-error)] text-white shadow-sm hover:bg-red-700',
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

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
