import { Breadcrumbs, PageHeader, Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@ims/shared-ui';
import { IamUserForm } from '../_components/user-form';
import { loadUserProfile } from '../shared-data';
import { assertPermission } from '../../../../../lib/auth-guard';
import { UserLifecycleDropdown } from './_components/user-lifecycle-dropdown';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  <span>View Activity</span>
                  <ChevronDown className="ml-1.5 h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Activity & Logs</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/iam/sessions`} className="w-full flex items-center">
                    Active Sessions
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/iam/login-history`} className="w-full flex items-center">
                    Login History
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/iam/audit`} className="w-full flex items-center">
                    Audit Trail
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
