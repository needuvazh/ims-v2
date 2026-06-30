import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { InstituteForm } from '@/app/(protected)/organization/institutes/institute-form';
import { notFound } from 'next/navigation';
import { Home, Building2, Building, Eye } from 'lucide-react';

export const metadata = { title: 'View Institute | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ViewInstitutePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadOrganizationData();
  const institute = data.institutes.find((i) => i.id === params.id);

  if (!institute) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={institute.instituteName}
        description="View institute details."
        backUrl="/organization/institutes"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Institutes', href: '/organization/institutes', icon: <Building className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'View', icon: <Eye className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <InstituteForm mode="view" initialData={institute} />
    </div>
  );
}
