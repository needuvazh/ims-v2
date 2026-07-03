import { CalendarDays, Edit2, Layers3 } from 'lucide-react';
import { Breadcrumbs, Card, CardContent, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { CalendarEditorForm } from '../../../_components/calendar-editor-form';
import { loadCalendarDetail } from '../../../data';

export const metadata = { title: 'Edit Calendar | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function EditCalendarPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ branchId?: string }> }) {
  const [{ id }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const { calendar } = await loadCalendarDetail(id, searchParams.branchId);

  return (
    <AdminFormPageLayout>
      <PageHeader
        eyebrow="Scheduling"
        title="Edit calendar"
        description="Update the institute baseline. Timezone remains fixed to Asia/Muscat."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Scheduling', href: '/scheduling', icon: <CalendarDays className="h-3.5 w-3.5" /> }, { label: 'Calendars', href: '/scheduling/calendars', icon: <Layers3 className="h-3.5 w-3.5" /> }, { label: 'Edit', icon: <Edit2 className="h-3.5 w-3.5" /> }]} />}
      />
      <CalendarEditorForm mode="edit" initialCalendar={calendar} />
    </AdminFormPageLayout>
  );
}
