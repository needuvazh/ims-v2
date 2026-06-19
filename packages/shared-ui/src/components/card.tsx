import type { PropsWithChildren } from 'react';
import { classNames } from '../utils/classnames';

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={classNames(
        'rounded-[28px] border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-6 shadow-[0_10px_30px_rgba(17,24,39,0.06)]',
        className,
      )}
    >
      {children}
    </section>
  );
}
