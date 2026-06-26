import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { InstituteForm } from '@/app/(protected)/organization/institutes/institute-form';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Edit Institute | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function EditInstitutePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadOrganizationData();
  const institute = data.institutes.find((i) => i.id === params.id);

  if (!institute) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Edit ${institute.instituteName}`}
        description="Modify existing institute details."
        backUrl="/organization/institutes"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Institutes', href: '/organization/institutes' },
              { label: 'Edit' },
            ]}
          />
        }
      />
      <InstituteForm mode="edit" initialData={institute} />
    </div>
  );
}
