import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { BranchForm } from '@/app/(protected)/organization/branches/branch-form';
import { notFound } from 'next/navigation';
import { Home, Building2, MapPin, Eye } from 'lucide-react';

export const metadata = { title: 'View Branch | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ViewBranchPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadOrganizationData();
  const branch = data.branches.find((b) => b.id === params.id);

  if (!branch) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={branch.branchName}
        description="View branch details."
        backUrl="/organization/branches"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Branches', href: '/organization/branches', icon: <MapPin className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'View', icon: <Eye className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <BranchForm mode="view" initialData={branch} institutes={data.institutes} users={data.users} />
    </div>
  );
}
