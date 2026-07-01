import { expect, test, vi } from 'vitest';
import { CrmDashboardQueryService } from './crm-dashboard-query-service';

test('CrmDashboardQueryService throws forbidden if lacking permission', async () => {
  const mockReadService = {} as any;
  const mockAuditRepo = {} as any;
  const service = new CrmDashboardQueryService(mockReadService, mockAuditRepo);

  const context = {
    userId: '11111111-1111-1111-1111-111111111111',
    activeBranchId: '22222222-2222-2222-2222-222222222222',
    permissions: [], // Lacks REPORTING_VIEW_CRM_DASHBOARD
  };

  await expect(service.getCrmDashboardData(context))
    .rejects
    .toThrow('Unauthorized: Missing permission REPORTING_VIEW_CRM_DASHBOARD');
});

test('CrmDashboardQueryService builds widgets and logs access', async () => {
  const mockReadService = {
    getLeadStatusDistribution: vi.fn().mockResolvedValue([{ stage: 'New', count: 5 }]),
    getLeadConversionRate: vi.fn().mockResolvedValue({ rate: 20, total: 5, converted: 1 }),
    getLeadsBySource: vi.fn().mockResolvedValue([{ source: 'Web', count: 5 }]),
    getCounselorPerformance: vi.fn().mockResolvedValue([{ counselorId: '33333333-3333-3333-3333-333333333333', counselorName: 'counselor-1', convertedCount: 1 }]),
    getTotalLeadsVsTargets: vi.fn().mockResolvedValue({ actual: 5, target: 10 }),
  } as any;

  const mockAuditRepo = {
    append: vi.fn().mockResolvedValue(undefined),
  } as any;

  const service = new CrmDashboardQueryService(mockReadService, mockAuditRepo);

  const context = {
    userId: '11111111-1111-1111-1111-111111111111',
    activeBranchId: '22222222-2222-2222-2222-222222222222',
    permissions: ['REPORTING_VIEW_CRM_DASHBOARD', 'REPORTING_VIEW_COUNSELOR_METRICS'],
  };

  const widgets = await service.getCrmDashboardData(context);

  expect(mockAuditRepo.append).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'DashboardAccessed',
      actorId: '11111111-1111-1111-1111-111111111111',
      branchId: '22222222-2222-2222-2222-222222222222',
    })
  );

  // Check widgets count (status, conversion, source, counselor, target = 5 widgets)
  expect(widgets.length).toBe(5);

  const counselorPerformanceWidget = widgets.find(w => w.id === 'counselor-performance');
  expect(counselorPerformanceWidget).toBeDefined();
  expect(counselorPerformanceWidget?.data).toEqual([{ counselorId: '33333333-3333-3333-3333-333333333333', counselorName: 'counselor-1', convertedCount: 1 }]);
});

test('CrmDashboardQueryService omits counselor performance widget if lacking permission', async () => {
  const mockReadService = {
    getLeadStatusDistribution: vi.fn().mockResolvedValue([{ stage: 'New', count: 5 }]),
    getLeadConversionRate: vi.fn().mockResolvedValue({ rate: 20, total: 5, converted: 1 }),
    getLeadsBySource: vi.fn().mockResolvedValue([{ source: 'Web', count: 5 }]),
    getTotalLeadsVsTargets: vi.fn().mockResolvedValue({ actual: 5, target: 10 }),
  } as any;

  const mockAuditRepo = {
    append: vi.fn().mockResolvedValue(undefined),
  } as any;

  const service = new CrmDashboardQueryService(mockReadService, mockAuditRepo);

  const context = {
    userId: '11111111-1111-1111-1111-111111111111',
    activeBranchId: '22222222-2222-2222-2222-222222222222',
    permissions: ['REPORTING_VIEW_CRM_DASHBOARD'], // Lacks REPORTING_VIEW_COUNSELOR_METRICS
  };

  const widgets = await service.getCrmDashboardData(context);

  // Check widgets count (status, conversion, source, target = 4 widgets)
  expect(widgets.length).toBe(4);

  const counselorPerformanceWidget = widgets.find(w => w.id === 'counselor-performance');
  expect(counselorPerformanceWidget).toBeUndefined();
});
