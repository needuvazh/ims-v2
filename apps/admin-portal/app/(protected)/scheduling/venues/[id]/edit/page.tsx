import { notFound } from 'next/navigation';
import { Breadcrumbs, AdminFormPageLayout, PageHeader } from '@ims/shared-ui';
import { CalendarDays, Edit2, Home, MapPinned } from 'lucide-react';
import { loadVenueBlockFormData } from '../../../data';
import { VenueBlockForm, type VenueBlockRecord } from '../../../_components/venue-block-form';

export const metadata = { title: 'Edit Venue Block | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function EditVenueBlockPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadVenueBlockFormData(params.id);

  if (!data.venueBlock) {
    notFound();
  }

  return (
    <AdminFormPageLayout>
      <PageHeader
        eyebrow="Scheduling"
        title={`Edit ${data.venueBlock.reasonCode}`}
        description="Update the blocked venue dates, scope, or status."
        backUrl="/scheduling/venues"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Scheduling', href: '/scheduling', icon: <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Venues', href: '/scheduling/venues', icon: <MapPinned className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Edit block', icon: <Edit2 className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <VenueBlockForm
        mode="edit"
        branches={data.branches}
        classrooms={data.classrooms}
        initialData={data.venueBlock as VenueBlockRecord}
      />
    </AdminFormPageLayout>
  );
}
