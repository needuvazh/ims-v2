'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, MoreVertical } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ims/shared-ui';
import { archivePermissionAction } from '../../actions';

interface PermissionLifecycleDropdownProps {
  permissionId: string;
  currentStatus: string;
}

export function PermissionLifecycleDropdown({ permissionId, currentStatus }: PermissionLifecycleDropdownProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isArchived = currentStatus === 'Archived';

  const handleArchive = () => {
    startTransition(async () => {
      await archivePermissionAction(permissionId);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" disabled={isPending} data-testid="permission-lifecycle-trigger">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!isArchived && (
          <DropdownMenuItem onClick={handleArchive} className="text-red-600 focus:text-red-600 cursor-pointer">
            <Archive className="mr-2 h-4 w-4" />
            Archive Permission
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
