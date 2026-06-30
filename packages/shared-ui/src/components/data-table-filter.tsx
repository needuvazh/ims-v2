'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SearchInput } from './search-input';
import { Select, type SelectOption } from './select';
import { FilterBar } from './filter-bar';

export interface FilterOptionConfig {
  key: string;
  label: string;
  options: SelectOption[];
}

export interface DataTableFilterProps {
  searchPlaceholder?: string;
  filters?: FilterOptionConfig[];
}

export function DataTableFilter({ searchPlaceholder = 'Search...', filters = [] }: DataTableFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get('q') || '';
  const [searchValue, setSearchValue] = useState(currentQ);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

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
    <FilterBar className="mb-6 border-b border-[color:var(--ims-border)] pb-4 flex flex-col md:flex-row items-end gap-4">
      <div className="w-full md:max-w-sm">
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

      <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end w-full md:w-auto md:flex-1 md:justify-end">
        {filters.map((filter) => {
          const currentValue = searchParams.get(filter.key) || '';
          return (
            <div key={filter.key} className="flex flex-col gap-1 w-full sm:w-auto">
              <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider whitespace-nowrap">
                {filter.label}
              </span>
              <Select
                className="w-full sm:w-40 h-10"
                value={currentValue}
                onChange={(e) => updateParams({ [filter.key]: e.target.value, page: '1' })}
                options={[
                  { value: '', label: 'All' },
                  ...filter.options
                ]}
              />
            </div>
          );
        })}
      </div>
    </FilterBar>
  );
}
