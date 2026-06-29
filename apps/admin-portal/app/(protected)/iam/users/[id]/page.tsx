import { Breadcrumbs, PageHeader, Button } from '@ims/shared-ui';
import { IamUserForm } from '../_components/user-form';
import { loadUserProfile } from '../shared-data';
import { assertPermission } from '../../../../../lib/auth-guard';
import { UserLifecycleDropdown } from './_components/user-lifecycle-dropdown';
import Link from 'next/link';

export const metadata = { title: 'View User - IAM | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IamViewUserPage(props: { params: Promise<{ id: string }> }) {
  await assertPermission('iam.user.read');
  const params = await props.params;
  
  const { roleService, organizationService } = await import('../../../../../lib/runtime');
  
  const [userProfile, rolesResult, branchResult] = await Promise.all([
    loadUserProfile(params.id),
    roleService.listRoles(),
    organizationService.listBranches({ pageSize: 1000 })
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="User Details"
        description={`Viewing details for ${userProfile.firstName} ${userProfile.lastName}.`}
        backUrl="/iam/users"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM Console', href: '/iam' },
              { label: 'Users', href: '/iam/users' },
              { label: `${userProfile.firstName} ${userProfile.lastName}` },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-3">
            <UserLifecycleDropdown userId={params.id} currentStatus={userProfile.status} />
            <Link href={`/iam/users/${params.id}/roles`}>
              <Button variant="secondary">Manage Roles</Button>
            </Link>
            <Link href={`/iam/users/${params.id}/edit`}>
              <Button>Edit User</Button>
            </Link>
          </div>
        }
      />
      <IamUserForm 
        mode="view" 
        initialData={userProfile}
        roles={rolesResult} 
        branches={branchResult.items} 
      />
    </div>
  );
}
