import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CrmDashboardPage from './page';

const { mockGetSession, mockGetCrmDashboardData } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetCrmDashboardData: vi.fn(),
}));

vi.mock('../../../lib/auth-guard', () => ({
  getSession: mockGetSession,
}));

vi.mock('../../../lib/runtime', () => ({
  crmDashboardQueryService: {
    getCrmDashboardData: mockGetCrmDashboardData,
  },
}));

vi.mock('./crm-dashboard-charts', () => ({
  LeadsByStageChart: () => <div data-testid="leads-by-stage-chart" />,
  LeadsBySourceChart: () => <div data-testid="leads-by-source-chart" />,
  CounselorPerformanceChart: () => (
    <div data-testid="counselor-performance-chart" />
  ),
}));

describe('CrmDashboardPage', () => {
  it('renders the CRM dashboard for a user with the CRM dashboard permission', async () => {
    mockGetSession.mockResolvedValue({
      userId: 'admin-id',
      activeBranchId: 'branch-id',
      permissions: ['REPORTING_VIEW_CRM_DASHBOARD'],
    });
    mockGetCrmDashboardData.mockResolvedValue([
      {
        id: 'lead-conversion-rate',
        title: 'Lead Conversion Rate',
        description: 'Conversion ratio',
        ariaLabel: 'Lead conversion rate widget',
        data: { value: '45%', total: 20, converted: 9 },
      },
    ]);

    const page = await CrmDashboardPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain('CRM Analytics Dashboard');
    expect(html).toContain('Lead Conversion Rate');
  });

  it('shows access denied when the session lacks CRM dashboard permission', async () => {
    mockGetSession.mockResolvedValue({
      userId: 'admin-id',
      activeBranchId: 'branch-id',
      permissions: [],
    });

    const page = await CrmDashboardPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Access Denied');
    expect(html).toContain('REPORTING_VIEW_CRM_DASHBOARD');
  });
});
