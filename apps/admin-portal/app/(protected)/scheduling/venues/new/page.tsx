import { Breadcrumbs, AdminFormPageLayout, PageHeader } from '@ims/shared-ui';
import { CalendarDays, Home, MapPinned, Plus } from 'lucide-react';
import { loadVenueBlockFormData } from '../../data';
import { VenueBlockForm } from '../../_components/venue-block-form';

export const metadata = { title: 'New Venue Block | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function NewVenueBlockPage() {
  const data = await loadVenueBlockFormData();

  return (
    <AdminFormPageLayout>
      <PageHeader
        eyebrow="Scheduling"
        title="Create venue block"
        description="Block a room or branch across a single day or a date range."
        backUrl="/scheduling/venues"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Scheduling',
                href: '/scheduling',
                icon: <CalendarDays className="h-3.5 w-3.5 text-slate-400" />,
              },
              {
                label: 'Venues',
                href: '/scheduling/venues',
                icon: <MapPinned className="h-3.5 w-3.5 text-slate-400" />,
              },
              {
                label: 'New block',
                icon: <Plus className="h-3.5 w-3.5 text-slate-500" />,
              },
            ]}
          />
        }
      />
      <VenueBlockForm
        mode="create"
        branches={data.branches}
        classrooms={data.classrooms}
      />
    </AdminFormPageLayout>
  );
}
