import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { BranchForm } from '@/app/(protected)/organization/branches/branch-form';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { Home, Building2, MapPin, Plus } from 'lucide-react';

export const metadata = { title: 'Add Branch | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function CreateBranchPage() {
  const data = await loadOrganizationData();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Add New Branch"
        description="Create a new branch under an institute."
        backUrl="/organization/branches"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Branches', href: '/organization/branches', icon: <MapPin className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Add Branch', icon: <Plus className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <BranchForm mode="create" institutes={data.institutes} users={data.users} />
    </div>
  );
}
