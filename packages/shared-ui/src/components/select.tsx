'use client';

import { forwardRef, type SelectHTMLAttributes, useId, useState, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import * as Popover from '@radix-ui/react-popover';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'defaultValue'> {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  helperText?: string;
  errorText?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, placeholder, options, helperText, errorText, id, required, disabled, value: controlledValue, defaultValue, onChange, onValueChange, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;
    const hasError = Boolean(errorText);

    const isControlled = controlledValue !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');
    const value = isControlled ? controlledValue : uncontrolledValue;

    // Sync uncontrolled value if defaultValue changes (e.g., when React reuses the component instance)
    const prevDefaultValueRef = useRef(defaultValue);
    if (defaultValue !== prevDefaultValueRef.current) {
      prevDefaultValueRef.current = defaultValue;
      setUncontrolledValue(defaultValue ?? '');
    }

    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Native select ref to trigger events if necessary
    const internalSelectRef = useRef<HTMLSelectElement>(null);
    const setRefs = (node: HTMLSelectElement) => {
      internalSelectRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const selectedOption = options.find((opt) => String(opt.value) === String(value));

    const filteredOptions = options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (selectedValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(selectedValue);
      }
      onValueChange?.(selectedValue);
      setOpen(false);
      setSearchQuery('');

      // Dispatch native event so that React Hook Form or standard onChange listeners catch it
      if (internalSelectRef.current) {
        internalSelectRef.current.value = selectedValue;
        const event = new Event('change', { bubbles: true });
        internalSelectRef.current.dispatchEvent(event);
        // Note: onChange will be triggered by the native select's onChange handler
      }
    };

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
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
                className={cn(
                  'flex h-11 w-full items-center justify-between rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-4 text-sm text-[color:var(--ims-ink)] shadow-[0_8px_24px_rgba(16,36,58,0.04)] outline-none transition-all focus:border-[color:var(--ims-brass)] focus:ring-2 focus:ring-[color:var(--ims-brass-soft)] disabled:cursor-not-allowed disabled:opacity-50 text-left',
                  hasError && 'border-[color:var(--ims-error)] focus:ring-[rgba(185,28,28,0.2)]',
                  !selectedOption && 'text-[color:var(--ims-muted)]',
                  className,
                )}
              >
                <span className="truncate">
                  {selectedOption ? selectedOption.label : placeholder || 'Select an option'}
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
                className="z-50 w-[var(--radix-popover-trigger-width)] rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-1 shadow-[0_18px_40px_rgba(16,36,58,0.12)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
              >
                <div className="flex items-center border-b border-[color:var(--ims-border)] px-3 pb-2 pt-2 mb-1">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    type="text"
                    className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-[color:var(--ims-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filteredOptions.length > 0) {
                          handleSelect(filteredOptions[0].value);
                        }
                      }
                    }}
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  {filteredOptions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-[color:var(--ims-muted)]">
                      No options found.
                    </div>
                  ) : (
                    filteredOptions.map((option) => (
                      <div
                        key={option.value}
                        onClick={() => {
                          if (!option.disabled) {
                            handleSelect(option.value);
                          }
                        }}
                        className={cn(
                          'relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none transition-colors',
                          option.disabled 
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-[color:var(--ims-background)] hover:text-[color:var(--ims-ink)]',
                          String(value) === String(option.value) && 'bg-[color:var(--ims-background)] font-medium'
                        )}
                      >
                        {String(value) === String(option.value) && (
                          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                        <span className="truncate">{option.label}</span>
                      </div>
                    ))
                  )}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* Hidden native select for form submission and HTML5 validation */}
          <select
            ref={setRefs}
            id={selectId}
            required={required}
            disabled={disabled}
            value={value}
            onChange={(e) => {
              if (!isControlled) setUncontrolledValue(e.target.value);
              onChange?.(e);
            }}
            className="absolute left-0 top-0 h-full w-full opacity-0 pointer-events-none"
            tabIndex={-1}
            aria-hidden="true"
            {...props}
          >
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
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
