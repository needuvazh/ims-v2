import type { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

/**
 * Generic layout wrapper for filters, search bars, and action areas.
 * Server-compatible — children manage their own interactivity.
 */
export function FilterBar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3',
        className,
      )}
      {...props}
    />
  );
}
