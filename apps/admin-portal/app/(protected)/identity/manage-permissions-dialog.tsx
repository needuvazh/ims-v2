'use client';

import { useTransition, useState } from 'react';
import { KeyRound } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Badge,
} from '@ims/shared-ui';
import type { RoleRecord, PermissionRecord } from '@ims/identity-access';
import { toggleRolePermissionAction } from './actions';

export function ManagePermissionsDialog({ role, allPermissions }: { role: RoleRecord, allPermissions: PermissionRecord[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<string[]>(
    role.permissions.map((p) => p.id)
  );

  const handleToggle = (permissionId: string, isAssigned: boolean) => {
    startTransition(async () => {
      // Optimistic update
      setAssignedPermissionIds((prev) =>
        isAssigned ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
      );
      await toggleRolePermissionAction(role.id, permissionId, !isAssigned);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`manage-perms-btn-${role.id}`}>
          <KeyRound className="h-4 w-4" /> Manage Permissions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Permissions for {role.roleName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {allPermissions.length === 0 ? (
            <p className="text-sm text-gray-500">No permissions available in the system.</p>
          ) : (
            <div className="grid gap-3">
              {allPermissions.map((perm) => {
                const isAssigned = assignedPermissionIds.includes(perm.id);
                return (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between rounded-xl border border-[color:var(--ims-border)] p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[color:var(--ims-brass)] font-semibold">{perm.permissionCode}</span>
                      </div>
                      <p className="text-sm text-[color:var(--ims-ink)] mt-1">{perm.description || 'No description'}</p>
                    </div>
                    <Button
                      variant={isAssigned ? 'destructive' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggle(perm.id, isAssigned)}
                      disabled={isPending}
                      data-testid={`toggle-perm-${perm.id}`}
                    >
                      {isAssigned ? 'Remove' : 'Assign'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
