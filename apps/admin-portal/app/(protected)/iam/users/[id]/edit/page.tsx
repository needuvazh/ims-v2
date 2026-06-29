import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { IamUserForm } from '../../_components/user-form';
import { loadUserProfile } from '../../shared-data';
import { assertPermission } from '../../../../../lib/auth-guard';

export const metadata = { title: 'Edit User - IAM | IMS Admin' };

export default async function IamEditUserPage(props: { params: Promise<{ id: string }> }) {
  await assertPermission('iam.user.update');
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
        title="Edit User"
        description={`Modify details and branch scopes for ${userProfile.firstName} ${userProfile.lastName}.`}
        backUrl={`/iam/users/${params.id}`}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM Console', href: '/iam' },
              { label: 'Users', href: '/iam/users' },
              { label: `${userProfile.firstName} ${userProfile.lastName}`, href: `/iam/users/${params.id}` },
              { label: 'Edit' },
            ]}
          />
        }
      />
      <IamUserForm 
        mode="edit" 
        initialData={userProfile}
        roles={rolesResult.filter((r: any) => r.status === 'Active' || userProfile.roleIds.includes(r.id))}  
        branches={branchResult.items} 
      />
    </div>
  );
}
