'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  StatCard,
  Badge
} from '@ims/shared-ui';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Coins,
  FileText,
  Clock,
  TrendingUp,
  Building,
  GraduationCap,
  Calendar,
  Percent,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';

interface KPIProps {
  revenueCollected: number;
  totalInvoiced: number;
  outstandingReceivables: number;
  collectionRate: number;
  corporateRevenue: number;
  studentRevenue: number;
  installmentsDueThisMonth: number;
  revenueGrowth: number;
  totalRefunded: number;
}

interface TrendData {
  month: string;
  revenue: number;
}

interface MonthOverMonthData {
  day: number;
  currentMonth: number;
  previousMonth: number;
}

interface YearOverYearData {
  month: string;
  currentYear: number;
  previousYear: number;
}

interface TopCorporate {
  name: string;
  revenue: number;
}

interface FinanceDashboardClientProps {
  kpis: KPIProps;
  trendData: TrendData[];
  monthOverMonthData: MonthOverMonthData[];
  yearOverYearData: YearOverYearData[];
  receivablesData: { name: string; value: number }[];
  paymentStatusData: { name: string; value: number }[];
  topCorporates: TopCorporate[];
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function FinanceDashboardClient({
  kpis,
  trendData,
  monthOverMonthData,
  yearOverYearData,
  receivablesData,
  paymentStatusData,
  topCorporates
}: FinanceDashboardClientProps) {
  // Student vs Corporate percentage calculation
  const totalB2B_B2C = kpis.studentRevenue + kpis.corporateRevenue;
  const studentPct = totalB2B_B2C > 0 ? Math.round((kpis.studentRevenue / totalB2B_B2C) * 100) : 0;
  const corporatePct = totalB2B_B2C > 0 ? Math.round((kpis.corporateRevenue / totalB2B_B2C) * 100) : 0;

  const splitData = [
    { name: 'Student (B2C)', value: kpis.studentRevenue },
    { name: 'Corporate (B2B)', value: kpis.corporateRevenue }
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* 1. Top Row KPI Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue Collected"
          value={`ر.ع.${kpis.revenueCollected.toFixed(2)}`}
          description="Cash received to date"
          icon={<Coins className="h-5 w-5 text-emerald-600" />}
          tone="emerald"
        />
        <StatCard
          title="Total Invoiced"
          value={`ر.ع.${kpis.totalInvoiced.toFixed(2)}`}
          description="Total business generated"
          icon={<FileText className="h-5 w-5 text-indigo-600" />}
          tone="indigo"
        />
        <StatCard
          title="Outstanding Receivables"
          value={`ر.ع.${kpis.outstandingReceivables.toFixed(2)}`}
          description="Uncollected balance (net of refunds)"
          icon={<Clock className="h-5 w-5 text-rose-600" />}
          tone="rose"
        />
        <StatCard
          title="Total Refunded"
          value={`ر.ع.${kpis.totalRefunded.toFixed(2)}`}
          description="Executed & approved refund reversals"
          icon={<RotateCcw className="h-5 w-5 text-orange-600" />}
          tone="amber"
        />
        <StatCard
          title="Collection Rate"
          value={`${kpis.collectionRate.toFixed(1)}%`}
          description="Collection efficiency ratio"
          icon={<Percent className="h-5 w-5 text-amber-600" />}
          tone="amber"
        />
        <StatCard
          title="Corporate Revenue"
          value={`ر.ع.${kpis.corporateRevenue.toFixed(2)}`}
          description="Total B2B performance"
          icon={<Building className="h-5 w-5 text-violet-600" />}
          tone="violet"
        />
        <StatCard
          title="Student Revenue"
          value={`ر.ع.${kpis.studentRevenue.toFixed(2)}`}
          description="Total B2C performance"
          icon={<GraduationCap className="h-5 w-5 text-sky-600" />}
          tone="sky"
        />
        <StatCard
          title="Installments Due This Month"
          value={`ر.ع.${kpis.installmentsDueThisMonth.toFixed(2)}`}
          description="Upcoming collections schedule"
          icon={<Calendar className="h-5 w-5 text-teal-600" />}
          tone="teal"
        />

      </div>

      {/* 2. Charts Layout Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Row 1: Chart 1: Revenue Trend (Bar Chart) + Chart 2: Revenue Split (Pie Chart) */}
        <Card className="lg:col-span-2 shadow-sm border border-slate-100">
          <CardHeader className="border-b border-slate-50 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800">Revenue Trend</CardTitle>
            <span className="text-xs text-slate-500">Monthly Invoiced Revenue (last 6 months)</span>
          </CardHeader>
          <CardContent className="pt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  formatter={(v: any) => [`ر.ع. ${Number(v).toFixed(2)}`, 'Revenue']}
                  contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-100">
          <CardHeader className="border-b border-slate-50 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800">Revenue Split</CardTitle>
            <span className="text-xs text-slate-500">Student vs Corporate share mix</span>
          </CardHeader>
          <CardContent className="pt-3 flex flex-col justify-between h-64">
            <div className="flex-1 min-h-[110px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={110}>
                <PieChart>
                  <Pie
                    data={splitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={48}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#4f46e5" />
                    <Cell fill="#0ea5e9" />
                  </Pie>
                  <Tooltip formatter={(v: any) => `ر.ع. ${Number(v).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-indigo-600"></span> Student (B2C)
                  </span>
                  <span>{studentPct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${studentPct}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-sky-500"></span> Corporate (B2B)
                  </span>
                  <span>{corporatePct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${corporatePct}%` }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 2: Chart 1b: Revenue Comparative Trend - MoM (Line Chart) + Chart 3: Receivables (Pie Chart) */}
        <Card className="lg:col-span-2 shadow-sm border border-slate-100">
          <CardHeader className="border-b border-slate-50 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800">MoM Revenue Comparative Trend</CardTitle>
            <span className="text-xs text-slate-500">Daily Invoiced Revenue comparison (Current Month vs Previous Month)</span>
          </CardHeader>
          <CardContent className="pt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthOverMonthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  formatter={(v: any, name: string) => [
                    `ر.ع. ${Number(v).toFixed(2)}`,
                    name === 'currentMonth' ? 'Current Month' : 'Previous Month'
                  ]}
                  contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                <Line type="monotone" dataKey="currentMonth" name="currentMonth" stroke="#4f46e5" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="previousMonth" name="previousMonth" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-100">
          <CardHeader className="border-b border-slate-50 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800">Receivables Distribution</CardTitle>
            <span className="text-xs text-slate-500">Uncollected outstanding segments</span>
          </CardHeader>
          <CardContent className="pt-3 h-64 flex flex-col justify-between">
            <div className="flex-1 min-h-[120px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={receivablesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={48}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {receivablesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `ر.ع. ${Number(v).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] pt-1">
              {receivablesData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1 text-slate-600">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Row 3: Chart 1c: Revenue Comparative Trend - YoY (Line Chart) + Chart 4: Payment Status (Pie Chart) */}
        <Card className="lg:col-span-2 shadow-sm border border-slate-100">
          <CardHeader className="border-b border-slate-50 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800">YoY Revenue Comparative Trend</CardTitle>
            <span className="text-xs text-slate-500">Monthly Invoiced Revenue comparison (Current Year vs Previous Year)</span>
          </CardHeader>
          <CardContent className="pt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearOverYearData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  formatter={(v: any, name: string) => [
                    `ر.ع. ${Number(v).toFixed(2)}`,
                    name === 'currentYear' ? 'Current Year' : 'Previous Year'
                  ]}
                  contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                <Line type="monotone" dataKey="currentYear" name="currentYear" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="previousYear" name="previousYear" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-100">
          <CardHeader className="border-b border-slate-50 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800">Payment Status Collection</CardTitle>
            <span className="text-xs text-slate-500">Invoice payment statuses count</span>
          </CardHeader>
          <CardContent className="pt-3 h-64 flex flex-col justify-between">
            <div className="flex-1 min-h-[120px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={48}
                    paddingAngle={1}
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${v} Invoices`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px] pt-1">
              {paymentStatusData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1 text-slate-600">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[(idx + 1) % COLORS.length] }}></span>
                  <span className="truncate">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Row 4: Chart 5: Top Corporate Clients (Full Width) */}
        <Card className="lg:col-span-3 shadow-sm border border-slate-100">
          <CardHeader className="border-b border-slate-50 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800">Top 5 Corporate Clients</CardTitle>
              <span className="text-xs text-slate-500">B2B revenue concentration share</span>
            </div>
            <Link href="/finance/invoices" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 font-semibold">
              View Invoices <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-3 h-48 overflow-y-auto">
            {topCorporates.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No corporate revenue recorded.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
                {topCorporates.map((client, idx) => {
                  const maxRevenue = topCorporates[0]?.revenue || 1;
                  const percent = Math.max(5, Math.round((client.revenue / maxRevenue) * 100));

                  return (
                    <div key={client.name} className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex flex-col justify-between h-24">
                      <div className="text-xs font-bold text-slate-700 truncate" title={client.name}>
                        {idx + 1}. {client.name}
                      </div>
                      <div className="space-y-1 mt-1">
                        <div className="text-xs font-mono font-bold text-indigo-600">ر.ع. {client.revenue.toFixed(2)}</div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
