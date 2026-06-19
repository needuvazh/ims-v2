import type { PropsWithChildren } from 'react';
import { classNames } from '../utils/classnames';

export function Table({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={classNames('overflow-hidden rounded-[24px] border border-[color:var(--ims-border)]', className)}>
      <table className="w-full border-collapse bg-[color:var(--ims-surface)]">{children}</table>
    </div>
  );
}

export function TableHead({ children }: PropsWithChildren) {
  return (
    <thead className="bg-[color:var(--ims-accent-soft)] text-xs uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
      {children}
    </thead>
  );
}

export function TableBody({ children }: PropsWithChildren) {
  return <tbody className="divide-y divide-[color:var(--ims-border)]">{children}</tbody>;
}

export function TableRow({ children }: PropsWithChildren) {
  return <tr className="transition hover:bg-[color:var(--ims-accent-soft)]/40">{children}</tr>;
}

export function TableCell({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <td className={classNames('px-4 py-3 text-sm text-[color:var(--ims-ink)]', className)}>
      {children}
    </td>
  );
}

export function TableHeaderCell({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <th className={classNames('px-4 py-3 text-left font-semibold', className)}>
      {children}
    </th>
  );
}
