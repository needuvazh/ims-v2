import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { BranchForm } from '@/app/(protected)/organization/branches/branch-form';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';

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
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Branches', href: '/organization/branches' },
              { label: 'Add Branch' },
            ]}
          />
        }
      />
      <BranchForm mode="create" institutes={data.institutes} users={data.users} />
    </div>
  );
}
