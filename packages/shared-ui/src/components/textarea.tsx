'use client';

import { forwardRef, type TextareaHTMLAttributes, useId } from 'react';
import { cn } from '../utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  resizable?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, helperText, errorText, resizable = true, id, required, disabled, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;
    const hasError = Boolean(errorText);

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-[color:var(--ims-ink)]">
            {label}
            {required && (
              <span className="ml-1 text-[color:var(--ims-error)]" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          required={required}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          className={cn(
            'min-h-[100px] w-full rounded-md border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-4 py-3 text-sm text-[color:var(--ims-ink)] shadow-sm outline-none transition-all placeholder:text-[color:var(--ims-muted)] focus:border-[color:var(--ims-brass)] focus:ring-2 focus:ring-[color:var(--ims-brass-soft)] disabled:cursor-not-allowed disabled:opacity-50',
            !resizable && 'resize-none',
            hasError && 'border-[color:var(--ims-error)] focus:border-[color:var(--ims-error)] focus:ring-[color:var(--ims-error)]/20',
            className,
          )}
          {...props}
        />
        {helperText && !hasError && (
          <p id={helperId} className="text-xs text-[color:var(--ims-muted)]">{helperText}</p>
        )}
        {hasError && (
          <p id={errorId} role="alert" className="text-xs text-[color:var(--ims-error)]">{errorText}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export { Textarea };
