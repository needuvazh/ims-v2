import { LeadAnalyticsReadService, UserContext } from '@ims/crm-leads';
import { DomainError, createUuid, createBranchId } from '@ims/shared-kernel';
import type { AuditLogRepository } from '@ims/audit';
import crypto from 'crypto';

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart';
  chartType?: 'bar' | 'pie' | 'line' | 'donut';
  data: any;
  ariaLabel: string;
  description?: string;
}

export class CrmDashboardQueryService {
  constructor(
    private readonly leadAnalyticsReadService: LeadAnalyticsReadService,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  async getCrmDashboardData(userContext: UserContext): Promise<DashboardWidget[]> {
    // 1. Authorization check
    if (!userContext.permissions.includes('REPORTING_VIEW_CRM_DASHBOARD')) {
      throw new DomainError('forbidden', 'Unauthorized: Missing permission REPORTING_VIEW_CRM_DASHBOARD');
    }

    // 2. Audit emission: emit DashboardAccessed event
    await this.auditLogRepository.append({
      id: createUuid(crypto.randomUUID()),
      actorId: createUuid(userContext.userId),
      occurredAt: new Date(),
      branchId: userContext.activeBranchId ? createBranchId(userContext.activeBranchId) : null,
      action: 'DashboardAccessed',
      entityType: 'Dashboard',
      entityId: 'crm',
      details: {
        dashboard: 'crm',
        userId: userContext.userId,
        branchId: userContext.activeBranchId,
      },
    });

    const widgets: DashboardWidget[] = [];

    // 3. Fetch status distribution (Leads by Stage)
    const statusDistribution = await this.leadAnalyticsReadService.getLeadStatusDistribution(userContext);
    widgets.push({
      id: 'lead-status-distribution',
      title: 'Leads by Stage',
      type: 'chart',
      chartType: 'bar',
      data: statusDistribution,
      ariaLabel: 'Bar chart showing lead count distribution across different operational stages.',
      description: 'Breakdown of current leads by their active lifecycle stage.',
    });

    // 4. Fetch conversion rate
    const conversionRate = await this.leadAnalyticsReadService.getLeadConversionRate(userContext);
    widgets.push({
      id: 'lead-conversion-rate',
      title: 'Lead Conversion Rate',
      type: 'metric',
      data: {
        value: `${conversionRate.rate}%`,
        total: conversionRate.total,
        converted: conversionRate.converted,
      },
      ariaLabel: `Lead conversion rate metric at ${conversionRate.rate} percent. Total leads: ${conversionRate.total}. Converted leads: ${conversionRate.converted}.`,
      description: 'Percentage of total leads successfully converted to student admissions.',
    });

    // 5. Fetch leads by source
    const leadsBySource = await this.leadAnalyticsReadService.getLeadsBySource(userContext);
    widgets.push({
      id: 'leads-by-source',
      title: 'Leads by Source',
      type: 'chart',
      chartType: 'donut',
      data: leadsBySource,
      ariaLabel: 'Pie chart representing acquisition sources for active leads.',
      description: 'Distribution of leads categorized by lead acquisition channels.',
    });

    // 6. Fetch counselor performance (optional, requires REPORTING_VIEW_COUNSELOR_METRICS)
    if (userContext.permissions.includes('REPORTING_VIEW_COUNSELOR_METRICS')) {
      const counselorPerformance = await this.leadAnalyticsReadService.getCounselorPerformance(userContext);
      widgets.push({
        id: 'counselor-performance',
        title: 'Counselor Performance',
        type: 'chart',
        chartType: 'bar',
        data: counselorPerformance,
        ariaLabel: 'Bar chart showing total number of leads converted by counselor.',
        description: 'Converted leads comparison across active counselors.',
      });
    }

    // 7. Fetch total leads vs targets
    const leadsVsTargets = await this.leadAnalyticsReadService.getTotalLeadsVsTargets(userContext);
    widgets.push({
      id: 'leads-vs-targets',
      title: 'Total Leads vs Targets',
      type: 'metric',
      data: {
        actual: leadsVsTargets.actual,
        target: leadsVsTargets.target,
        progressPercentage: leadsVsTargets.target > 0 
          ? Math.min(Math.round((leadsVsTargets.actual / leadsVsTargets.target) * 100), 100) 
          : 0,
      },
      ariaLabel: `Comparison metric showing actual lead count of ${leadsVsTargets.actual} versus target of ${leadsVsTargets.target}.`,
      description: 'Overall active lead count compared against branch/counselor target goals.',
    });

    return widgets;
  }

  async executeReport(reportId: string, userContext: UserContext, queryParams: any = {}): Promise<any> {
    // Audit emission for reports
    await this.auditLogRepository.append({
      id: createUuid(crypto.randomUUID()),
      actorId: createUuid(userContext.userId),
      occurredAt: new Date(),
      branchId: userContext.activeBranchId ? createBranchId(userContext.activeBranchId) : null,
      action: 'ReportExecuted',
      entityType: 'Report',
      entityId: reportId,
      details: {
        reportId,
        queryParams,
      },
    });

    if (reportId === 'crm-leads-detail') {
      if (!userContext.permissions.includes('REPORTING_VIEW_CRM_DASHBOARD')) {
        throw new DomainError('forbidden', 'Unauthorized report execution');
      }
      const leads = await this.leadAnalyticsReadService.getLeadStatusDistribution(userContext);
      return { reportId, data: leads };
    }

    throw new DomainError('not_found', 'Report definition not found');
  }
}
