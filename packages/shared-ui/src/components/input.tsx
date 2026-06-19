import type { InputHTMLAttributes } from 'react';
import { classNames } from '../utils/classnames';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={classNames(
        'h-11 w-full rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-4 text-sm text-[color:var(--ims-ink)] shadow-sm outline-none transition placeholder:text-[color:var(--ims-muted)] focus:border-[color:var(--ims-brass)] focus:ring-2 focus:ring-[color:var(--ims-brass-soft)]',
        className,
      )}
      {...props}
    />
  );
}
