import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { MetricCard, ChartWidget } from '@ims/shared-ui';
import { TrendingUp, Target, ShieldAlert } from 'lucide-react';
import {
  LeadsByStageChart,
  LeadsBySourceChart,
  CounselorPerformanceChart,
} from './crm-dashboard-charts';

export const metadata = { title: 'CRM Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function CrmDashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(sessionCookieName)?.value;
  const session = await decodeSession(sessionToken);

  if (!session) {
    redirect('/login');
  }

  // 1. Authorize user completely lacking CRM Dashboard permissions
  const hasCrmDashboardPermission = session.permissions.includes('REPORTING_VIEW_CRM_DASHBOARD');
  if (!hasCrmDashboardPermission) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="h-16 w-16 text-rose-500 animate-bounce" />
        <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 max-w-md">
          You do not have the required permissions (`REPORTING_VIEW_CRM_DASHBOARD`) to view the CRM Dashboard. Please contact your administrator.
        </p>
      </div>
    );
  }

  // 2. Call the query service to fetch widgets data
  const { crmDashboardQueryService } = await import('../../../lib/runtime');
  
  // Construct UserContext
  const userContext = {
    userId: session.userId,
    activeBranchId: session.activeBranchId,
    permissions: session.permissions,
  };

  let widgets;
  try {
    widgets = await crmDashboardQueryService.getCrmDashboardData(userContext);
  } catch (error: any) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="h-16 w-16 text-rose-500" />
        <h2 className="text-2xl font-bold text-slate-900">Authorization Failure</h2>
        <p className="text-slate-500 max-w-md">
          {error.message || 'An error occurred while loading dashboard metrics.'}
        </p>
      </div>
    );
  }

  // Find widgets
  const conversionRateWidget = widgets.find((w: any) => w.id === 'lead-conversion-rate');
  const leadsVsTargetsWidget = widgets.find((w: any) => w.id === 'leads-vs-targets');
  const statusDistributionWidget = widgets.find((w: any) => w.id === 'lead-status-distribution');
  const leadsBySourceWidget = widgets.find((w: any) => w.id === 'leads-by-source');
  const counselorPerformanceWidget = widgets.find((w: any) => w.id === 'counselor-performance');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-850 p-6 md:p-8 text-white shadow-xl border border-white/10">
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-250">
            Analytics & Reports
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">CRM Analytics Dashboard</h1>
          <p className="text-sm text-indigo-200 max-w-xl">
            Live conversion rates, pipeline stages, status distributions, and team performance scoped to your branch.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
        {conversionRateWidget && (
          <MetricCard
            title={conversionRateWidget.title}
            value={conversionRateWidget.data.value}
            description={`Converted ${conversionRateWidget.data.converted} out of ${conversionRateWidget.data.total} total leads`}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="indigo"
          />
        )}
        {leadsVsTargetsWidget && (
          <MetricCard
            title={leadsVsTargetsWidget.title}
            value={`${leadsVsTargetsWidget.data.actual} / ${leadsVsTargetsWidget.data.target}`}
            description={`Target progress: ${leadsVsTargetsWidget.data.progressPercentage}%`}
            icon={<Target className="h-5 w-5" />}
            tone="emerald"
          />
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {statusDistributionWidget && (
          <ChartWidget
            title={statusDistributionWidget.title}
            description={statusDistributionWidget.description}
            ariaLabel={statusDistributionWidget.ariaLabel}
          >
            <LeadsByStageChart data={statusDistributionWidget.data} />
          </ChartWidget>
        )}

        {leadsBySourceWidget && (
          <ChartWidget
            title={leadsBySourceWidget.title}
            description={leadsBySourceWidget.description}
            ariaLabel={leadsBySourceWidget.ariaLabel}
          >
            <LeadsBySourceChart data={leadsBySourceWidget.data} />
          </ChartWidget>
        )}

        {counselorPerformanceWidget && (
          <div className="lg:col-span-2">
            <ChartWidget
              title={counselorPerformanceWidget.title}
              description={counselorPerformanceWidget.description}
              ariaLabel={counselorPerformanceWidget.ariaLabel}
            >
              <CounselorPerformanceChart data={counselorPerformanceWidget.data} />
            </ChartWidget>
          </div>
        )}
      </div>
    </div>
  );
}
