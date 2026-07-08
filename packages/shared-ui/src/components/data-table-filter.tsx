'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { SearchInput } from './search-input';
import { Select, type SelectOption } from './select';
import { FilterBar } from './filter-bar';
import { Button } from './button';
import { cn } from '../utils/cn';

export interface FilterOptionConfig {
  key: string;
  label: string;
  options: SelectOption[];
}

export interface DataTableFilterProps {
  searchPlaceholder?: string;
  filters?: FilterOptionConfig[];
}

export function DataTableFilter({
  searchPlaceholder = 'Search...',
  filters = [],
}: DataTableFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  const currentQ = searchParams.get('q') || '';
  const [searchValue, setSearchValue] = useState(currentQ);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // Debounced update to URL
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchValue !== (searchParams.get('q') || '')) {
        updateParams({ q: searchValue || null, page: '1' });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchValue, searchParams, updateParams]);

  return (
    <div className="mb-6 space-y-4">
      <FilterBar className="border-b border-[var(--ims-border)] pb-4 flex flex-col md:flex-row items-stretch md:items-end gap-4">
        <div className="flex-1 md:max-w-sm">
          <SearchInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClear={() => {
              setSearchValue('');
              updateParams({ q: null, page: '1' });
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          {filters.length > 0 && (
            <Button
              variant="secondary"
              className={cn(
                'md:hidden flex-1 justify-center',
                isExpanded &&
                  'bg-[var(--ims-brass-soft)] text-[var(--ims-brass)] border-[var(--ims-brass)]',
              )}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <X className="h-4 w-4 mr-2" />
              ) : (
                <SlidersHorizontal className="h-4 w-4 mr-2" />
              )}
              {isExpanded ? 'Hide Filters' : 'Filters'}
            </Button>
          )}

          <div className="hidden md:flex flex-row flex-wrap gap-4 items-end md:flex-1 md:justify-end">
            {filters.map((filter) => {
              const currentValue = searchParams.get(filter.key) || '';
              return (
                <div
                  key={filter.key}
                  className="flex flex-col gap-1 w-full sm:w-auto"
                >
                  <span className="text-[10px] font-bold text-[var(--ims-muted)] uppercase tracking-wider whitespace-nowrap">
                    {filter.label}
                  </span>
                  <Select
                    className="w-full sm:w-40 h-10"
                    value={currentValue}
                    onChange={(e) =>
                      updateParams({ [filter.key]: e.target.value, page: '1' })
                    }
                    options={[{ value: '', label: 'All' }, ...filter.options]}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </FilterBar>

      {/* Mobile Expanded Filters */}
      {isExpanded && filters.length > 0 && (
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-white border border-[var(--ims-border)] shadow-sm animate-in fade-in slide-in-from-top-2">
          {filters.map((filter) => {
            const currentValue = searchParams.get(filter.key) || '';
            return (
              <div key={filter.key} className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-[var(--ims-muted)] uppercase tracking-wider">
                  {filter.label}
                </span>
                <Select
                  className="w-full h-11"
                  value={currentValue}
                  onChange={(e) =>
                    updateParams({ [filter.key]: e.target.value, page: '1' })
                  }
                  options={[{ value: '', label: 'All' }, ...filter.options]}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
