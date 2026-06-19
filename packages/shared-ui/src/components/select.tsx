'use client';

import { forwardRef, type SelectHTMLAttributes, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  helperText?: string;
  errorText?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, placeholder, options, helperText, errorText, id, required, disabled, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;
    const hasError = Boolean(errorText);

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-[color:var(--ims-ink)]">
            {label}
            {required && (
              <span className="ml-1 text-[color:var(--ims-error)]" aria-hidden="true">*</span>
            )}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            className={cn(
              'h-11 w-full appearance-none rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] pl-4 pr-10 text-sm text-[color:var(--ims-ink)] shadow-sm outline-none transition-all focus:border-[color:var(--ims-brass)] focus:ring-2 focus:ring-[color:var(--ims-brass-soft)] disabled:cursor-not-allowed disabled:opacity-50',
              hasError && 'border-[color:var(--ims-error)] focus:ring-[color:var(--ims-error)]/20',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ims-muted)]"
            aria-hidden="true"
          />
        </div>
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

Select.displayName = 'Select';

export { Select };
