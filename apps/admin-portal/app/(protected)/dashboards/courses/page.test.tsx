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
    course: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([
        { departmentId: 'dept-1', _count: { id: 3 } }
      ]),
    },
    department: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'dept-1', branchId: 'branch-1', departmentName: 'Dept 1', status: 'Active' }
      ]),
    },
    courseCategory: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'cat-1',
          nameEnglish: 'IT & Development',
          courses: [{ id: 'course-1' }]
        }
      ]),
    },
  },
}));

import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '../../../../lib/runtime';
import { CoursesDashboardClient } from './_components/courses-dashboard-client';
import CoursesDashboardPage from './page';

describe('CoursesDashboardPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertPermission).mockResolvedValue({
      userId: 'user-123',
      roles: ['BRANCH_MANAGER'],
      activeBranchId: 'branch-1',
      permissions: ['course.catalog.dashboard.view'],
    } as any);

    vi.mocked(prisma.course.count).mockResolvedValue(10);
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        id: 'course-1',
        courseCode: 'CRS01',
        nameEnglish: 'Course English 1',
        courseClassification: 'Regular',
        createdAt: new Date('2026-07-01'),
        status: 'Published'
      }
    ] as any);
  });

  it('should enforce permission and check counts with branch constraints', async () => {
    const result = await CoursesDashboardPage({ searchParams: Promise.resolve({}) });

    expect(assertPermission).toHaveBeenCalledWith('course.catalog.dashboard.view');

    // Counts should be fetched and returned as props
    expect(result.type).toBe(CoursesDashboardClient);
    expect(result.props.kpis).toEqual({
      total: 10,
      published: 10,
      approved: 10,
      draft: 10,
      archived: 10
    });
  });
});
