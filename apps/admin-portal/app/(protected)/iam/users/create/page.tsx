import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { IamUserForm } from '../_components/user-form';
import { assertPermission } from '@/lib/auth-guard';

export const metadata = { title: 'Create User - IAM | IMS Admin' };

export default async function IamCreateUserPage() {
  await assertPermission('iam.user.create');
  const { roleService, organizationService } = await import('@/lib/runtime');
  
  const [rolesResult, branchResult] = await Promise.all([
    roleService.listRoles(),
    organizationService.listBranches({ pageSize: 1000 })
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create User"
        description="Add a new user to the system. The user will be created in 'Pending Activation' state."
        backUrl="/iam/users"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM Console', href: '/iam' },
              { label: 'Users', href: '/iam/users' },
              { label: 'Create' },
            ]}
          />
        }
      />
      <IamUserForm 
        mode="create" 
        roles={rolesResult.filter((r: any) => r.status === 'Active')} 
        branches={branchResult.items} 
      />
    </div>
  );
}
