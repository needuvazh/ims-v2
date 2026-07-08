import { CalendarDays, Layers3, Plus } from 'lucide-react';
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { CalendarEditorForm } from '../../_components/calendar-editor-form';
import { loadInstituteOptions } from '../../data';

export const metadata = { title: 'New Calendar | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function NewCalendarPage() {
  const institutes = await loadInstituteOptions();

  return (
    <AdminFormPageLayout>
      <PageHeader
        eyebrow="Scheduling"
        title="Create institute calendar"
        description="Define the institute baseline first. Branch overrides attach later and stay sparse."
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Scheduling',
                href: '/scheduling',
                icon: <CalendarDays className="h-3.5 w-3.5" />,
              },
              {
                label: 'Calendars',
                href: '/scheduling/calendars',
                icon: <Layers3 className="h-3.5 w-3.5" />,
              },
              { label: 'New calendar', icon: <Plus className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <CalendarEditorForm
        mode="create"
        instituteOptions={institutes.map((institute) => ({
          value: institute.id,
          label: `${institute.instituteName} (${institute.instituteCode})`,
        }))}
      />
    </AdminFormPageLayout>
  );
}
