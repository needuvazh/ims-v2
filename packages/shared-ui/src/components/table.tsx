import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

/** Server-compatible Table component system. */

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--ims-border)] bg-white/70 shadow-sm backdrop-blur-md transition-all duration-300">
      <div className="overflow-x-auto">
        <table
          className={cn('w-full border-collapse bg-white/40 text-sm', className)}
          {...props}
        />
      </div>
    </div>
  );
}

export function TableCaption({ className, ...props }: HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={cn('mb-2 text-sm text-[color:var(--ims-muted)]', className)}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-[color:var(--ims-border)]',
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn('divide-y divide-[color:var(--ims-border)]', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('transition-all hover:bg-indigo-50/30 hover:scale-[1.002] duration-200', className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left font-semibold text-[color:var(--ims-muted)]',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-3 text-[color:var(--ims-ink)]', className)}
      {...props}
    />
  );
}

/** Loading, Empty, Error states */

export function TableLoadingState({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-[color:var(--ims-border)]">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded-full bg-[color:var(--ims-border)]" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function TableEmptyState({
  colSpan = 5,
  message = 'No records found.',
}: {
  colSpan?: number;
  message?: string;
}) {
  return (
    <tbody>
      <tr>
        <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-[color:var(--ims-muted)]">
          {message}
        </td>
      </tr>
    </tbody>
  );
}

export function TableErrorState({
  colSpan = 5,
  message = 'Failed to load data.',
}: {
  colSpan?: number;
  message?: string;
}) {
  return (
    <tbody>
      <tr>
        <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-[color:var(--ims-error)]">
          {message}
        </td>
      </tr>
    </tbody>
  );
}

/** Legacy named exports for backward compat */
export { TableHead as TableHeaderCell };
