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
import { KeyRound, Plus, Home, ShieldCheck, Key } from 'lucide-react';
import { assertPermission } from '@/lib/auth-guard';

type PermissionRecord = {
  id: string;
  permissionCode: string;
  description?: string | null;
  moduleCode: string;
  featureCode?: string | null;
  actionCode?: string | null;
  permissionType: string;
  status: string;
};

function parsePageValue(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const metadata = { title: 'Permissions - IAM | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IamPermissionsPage(props: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; module?: string; type?: string; status?: string }>;
}) {
  await assertPermission('iam.permission.read');
  const searchParams = await props.searchParams;
  
  const { permissionService } = await import('@/lib/runtime');
  const permissions = (await permissionService.searchPermissions()) as PermissionRecord[];
  
  const page = parsePageValue(searchParams.page, 1);
  const limit = parsePageValue(searchParams.limit, 10);
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
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * limit;
  const paginatedPermissions = filteredPermissions.slice(offset, offset + limit);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Permissions"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Permissions', icon: <Key className="h-3.5 w-3.5 text-slate-500" /> },
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

      <div className="space-y-4 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 sm:p-6">
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
            <div className="grid gap-3 sm:hidden" data-testid="permissions-mobile-list">
              {paginatedPermissions.map((perm) => (
                <article
                  key={perm.id}
                  data-testid={`perm-card-${perm.id}`}
                  className="rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/iam/permissions/${perm.id}`} className="block font-mono text-sm font-semibold text-[color:var(--ims-brand-600)] underline-offset-4 hover:underline">
                        {perm.permissionCode}
                      </Link>
                      <p className="mt-1 text-xs text-[color:var(--ims-muted)]">
                        {perm.description || 'No description provided'}
                      </p>
                    </div>
                    <Badge variant={perm.status === 'Active' ? 'success' : 'muted'}>{perm.status}</Badge>
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ims-muted)]">Module</dt>
                      <dd className="mt-1 font-medium text-[color:var(--ims-ink)]">{perm.moduleCode}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ims-muted)]">Type</dt>
                      <dd className="mt-1 font-medium text-[color:var(--ims-ink)]">{perm.permissionType}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ims-muted)]">Feature</dt>
                      <dd className="mt-1 font-medium text-[color:var(--ims-ink)]">{perm.featureCode || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ims-muted)]">Action</dt>
                      <dd className="mt-1 font-medium text-[color:var(--ims-ink)]">{perm.actionCode || '—'}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden sm:block">
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
                  {paginatedPermissions.map((perm) => (
                    <TableRow key={perm.id} data-testid={`perm-row-${perm.id}`}>
                      <TableCell>
                        <Link href={`/iam/permissions/${perm.id}`} className="font-mono text-xs font-semibold text-[color:var(--ims-brand-600)] hover:underline">
                          {perm.permissionCode}
                        </Link>
                        {perm.description && (
                          <p className="mt-1 text-xs text-[color:var(--ims-muted)]">{perm.description}</p>
                        )}
                      </TableCell>
                      <TableCell>{perm.moduleCode}</TableCell>
                      <TableCell>{perm.featureCode || '—'}</TableCell>
                      <TableCell>{perm.actionCode || '—'}</TableCell>
                      <TableCell>{perm.permissionType}</TableCell>
                      <TableCell>
                        <Badge variant={perm.status === 'Active' ? 'success' : 'muted'}>{perm.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={currentPage}
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
