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
        'flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-section-gap',
        className,
      )}
      {...props}
    />
  );
}
