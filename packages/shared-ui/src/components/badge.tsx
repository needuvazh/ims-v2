import type { PropsWithChildren } from 'react';
import { classNames } from '../utils/classnames';

export function Badge({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border border-[color:var(--ims-border)] bg-[color:var(--ims-accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ims-ink)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
