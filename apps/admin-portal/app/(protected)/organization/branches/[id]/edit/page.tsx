import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { BranchForm } from '@/app/(protected)/organization/branches/branch-form';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Edit Branch | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function EditBranchPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadOrganizationData();
  const branch = data.branches.find((b) => b.id === params.id);

  if (!branch) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Edit ${branch.branchName}`}
        description="Modify existing branch details."
        backUrl="/organization/branches"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Branches', href: '/organization/branches' },
              { label: 'Edit' },
            ]}
          />
        }
      />
      <BranchForm mode="edit" initialData={branch} institutes={data.institutes} users={data.users} />
    </div>
  );
}
