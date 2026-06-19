import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

/**
 * Reusable FormField primitives.
 * Works well with React Hook Form — pass errors and register props to children directly.
 * Does NOT tightly couple to React Hook Form.
 */

export function FormField({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

export function FormLabel({
  required,
  htmlFor,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLLabelElement> & { required?: boolean; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-sm font-medium text-[color:var(--ims-ink)]', className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-[color:var(--ims-error)]" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

export function FormControl({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative', className)} {...props} />;
}

export function FormDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-[color:var(--ims-muted)]', className)} {...props} />
  );
}

export function FormError({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn('text-xs text-[color:var(--ims-error)]', className)}
      {...props}
    >
      {children}
    </p>
  );
}
