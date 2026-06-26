'use client';

import { forwardRef, type InputHTMLAttributes, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, onChange, ...props }, ref) => {
    const hasValue = Boolean(value);

    const handleClear = useCallback(() => {
      onClear?.();
    }, [onClear]);

    return (
      <div className={cn('relative flex items-center', className)}>
        <Search
          className="pointer-events-none absolute left-3 h-4 w-4 text-[color:var(--ims-muted)]"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={onChange}
          className="h-10 w-full rounded-md border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] pl-9 pr-9 text-sm text-[color:var(--ims-ink)] shadow-sm outline-none transition-all placeholder:text-[color:var(--ims-muted)] focus:border-[color:var(--ims-brass)] focus:ring-2 focus:ring-[color:var(--ims-brass-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-3 rounded-full text-[color:var(--ims-muted)] transition-colors hover:text-[color:var(--ims-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';

export { SearchInput };
