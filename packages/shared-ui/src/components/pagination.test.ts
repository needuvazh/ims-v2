import { describe, expect, it } from 'vitest';
import { buildPaginationHref, getPaginationPageNumbers } from './pagination';

describe('pagination helpers', () => {
  it('builds hrefs from the current query string when no custom builder is provided', () => {
    const href = buildPaginationHref(
      '/iam/permissions',
      new URLSearchParams('q=role&module=iam&page=4&limit=10'),
      2,
      25,
    );

    expect(href).toBe('/iam/permissions?q=role&module=iam&page=2&limit=25');
  });

  it('uses the custom href builder when provided', () => {
    const href = buildPaginationHref(
      '/iam/permissions',
      new URLSearchParams('q=role'),
      3,
      50,
      (page, limit) => `/iam/permissions?page=${page}&limit=${limit}`,
    );

    expect(href).toBe('/iam/permissions?page=3&limit=50');
  });

  it('shows a compact page window for long lists', () => {
    expect(getPaginationPageNumbers(6, 12)).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 12]);
  });
});
