import { describe, it, expect } from 'vitest';
import { prisma } from '../packages/database/src/client';
import { LeadAnalyticsReadService } from '../packages/crm-leads/src/application/lead-analytics-read-service';
import { CrmDashboardQueryService } from '../packages/reporting-dashboards/src/queries/crm-dashboard-query-service';
import { PrismaAuditRepository } from '../packages/database/src/repositories/prisma-audit-repository';

describe('CRM Dashboard Database Integration', () => {
  it('successfully executes queries against database', async () => {
    const readService = new LeadAnalyticsReadService(prisma);
    const auditRepo = new PrismaAuditRepository(prisma);
    const queryService = new CrmDashboardQueryService(readService, auditRepo);

    const context = {
      userId: '00000000-0000-0000-0000-000000000000',
      activeBranchId: null,
      permissions: ['REPORTING_VIEW_CRM_DASHBOARD', 'REPORTING_VIEW_COUNSELOR_METRICS', 'LEAD_VIEW_ALL_IN_BRANCH'],
    };

    const widgets = await queryService.getCrmDashboardData(context);
    expect(widgets).toBeDefined();
    expect(widgets.length).toBeGreaterThanOrEqual(4);
  });
});
