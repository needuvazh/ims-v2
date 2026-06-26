'use client';

import { useTransition, useState } from 'react';
import {
  Button,
} from '@ims/shared-ui';
import type { RoleRecord, PermissionRecord } from '@ims/identity-access';
import { toggleRolePermissionAction } from '../../../actions';

export function ManagePermissionsForm({ roleId, allPermissions, initialAssignedPermissionIds }: { roleId: string, allPermissions: PermissionRecord[], initialAssignedPermissionIds: string[] }) {
  const [isPending, startTransition] = useTransition();
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<string[]>(initialAssignedPermissionIds);

  const handleToggle = (permissionId: string, isAssigned: boolean) => {
    startTransition(async () => {
      // Optimistic update
      setAssignedPermissionIds((prev) =>
        isAssigned ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
      );
      await toggleRolePermissionAction(roleId, permissionId, !isAssigned);
    });
  };

  if (allPermissions.length === 0) {
    return <p className="text-sm text-[color:var(--ims-muted)]">No permissions available in the system.</p>;
  }

  return (
    <div className="bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {allPermissions.map((perm) => {
          const isAssigned = assignedPermissionIds.includes(perm.id);
          return (
            <div
              key={perm.id}
              className="flex items-center justify-between rounded-xl border border-[color:var(--ims-border)] p-4"
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
    </div>
  );
}
