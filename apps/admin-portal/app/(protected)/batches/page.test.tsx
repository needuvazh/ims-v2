import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock auth-guard directly
vi.mock('@/lib/auth-guard', () => ({
  assertPermission: vi.fn(),
}));

// Mock @ims/database directly with inline mocked methods
vi.mock('@ims/database', () => ({
  prisma: {
    branch: {
      findMany: vi.fn(),
    },
    userBranchAccess: {
      findMany: vi.fn(),
    },
    course: {
      findMany: vi.fn(),
    },
    batch: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Import the mocked methods for testing
import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';

vi.mock('./_components/batches-client-list', () => ({
  BatchesClientList: () => null,
}));

vi.mock('@ims/shared-ui', () => ({
  AdminListPageLayout: ({ children }: any) => React.createElement('div', null, children),
  Badge: () => null,
  Button: () => null,
  Card: () => null,
  CardContent: () => null,
  CardFooter: () => null,
  CardHeader: () => null,
  EmptyState: () => null,
  FormLabel: () => null,
  Input: () => null,
  Pagination: () => null,
  ResponsiveDataTable: () => null,
  Select: () => null,
  StatCard: () => null,
  Checkbox: () => null,
  Tabs: () => null,
  TabsContent: () => null,
  TabsList: () => null,
  TabsTrigger: () => null,
}));

import BatchesPage from './page';

describe('BatchesPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertPermission).mockResolvedValue({
      userId: 'user-123',
      roles: ['SUPER_ADMIN'],
      activeBranchId: 'branch-1',
      permissions: ['course.catalog.view'],
    } as any);

    vi.mocked(prisma.branch.findMany).mockResolvedValue([]);
    vi.mocked(prisma.course.findMany).mockResolvedValue([]);
    vi.mocked(prisma.batch.count).mockResolvedValue(0);
    vi.mocked(prisma.batch.findMany).mockResolvedValue([]);
  });

  it('should construct query for active group with default status filters using T+3 boundary', async () => {
    await BatchesPage({
      searchParams: Promise.resolve({
        group: 'active',
      }),
    });

    // Check count query arguments for the list pagination
    expect(prisma.batch.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startDate: expect.objectContaining({ lte: expect.any(Date) }),
          endDate: expect.objectContaining({ gte: expect.any(Date) }),
          status: { in: ['OpenForEnrollment', 'InProgress'] },
        }),
      })
    );
  });

  it('should construct query for past group with correct status exclusions and date filters', async () => {
    await BatchesPage({
      searchParams: Promise.resolve({
        group: 'past',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
      }),
    });

    expect(prisma.batch.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          endDate: expect.objectContaining({ lt: expect.any(Date) }),
          status: { not: 'Cancelled' },
          AND: expect.arrayContaining([
            { startDate: { gte: expect.any(Date) } },
            { endDate: { lte: expect.any(Date) } },
          ]),
        }),
      })
    );
  });

  it('should construct query for all group with status exclusions and date range', async () => {
    await BatchesPage({
      searchParams: Promise.resolve({
        group: 'all',
        dateFrom: '2026-05-01',
      }),
    });

    expect(prisma.batch.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: 'Cancelled' },
          AND: expect.arrayContaining([
            { startDate: { gte: expect.any(Date) } },
          ]),
        }),
      })
    );
  });
});
