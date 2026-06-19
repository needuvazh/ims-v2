'use client';

import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import { cn } from '../utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  errorText?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, errorText, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;
    const errorId = `${checkboxId}-error`;
    const hasError = Boolean(errorText);

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-3">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            className={cn(
              'mt-0.5 h-4 w-4 cursor-pointer rounded border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] text-[color:var(--ims-brass)] accent-[color:var(--ims-brass)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              hasError && 'border-[color:var(--ims-error)]',
              className,
            )}
            {...props}
          />
          {(label || description) && (
            <div className="flex flex-col gap-0.5">
              {label && (
                <label
                  htmlFor={checkboxId}
                  className={cn(
                    'cursor-pointer text-sm font-medium text-[color:var(--ims-ink)]',
                    disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  {label}
                </label>
              )}
              {description && (
                <p className="text-xs text-[color:var(--ims-muted)]">{description}</p>
              )}
            </div>
          )}
        </div>
        {hasError && (
          <p id={errorId} role="alert" className="text-xs text-[color:var(--ims-error)]">
            {errorText}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
