'use client';

import { useId } from 'react';
import { cn } from '../utils/cn';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  label?: string;
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  errorText?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  errorText,
  disabled,
  className,
}: RadioGroupProps) {
  const groupId = useId();
  const errorId = `${groupId}-error`;
  const hasError = Boolean(errorText);

  return (
    <fieldset
      className={cn('flex flex-col gap-2', className)}
      aria-describedby={hasError ? errorId : undefined}
    >
      {label && (
        <legend className="mb-1 text-sm font-medium text-[color:var(--ims-ink)]">{label}</legend>
      )}
      {options.map((option) => {
        const optionId = `${groupId}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={optionId}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-3 transition-all hover:border-[color:var(--ims-brass)] hover:bg-[color:var(--ims-accent-soft)]',
              value === option.value && 'border-[color:var(--ims-brass)] bg-[color:var(--ims-accent-soft)]',
              (disabled || option.disabled) && 'cursor-not-allowed opacity-50 hover:border-[color:var(--ims-border)] hover:bg-[color:var(--ims-surface)]',
            )}
          >
            <input
              type="radio"
              id={optionId}
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={disabled || option.disabled}
              onChange={() => onChange?.(option.value)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-[color:var(--ims-brass)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2 disabled:cursor-not-allowed"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[color:var(--ims-ink)]">{option.label}</span>
              {option.description && (
                <span className="text-xs text-[color:var(--ims-muted)]">{option.description}</span>
              )}
            </div>
          </label>
        );
      })}
      {hasError && (
        <p id={errorId} role="alert" className="text-xs text-[color:var(--ims-error)]">
          {errorText}
        </p>
      )}
    </fieldset>
  );
}
