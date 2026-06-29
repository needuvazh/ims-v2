import Link from 'next/link';
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
  EmptyState,
  Pagination,
  DataTableFilter,
  Button
} from '@ims/shared-ui';
import { KeyRound, Plus } from 'lucide-react';
import { assertPermission } from '@/lib/auth-guard';

export const metadata = { title: 'Permissions - IAM | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IamPermissionsPage(props: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; module?: string; type?: string; status?: string }>;
}) {
  await assertPermission('iam.permission.read');
  const searchParams = await props.searchParams;
  
  const { permissionService } = await import('@/lib/runtime');
  const permissions = await permissionService.searchPermissions();
  
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '10', 10);
  const q = (searchParams.q || '').toLowerCase();
  const moduleFilter = searchParams.module || '';
  const typeFilter = searchParams.type || '';
  const statusFilter = searchParams.status || '';
  
  let filteredPermissions = permissions;
  
  if (q) {
    filteredPermissions = filteredPermissions.filter((p: any) => 
      p.permissionCode.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.featureCode && p.featureCode.toLowerCase().includes(q))
    );
  }
  
  if (moduleFilter) {
    filteredPermissions = filteredPermissions.filter((p: any) => p.moduleCode === moduleFilter);
  }

  if (typeFilter) {
    filteredPermissions = filteredPermissions.filter((p: any) => p.permissionType === typeFilter);
  }

  if (statusFilter) {
    filteredPermissions = filteredPermissions.filter((p: any) => p.status === statusFilter);
  }
  
  const uniqueModules = Array.from(new Set(permissions.map((p: any) => p.moduleCode))).filter(Boolean).sort();
  const uniqueTypes = Array.from(new Set(permissions.map((p: any) => p.permissionType))).filter(Boolean).sort();
  const uniqueStatuses = Array.from(new Set(permissions.map((p: any) => p.status))).filter(Boolean).sort();
  
  const totalCount = filteredPermissions.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedPermissions = filteredPermissions.slice(offset, offset + limit);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Permissions"
        description="Manage the permission catalog for the system."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM Console', href: '/iam' },
              { label: 'Permissions' },
            ]}
          />
        }
        actions={
          <Link href="/iam/permissions/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Permission
            </Button>
          </Link>
        }
      />

      <div className="space-y-4 bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)]">
        <DataTableFilter 
          searchPlaceholder="Search by code, feature, or description..."
          filters={[
            {
              key: 'module',
              label: 'Module',
              options: uniqueModules.map(m => ({ value: m as string, label: m as string }))
            },
            {
              key: 'type',
              label: 'Type',
              options: uniqueTypes.map(type => ({ value: type as string, label: type as string }))
            },
            {
              key: 'status',
              label: 'Status',
              options: uniqueStatuses.map(status => ({ value: status as string, label: status as string }))
            }
          ]}
        />

        {totalCount === 0 ? (
          <EmptyState
            icon={<KeyRound className="h-6 w-6" />}
            title="No permissions found"
            description="No permissions match the current search or filter criteria."
          />
        ) : (
          <>
            <Table data-testid="permissions-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Permission Code</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPermissions.map((perm: any) => (
                  <TableRow key={perm.id} data-testid={`perm-row-${perm.id}`}>
                    <TableCell>
                      <Link href={`/iam/permissions/${perm.id}`} className="font-mono text-xs font-semibold text-[color:var(--ims-brand-600)] hover:underline">
                        {perm.permissionCode}
                      </Link>
                      {perm.description && (
                        <p className="text-xs text-[color:var(--ims-muted)] mt-1">{perm.description}</p>
                      )}
                    </TableCell>
                    <TableCell>{perm.moduleCode}</TableCell>
                    <TableCell>{perm.featureCode}</TableCell>
                    <TableCell>{perm.actionCode}</TableCell>
                    <TableCell>{perm.permissionType}</TableCell>
                    <TableCell>
                      <Badge variant={perm.status === 'Active' ? 'success' : 'muted'}>{perm.status}</Badge>
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
