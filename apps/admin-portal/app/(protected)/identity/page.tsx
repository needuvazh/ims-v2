import {
  Avatar,
  Badge,
  Breadcrumbs,
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ims/shared-ui';
import { Shield, Users } from 'lucide-react';
import { CreateUserForm } from './create-user-form';
import { CreateRoleForm } from './create-role-form';

export const metadata = { title: 'Identity & Access | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IdentityPage() {
  const { userService, roleService } = await import('../../lib/runtime');
  const [users, roles, permissions] = await Promise.all([
    userService.listUsers(),
    roleService.listRoles(),
    roleService.listPermissions(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access Control"
        title="Identity & Access"
        description="Manage users, roles, and permissions."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Identity' }]} />}
      />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">Roles ({roles.length})</TabsTrigger>
          <TabsTrigger value="permissions" data-testid="tab-permissions">Permissions ({permissions.length})</TabsTrigger>
        </TabsList>

        {/* ── Users Tab ── */}
        <TabsContent value="users">
          <div className="space-y-4">
            <div className="flex justify-end">
              <CreateUserForm roles={roles} />
            </div>
            {users.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="No users yet"
                description="Create the first user to get started with access management."
                data-testid="users-empty"
              />
            ) : (
              <Table data-testid="users-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar fallback={user.fullName} size="sm" />
                          <div>
                            <p className="font-medium text-[color:var(--ims-ink)]">{user.fullName}</p>
                            <p className="text-xs text-[color:var(--ims-muted)]">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{user.userType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          user.status === 'Active' ? 'success'
                          : user.status === 'Locked' ? 'error'
                          : 'muted'
                        }>
                          {user.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── Roles Tab ── */}
        <TabsContent value="roles">
          <div className="space-y-4">
            <div className="flex justify-end">
              <CreateRoleForm permissions={permissions} />
            </div>
            {roles.length === 0 ? (
              <EmptyState
                icon={<Shield className="h-6 w-6" />}
                title="No roles yet"
                description="Create a role and assign permissions to control access."
                data-testid="roles-empty"
              />
            ) : (
              <Table data-testid="roles-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id} data-testid={`role-row-${role.id}`}>
                      <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{role.roleCode}</TableCell>
                      <TableCell className="font-medium text-[color:var(--ims-ink)]">{role.roleName}</TableCell>
                      <TableCell>
                        <Badge variant="default">{role.permissions.length}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.status === 'Active' ? 'success' : 'muted'}>{role.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── Permissions Tab ── */}
        <TabsContent value="permissions">
          <Table data-testid="permissions-table">
            <TableHeader>
              <TableRow>
                <TableHead>Permission Code</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Feature</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((perm) => (
                <TableRow key={perm.id} data-testid={`perm-row-${perm.id}`}>
                  <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{perm.permissionCode}</TableCell>
                  <TableCell>{perm.moduleCode}</TableCell>
                  <TableCell>{perm.featureCode}</TableCell>
                  <TableCell>{perm.actionCode}</TableCell>
                  <TableCell className="text-[color:var(--ims-muted)]">{perm.description ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
