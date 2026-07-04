import React, { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './table';

export interface Column<T> {
  header: ReactNode;
  /** Accessor key or render function for the cell */
  render: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export interface ResponsiveDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Custom card renderer for mobile/tablet view */
  renderCard: (item: T) => ReactNode;
  /** Unique key for each row/card */
  keyExtractor: (item: T) => string | number;
  emptyState?: ReactNode;
  /** Breakpoint at which to switch to cards. Defaults to 'lg' (1024px) */
  breakpoint?: 'md' | 'lg';
}

/**
 * A table that automatically transforms into a grid of cards on smaller screens.
 * Desktop: Standard accessible table.
 * Mobile/Tablet: Stacked cards with custom layout.
 */
export function ResponsiveDataTable<T>({
  data,
  columns,
  renderCard,
  keyExtractor,
  emptyState,
  breakpoint = 'lg'
}: ResponsiveDataTableProps<T>) {
  if (data.length === 0 && emptyState) return <>{emptyState}</>;

  const isLg = breakpoint === 'lg';

  return (
    <div className="w-full">
      {/* Desktop View: Table */}
      <div className={cn(
        'hidden',
        isLg ? 'lg:block' : 'md:block'
      )}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i} className={col.headerClassName}>
                  {col.sortable && col.onSort ? (
                    <button
                      type="button"
                      onClick={col.onSort}
                      className="inline-flex items-center gap-1.5 text-left transition-colors hover:text-[color:var(--ims-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      aria-sort={col.sortDirection === 'asc' ? 'ascending' : col.sortDirection === 'desc' ? 'descending' : 'none'}
                    >
                      <span>{col.header}</span>
                      {col.sortDirection === 'asc' ? (
                        <ArrowUp className="h-3.5 w-3.5 text-[color:var(--ims-brass)]" />
                      ) : col.sortDirection === 'desc' ? (
                        <ArrowDown className="h-3.5 w-3.5 text-[color:var(--ims-brass)]" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-[color:var(--ims-muted)]" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={keyExtractor(item)}>
                {columns.map((col, i) => (
                  <TableCell key={i} className={col.className}>
                    {col.render(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile/Tablet View: Cards */}
      <div className={cn(
        'grid grid-cols-1 gap-4',
        isLg ? 'lg:hidden' : 'md:hidden'
      )}>
        {data.map((item) => (
          <div key={keyExtractor(item)}>
            {renderCard(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
