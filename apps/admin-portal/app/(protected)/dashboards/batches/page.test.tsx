import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock auth-guard directly
vi.mock('@/lib/auth-guard', () => ({
  assertPermission: vi.fn(),
}));

// Mock runtime dependencies
vi.mock('../../../../lib/runtime', () => ({
  branchScopeResolver: {
    resolveAllowedBranches: vi.fn().mockResolvedValue(['branch-1']),
  },
  prisma: {
    batch: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '../../../../lib/runtime';
import { BatchesDashboardClient } from './_components/batches-dashboard-client';
import BatchesDashboardPage from './page';

describe('BatchesDashboardPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertPermission).mockResolvedValue({
      userId: 'user-123',
      roles: ['BRANCH_MANAGER'],
      activeBranchId: 'branch-1',
      permissions: ['course.catalog.view'],
    } as any);

    // Mock count and findMany results
    vi.mocked(prisma.batch.count).mockResolvedValue(5);
    vi.mocked(prisma.batch.findMany).mockResolvedValue([
      {
        id: 'batch-1',
        batchCode: 'B1',
        batchNameEnglish: 'Batch 1',
        courseId: 'course-A',
        capacity: 20,
        currentEnrollmentCount: 15,
        startDate: new Date('2026-07-20'),
        endDate: new Date('2026-10-20'),
        status: 'InProgress',
        course: {
          id: 'course-A',
          nameEnglish: 'Fullstack JS',
        },
      },
      {
        id: 'batch-2',
        batchCode: 'B2',
        batchNameEnglish: 'Batch 2',
        courseId: 'course-A',
        capacity: 20,
        currentEnrollmentCount: 10,
        startDate: new Date('2026-07-25'),
        endDate: new Date('2026-10-25'),
        status: 'OpenForEnrollment',
        course: {
          id: 'course-A',
          nameEnglish: 'Fullstack JS',
        },
      },
    ] as any);
  });

  it('should enforce permission and check branch scoped counts', async () => {
    await BatchesDashboardPage();

    expect(assertPermission).toHaveBeenCalledWith('course.catalog.view');

    // Count queries should respect branch-1 scope
    expect(prisma.batch.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: { in: ['branch-1'] },
        }),
      })
    );
  });

  it('should correctly aggregate course capacities and fill rates in memory', async () => {
    const result = await BatchesDashboardPage();

    expect(result.type).toBe(BatchesDashboardClient);
    expect(result.props.kpis).toEqual({
      total: 5,
      open: 5,
      inProgress: 5,
      cancelled: 5,
      draft: 5,
    });
    expect(result.props.courseCapacities).toEqual([
      {
        courseName: 'Fullstack JS',
        activeBatchCount: 2,
        capacity: 40,
        enrolled: 25,
        fillRate: 63,
      },
    ]);
  });
});
