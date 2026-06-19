'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      errorText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      id,
      required,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;
    const hasError = Boolean(errorText);

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[color:var(--ims-ink)]"
          >
            {label}
            {required && (
              <span className="ml-1 text-[color:var(--ims-error)]" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span
              className="pointer-events-none absolute left-3 text-[color:var(--ims-muted)]"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              'h-11 w-full rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-4 text-sm text-[color:var(--ims-ink)] shadow-sm outline-none transition-all placeholder:text-[color:var(--ims-muted)] focus:border-[color:var(--ims-brass)] focus:ring-2 focus:ring-[color:var(--ims-brass-soft)] disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              hasError &&
                'border-[color:var(--ims-error)] focus:border-[color:var(--ims-error)] focus:ring-[color:var(--ims-error)]/20',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span
              className="absolute right-3 text-[color:var(--ims-muted)]"
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </div>
        {helperText && !hasError && (
          <p id={helperId} className="text-xs text-[color:var(--ims-muted)]">
            {helperText}
          </p>
        )}
        {hasError && (
          <p id={errorId} role="alert" className="text-xs text-[color:var(--ims-error)]">
            {errorText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
