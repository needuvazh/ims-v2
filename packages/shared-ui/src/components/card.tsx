import React from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

/** Server-compatible Card primitives. */

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] shadow-[0_12px_35px_rgba(16,36,58,0.06)] backdrop-blur-xl transition-all duration-300 ease-out group hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(16,36,58,0.10)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 border-b border-[color:var(--ims-border)] p-5 sm:p-6', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'font-[family-name:var(--font-display,serif)] text-xl font-semibold tracking-tight text-[color:var(--ims-ink)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-[color:var(--ims-muted)]', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 sm:p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center border-t border-[color:var(--ims-border)] p-5 sm:p-6',
        className,
      )}
      {...props}
    />
  );
}
