'use client';

import {
  useState,
  useMemo,
  useId,
} from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import * as Popover from '@radix-ui/react-popover';

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  required?: boolean;
  disabled?: boolean;
  errorText?: string;
  helperText?: string;
  className?: string;
}

export function MultiSelect({
  label,
  placeholder = 'Select options',
  options,
  value = [],
  onValueChange,
  required,
  disabled,
  errorText,
  helperText,
  className,
}: MultiSelectProps) {
  const selectId = useId();
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
  const hasError = Boolean(errorText);

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  const selectedLabels = useMemo(() => {
    const selected = options.filter((opt) => value.includes(opt.value));
    if (selected.length === 0) return '';
    if (selected.length <= 2) {
      return selected.map((opt) => opt.label).join(', ');
    }
    return `${selected.length} items selected`;
  }, [options, value]);

  const handleToggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onValueChange(value.filter((val) => val !== optValue));
    } else {
      onValueChange([...value, optValue]);
    }
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-[color:var(--ims-ink)]"
        >
          {label}
          {required && (
            <span
              className="ml-1 text-[color:var(--ims-error)]"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              id={selectId}
              type="button"
              disabled={disabled}
              aria-invalid={hasError}
              aria-describedby={
                hasError ? errorId : helperText ? helperId : undefined
              }
              className={cn(
                'flex h-11 w-full items-center justify-between rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-4 text-sm text-[color:var(--ims-ink)] shadow-[0_8px_24px_rgba(16,36,58,0.04)] outline-none transition-all focus:border-[color:var(--ims-brass)] focus:ring-2 focus:ring-[color:var(--ims-brass-soft)] disabled:cursor-not-allowed disabled:opacity-50 text-left',
                hasError &&
                  'border-[color:var(--ims-error)] focus:ring-[rgba(185,28,28,0.2)]',
                value.length === 0 && 'text-[color:var(--ims-muted)]',
                className,
              )}
            >
              <span className="truncate">
                {selectedLabels || placeholder}
              </span>
              <ChevronDown
                className="h-4 w-4 text-[color:var(--ims-muted)] flex-shrink-0 ml-2"
                aria-hidden="true"
              />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              className="z-50 w-[var(--radix-popover-trigger-width)] rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-1 shadow-[0_18px_40px_rgba(16,36,58,0.12)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
              style={{ width: 'var(--radix-popover-trigger-width)' }}
            >
              <div className="flex items-center border-b border-[color:var(--ims-border)] px-3 pb-2 pt-2 mb-1">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  type="text"
                  className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--ims-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-[240px] overflow-y-auto p-1 scrollbar-thin">
                {filteredOptions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[color:var(--ims-muted)]">
                    No options found.
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isChecked = value.includes(option.value);
                    return (
                      <div
                        key={option.value}
                        onClick={() => {
                          if (!option.disabled) {
                            handleToggle(option.value);
                          }
                        }}
                        className={cn(
                          'relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none transition-colors cursor-pointer hover:bg-[color:var(--ims-background)] hover:text-[color:var(--ims-ink)]',
                          option.disabled && 'opacity-50 cursor-not-allowed',
                          isChecked && 'bg-[color:var(--ims-background)] font-medium',
                        )}
                      >
                        <span className="absolute left-2 flex h-4 w-4 items-center justify-center border border-[color:var(--ims-border)] rounded bg-white text-[color:var(--ims-brass)]">
                          {isChecked && <Check className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{option.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      {helperText && !hasError && (
        <p id={helperId} className="text-xs text-[color:var(--ims-muted)]">
          {helperText}
        </p>
      )}
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-[color:var(--ims-error)]"
        >
          {errorText}
        </p>
      )}
    </div>
  );
}
