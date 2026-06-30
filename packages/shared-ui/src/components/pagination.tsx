'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { Select } from './select';

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount?: number;
  limit?: number;
  buildHref?: (page: number, newLimit?: number) => string;
  className?: string;
  pageSizeOptions?: number[];
}

export function getPaginationPageNumbers(page: number, totalPages: number) {
  const pages: (number | 'ellipsis')[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    return pages;
  }

  pages.push(1);

  if (page > 3) pages.push('ellipsis');

  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i += 1) {
    pages.push(i);
  }

  if (page < totalPages - 2) pages.push('ellipsis');

  pages.push(totalPages);
  return pages;
}

export function buildPaginationHref(
  pathname: string,
  searchParams: URLSearchParams,
  page: number,
  limit: number,
  buildHref?: (page: number, newLimit?: number) => string,
) {
  if (buildHref) {
    return buildHref(page, limit);
  }

  const params = new URLSearchParams(searchParams.toString());
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Client pagination using Next.js Link for URL-based navigation and Select for page size. */
export function Pagination({
  page,
  totalPages,
  totalCount,
  limit = 10,
  buildHref,
  className,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(e.target.value, 10);
    router.push(buildPaginationHref(pathname, searchParams, 1, newLimit, buildHref));
  };

  const baseClass =
    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-xl px-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)]';

  const renderPage = (p: number) => {
    const isActive = p === page;
    const href = buildPaginationHref(pathname, searchParams, p, limit, buildHref);
    const content = (
      <span
        className={cn(
          baseClass,
          isActive
            ? 'bg-[color:var(--ims-ink)] text-[color:var(--ims-surface)] shadow-[0_10px_24px_rgba(16,36,58,0.14)]'
            : 'text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)]',
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        {p}
      </span>
    );
    return !isActive ? (
      <Link key={p} href={href} aria-label={`Page ${p}`}>
        {content}
      </Link>
    ) : (
      <span key={p}>{content}</span>
    );
  };

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 mt-6', className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {totalCount !== undefined && (
          <p className="text-xs text-[color:var(--ims-muted)] sm:whitespace-nowrap">
            Showing page {page} of {totalPages} · {totalCount} results
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[color:var(--ims-muted)] whitespace-nowrap">Rows per page:</span>
          <Select
            className="h-8 w-20 pl-2 pr-8 text-xs py-1"
            value={limit.toString()}
            onChange={handleLimitChange}
            options={pageSizeOptions.map((opt) => ({
              value: opt.toString(),
              label: opt.toString(),
            }))}
          />
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
        {/* Previous */}
        {page > 1 ? (
          <Link href={buildPaginationHref(pathname, searchParams, page - 1, limit, buildHref)} aria-label="Previous page">
            <span className={cn(baseClass, 'text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)]')}>
              <ChevronLeft className="h-4 w-4" />
            </span>
          </Link>
        ) : (
          <span className={cn(baseClass, 'cursor-not-allowed opacity-40')} aria-disabled="true">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}

        {getPaginationPageNumbers(page, totalPages).map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className={cn(baseClass, 'cursor-default text-[color:var(--ims-muted)]')}>
              …
            </span>
          ) : (
            renderPage(item)
          ),
        )}

        {/* Next */}
        {page < totalPages ? (
          <Link href={buildPaginationHref(pathname, searchParams, page + 1, limit, buildHref)} aria-label="Next page">
            <span className={cn(baseClass, 'text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)]')}>
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        ) : (
          <span className={cn(baseClass, 'cursor-not-allowed opacity-40')} aria-disabled="true">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
