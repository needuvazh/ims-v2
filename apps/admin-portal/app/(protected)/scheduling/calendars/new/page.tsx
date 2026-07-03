import { CalendarDays, Home, Layers3, Plus } from 'lucide-react';
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { CalendarEditorForm } from '../../_components/calendar-editor-form';

export const metadata = { title: 'New Calendar | IMS Admin' };
export const dynamic = 'force-dynamic';

export default function NewCalendarPage() {
  return (
    <AdminFormPageLayout>
      <PageHeader
        eyebrow="Scheduling"
        title="Create institute calendar"
        description="Define the institute baseline first. Branch overrides attach later and stay sparse."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Scheduling', href: '/scheduling', icon: <CalendarDays className="h-3.5 w-3.5" /> }, { label: 'Calendars', href: '/scheduling/calendars', icon: <Layers3 className="h-3.5 w-3.5" /> }, { label: 'New calendar', icon: <Plus className="h-3.5 w-3.5" /> }]} />}
      />
      <CalendarEditorForm mode="create" />
    </AdminFormPageLayout>
  );
}
