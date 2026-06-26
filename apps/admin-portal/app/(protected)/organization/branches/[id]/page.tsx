import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { BranchForm } from '@/app/(protected)/organization/branches/branch-form';
import { notFound } from 'next/navigation';

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
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Branches', href: '/organization/branches' },
              { label: 'View' },
            ]}
          />
        }
      />
      <BranchForm mode="view" initialData={branch} institutes={data.institutes} users={data.users} />
    </div>
  );
}
