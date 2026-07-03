import { assertPermission, getSession } from '@/lib/auth-guard';
import { organizationService, schedulingCalendarService } from '@/lib/runtime';

export async function loadSchedulingCalendars(filters: { q?: string; year?: number; status?: 'Draft' | 'Active' | 'Closed' | 'Archived' }) {
  await assertPermission('scheduling.calendar.read');
  return schedulingCalendarService.listCalendars(filters);
}

export async function loadSchedulingOverview() {
  await assertPermission('scheduling.calendar.read');
  const calendars = await schedulingCalendarService.listCalendars({});
  return {
    calendars,
    counts: {
      total: calendars.length,
      active: calendars.filter((calendar) => calendar.status === 'Active').length,
      draft: calendars.filter((calendar) => calendar.status === 'Draft').length,
      closed: calendars.filter((calendar) => calendar.status === 'Closed').length,
    },
  };
}

export async function loadCalendarDetail(calendarId: string, branchId?: string | null) {
  await assertPermission('scheduling.calendar.read');
  const session = await getSession();
  const calendar = await schedulingCalendarService.getCalendar(calendarId);
  const branchesResult = await organizationService.listBranches({ pageSize: 100, instituteId: calendar.instituteId });
  const branches = branchesResult.items.map((branch) => ({ id: branch.id, name: branch.branchName }));
  const selectedBranchId = branchId ?? session.activeBranchId ?? branches[0]?.id ?? null;
  const resolved = selectedBranchId
    ? await schedulingCalendarService.resolveCalendar(selectedBranchId, calendar.effectiveStartDate, calendar.instituteId)
    : null;

  return { calendar, branches, selectedBranchId, resolved };
}
