import { expect, test, vi } from 'vitest';
import {
  LeadAnalyticsReadService,
  UserContext,
} from './lead-analytics-read-service';

test('LeadAnalyticsReadService scoping with counselor context (no LEAD_VIEW_ALL_IN_BRANCH)', async () => {
  const mockPrisma = {
    lead: {
      groupBy: vi.fn().mockResolvedValue([
        { stage: 'New', _count: { id: 5 } },
        { stage: 'Converted', _count: { id: 2 } },
      ]),
      count: vi.fn().mockImplementation(({ where }) => {
        // Assert scoping is applied
        expect(where.branchId).toBe('branch-1');
        expect(where.counselorId).toBe('user-counselor');
        expect(where.isDeleted).toBe(false);
        if (where.stage === 'Converted') return Promise.resolve(2);
        return Promise.resolve(7);
      }),
    },
  } as any;

  const service = new LeadAnalyticsReadService(mockPrisma);
  const context: UserContext = {
    userId: 'user-counselor',
    activeBranchId: 'branch-1',
    permissions: ['REPORTING_VIEW_CRM_DASHBOARD'], // Lacks LEAD_VIEW_ALL_IN_BRANCH
  };

  const distribution = await service.getLeadStatusDistribution(context);
  expect(distribution).toEqual([
    { stage: 'New', count: 5 },
    { stage: 'Converted', count: 2 },
  ]);
  expect(mockPrisma.lead.groupBy).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        isDeleted: false,
        branchId: 'branch-1',
        counselorId: 'user-counselor',
      },
    }),
  );

  const conversionRate = await service.getLeadConversionRate(context);
  expect(conversionRate).toEqual({
    rate: 28.57, // (2 / 7) * 100
    total: 7,
    converted: 2,
  });
});

test('LeadAnalyticsReadService scoping with manager context (has LEAD_VIEW_ALL_IN_BRANCH)', async () => {
  const mockPrisma = {
    lead: {
      groupBy: vi
        .fn()
        .mockResolvedValue([{ stage: 'New', _count: { id: 10 } }]),
      count: vi.fn().mockImplementation(({ where }) => {
        expect(where.branchId).toBe('branch-1');
        expect(where.counselorId).toBeUndefined(); // Bypass counselor scoping
        expect(where.isDeleted).toBe(false);
        return Promise.resolve(10);
      }),
    },
  } as any;

  const service = new LeadAnalyticsReadService(mockPrisma);
  const context: UserContext = {
    userId: 'user-manager',
    activeBranchId: 'branch-1',
    permissions: ['REPORTING_VIEW_CRM_DASHBOARD', 'LEAD_VIEW_ALL_IN_BRANCH'],
  };

  const distribution = await service.getLeadStatusDistribution(context);
  expect(distribution).toEqual([{ stage: 'New', count: 10 }]);
  expect(mockPrisma.lead.groupBy).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        isDeleted: false,
        branchId: 'branch-1',
      },
    }),
  );
});

test('LeadAnalyticsReadService getFollowUpCounts scoping', async () => {
  const mockPrisma = {
    leadFollowUp: {
      count: vi.fn().mockImplementation(({ where }) => {
        expect(where.isDeleted).toBe(false);
        expect(where.status.in).toEqual(['Scheduled', 'Overdue']);
        expect(where.lead.branchId).toBe('branch-1');
        if (!where.lead.counselorId) {
          // Manager bypasses counselorId scoping
        } else {
          expect(where.lead.counselorId).toBe('user-counselor');
        }
        return Promise.resolve(3);
      }),
    },
  } as any;

  const service = new LeadAnalyticsReadService(mockPrisma);

  // Counselor context
  const counselorCtx: UserContext = {
    userId: 'user-counselor',
    activeBranchId: 'branch-1',
    permissions: ['dashboard.view'],
  };
  const countsCounselor = await service.getFollowUpCounts(counselorCtx);
  expect(countsCounselor).toEqual({ today: 3, overdue: 3, future: 3 });

  // Manager context
  const managerCtx: UserContext = {
    userId: 'user-manager',
    activeBranchId: 'branch-1',
    permissions: ['dashboard.view', 'LEAD_VIEW_ALL_IN_BRANCH'],
  };
  const countsManager = await service.getFollowUpCounts(managerCtx);
  expect(countsManager).toEqual({ today: 3, overdue: 3, future: 3 });
});
