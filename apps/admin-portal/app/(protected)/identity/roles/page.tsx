import Link from 'next/link';
import { Eye, Pencil, Ban, CheckCircle, ShieldPlus, Shield as ShieldIcon } from 'lucide-react';
import { 
  Breadcrumbs, 
  PageHeader, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Badge,
  Button,
  EmptyState,
  Pagination,
  SimpleTooltip,
  DataTableFilter
} from '@ims/shared-ui';
import { loadIdentityData } from '../shared-data';
import { updateRoleStatusAction } from '../actions';

export const metadata = { title: 'Roles - Identity | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IdentityRolesPage(props: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadIdentityData();
  
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '10', 10);
  const q = (searchParams.q || '').toLowerCase();
  const statusFilter = searchParams.status || '';
  
  let filteredRoles = data.roles;
  
  if (q) {
    filteredRoles = filteredRoles.filter(r => 
      r.roleName.toLowerCase().includes(q) || 
      r.roleCode.toLowerCase().includes(q)
    );
  }
  
  if (statusFilter) {
    filteredRoles = filteredRoles.filter(r => r.status === statusFilter);
  }
  
  const totalCount = filteredRoles.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedRoles = filteredRoles.slice(offset, offset + limit);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access Control"
        title="Roles & Permissions"
        description="Manage system roles."
        actions={
          <Link href="/identity/roles/create">
            <Button size="sm">
              <ShieldPlus className="h-4 w-4 mr-2" /> Add Role
            </Button>
          </Link>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Identity', href: '/identity' },
              { label: 'Roles' },
            ]}
          />
        }
      />

      <div className="space-y-4">
        <DataTableFilter 
          searchPlaceholder="Search roles by name or code..."
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]
            }
          ]}
        />

        {totalCount === 0 ? (
          <EmptyState
            icon={<ShieldIcon className="h-6 w-6" />}
            title="No roles found"
            description="No roles match the current search or filter criteria."
          />
        ) : (
          <>
            <Table data-testid="roles-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRoles.map((role) => (
                  <TableRow key={role.id} data-testid={`role-row-${role.id}`}>
                    <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{role.roleCode}</TableCell>
                    <TableCell className="font-medium text-[color:var(--ims-ink)]">{role.roleName}</TableCell>
                    <TableCell>
                      <Badge variant="default">{role.permissions.length}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.status === 'Active' ? 'success' : 'muted'}>{role.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <SimpleTooltip content="Manage Permissions" side="top">
                          <Link href={`/identity/roles/${role.id}/permissions`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                              <ShieldIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                        </SimpleTooltip>

                        <SimpleTooltip content="View Details" side="top">
                          <Link href={`/identity/roles/${role.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </SimpleTooltip>

                        <SimpleTooltip content="Edit Role" side="top">
                          <Link href={`/identity/roles/${role.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        </SimpleTooltip>

                        <form action={async () => {
                          'use server';
                          await updateRoleStatusAction(role.id, role.status === 'Active' ? 'Inactive' : 'Active');
                        }}>
                          {role.status === 'Active' ? (
                            <SimpleTooltip content="Deactivate Role" side="top">
                              <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-error)] hover:bg-[color:var(--ims-error)]/10">
                                <Ban className="h-4 w-4" />
                              </Button>
                            </SimpleTooltip>
                          ) : (
                            <SimpleTooltip content="Activate Role" side="top">
                              <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-success)] hover:bg-[color:var(--ims-success)]/10">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </SimpleTooltip>
                          )}
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              limit={limit}
            />
          </>
        )}
      </div>
    </div>
  );
}
