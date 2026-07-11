import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth-guard';
import { MetricCard, ChartWidget, Button, Badge } from '@ims/shared-ui';
import { TrendingUp, Target, CalendarClock, AlertTriangle, Users, ArrowRight } from 'lucide-react';
import { LeadsByStageChart, LeadsBySourceChart } from '../../dashboards/crm/crm-dashboard-charts';
import Link from 'next/link';

export const metadata = { title: 'Counselor Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function CounselorDashboardPage() {
  const session = await getSession().catch(() => {
    redirect('/login');
  });

  const { crmDashboardQueryService, branchScopeResolver, followUpService } = await import(
    '../../../lib/runtime'
  );

  const userContext = {
    userId: session.userId,
    activeBranchId: session.activeBranchId ?? null,
    permissions: session.permissions,
  };

  let dashboardData;
  try {
    dashboardData = await crmDashboardQueryService.getCounselorDashboardData(userContext);
  } catch (error: any) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center">
        <AlertTriangle className="h-16 w-16 text-rose-500" />
        <h2 className="text-2xl font-bold text-slate-900">Authorization Failure</h2>
        <p className="text-slate-500 max-w-md">{error.message || 'An error occurred.'}</p>
      </div>
    );
  }

  // Resolve allowed branch IDs for the active user context
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  // Counselor scoping
  const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
  const counselorId = hasGlobalRead ? undefined : session.userId;

  // Fetch today's followups (first 5 items) for the action panel
  const todayFollowUps = await followUpService.findGroupedFollowUps(
    'today',
    {
      counselorId,
      branchIds: allowedBranchIds,
    },
    {
      page: 1,
      limit: 5,
    },
  );

  const { metrics, leadsByStage, leadsBySource } = dashboardData;

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return 'N/A';
    const date = typeof value === 'string' ? new Date(value) : value;

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-850 p-6 md:p-8 text-white shadow-xl border border-white/10">
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-250">
            Personal Analytics
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Counselor Workspace
          </h1>
          <p className="text-sm text-indigo-200 max-w-xl">
            Track your conversions, pending calls, pipeline stages, and active lead touchpoints.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="My Active Leads"
          value={metrics.myActiveLeads.toString()}
          description="Total active leads assigned to you"
          icon={<Users className="h-5 w-5" />}
          tone="indigo"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          description={`Converted ${metrics.myConversions} of your leads`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="emerald"
        />
        <MetricCard
          title="Today's Follow-ups"
          value={metrics.todayFollowUps.toString()}
          description="Calls scheduled for today"
          icon={<CalendarClock className="h-5 w-5" />}
          tone="sky"
        />
        <MetricCard
          title="Overdue Tasks"
          value={metrics.overdueFollowUps.toString()}
          description="Missed scheduled follow-ups"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      {/* Charts & Action Panel Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ChartWidget
              title="My Pipeline by Stage"
              description="Breakdown of your active leads by stage"
              ariaLabel="Leads by Stage"
            >
              <LeadsByStageChart data={leadsByStage} />
            </ChartWidget>

            <ChartWidget
              title="My Lead Sources"
              description="Origin of your assigned leads"
              ariaLabel="Leads by Source"
            >
              <LeadsBySourceChart data={leadsBySource} />
            </ChartWidget>
          </div>
        </div>

        {/* Action Panel Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-indigo-600" />
              Today's Actions
            </h3>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {todayFollowUps.total} Total
            </span>
          </div>

          <div className="space-y-3">
            {todayFollowUps.items.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Target className="h-8 w-8 text-slate-350 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">All caught up!</p>
                <p className="text-xs text-slate-400">No scheduled follow-ups left for today.</p>
              </div>
            ) : (
              todayFollowUps.items.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/20 rounded-xl border border-slate-100 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {item.lead?.leadNumber}
                    </p>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {item.lead?.firstName} {item.lead?.lastName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[9px] font-bold">
                        {item.followUpType}
                      </span>
                      <span>{formatDateTime(item.followUpDate).split(',')[1] || formatDateTime(item.followUpDate)}</span>
                    </div>
                  </div>

                  <Link href={`/leads/${item.leadId}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 flex items-center justify-center rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                      <ArrowRight className="h-4 w-4 text-slate-600" />
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>

          {todayFollowUps.items.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <Link href="/leads/follow-ups">
                <Button className="w-full text-xs font-bold flex items-center justify-center gap-2">
                  Manage All Follow-ups
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
