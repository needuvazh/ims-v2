import React from 'react';
import { AdminListPageLayout } from '@ims/shared-ui';
import { loadSchedulingCalendars } from '../data';
import { CalendarsClientList } from './_components/calendars-client-list';

export const metadata = { title: 'Calendar | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function CalendarsPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: 'Draft' | 'Active' | 'Closed' | 'Archived';
    year?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // Load filtered calendars for display
  const calendars = await loadSchedulingCalendars({
    q: searchParams.q,
    status: searchParams.status,
    year: searchParams.year ? Number(searchParams.year) : undefined,
  });

  // Load all calendars to calculate KPIs and extract all unique years
  const allCalendars = await loadSchedulingCalendars({});

  const years = Array.from(new Set(allCalendars.map((c) => c.year))).sort(
    (a, b) => b - a,
  );

  const kpis = {
    total: allCalendars.length,
    active: allCalendars.filter((c) => c.status === 'Active').length,
    draft: allCalendars.filter((c) => c.status === 'Draft').length,
    closed: allCalendars.filter(
      (c) => c.status === 'Closed' || c.status === 'Archived',
    ).length,
  };

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  const mappedCalendars = calendars.map((cal) => ({
    id: cal.id,
    code: cal.code,
    name: cal.name,
    year: cal.year,
    status: cal.status as 'Draft' | 'Active' | 'Closed' | 'Archived',
    effectiveStartDate: cal.effectiveStartDate.toISOString(),
    effectiveEndDate: cal.effectiveEndDate
      ? cal.effectiveEndDate.toISOString()
      : null,
    instituteId: cal.instituteId,
  }));

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <CalendarsClientList
        calendars={mappedCalendars}
        years={years}
        total={calendars.length}
        currentPage={page}
        kpis={kpis}
      />
    </AdminListPageLayout>
  );
}
