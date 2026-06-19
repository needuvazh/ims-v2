import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { classNames } from '../utils/classnames';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
  }
>;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[color:var(--ims-ink)] text-[color:var(--ims-paper)] shadow-[0_8px_24px_rgba(10,16,30,0.14)] hover:bg-[color:var(--ims-brass)] hover:text-[color:var(--ims-ink)]',
  secondary:
    'border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] text-[color:var(--ims-ink)] hover:border-[color:var(--ims-ink)]',
  ghost:
    'bg-transparent text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)]',
};

export function Button({ className, variant = 'primary', children, ...props }: ButtonProps) {
  return (
    <button
      className={classNames(
        'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ims-paper)] disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
