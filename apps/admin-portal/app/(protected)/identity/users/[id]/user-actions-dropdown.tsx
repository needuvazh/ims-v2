'use client';

import { useRouter } from 'next/navigation';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  Button 
} from '@ims/shared-ui';
import { MoreVertical, Pencil, ShieldAlert, Ban, CheckCircle } from 'lucide-react';
import { updateUserStatusAction } from '../../actions';
import Link from 'next/link';

interface UserActionsDropdownProps {
  userId: string;
  userStatus: string;
}

export function UserActionsDropdown({ userId, userStatus }: UserActionsDropdownProps) {
  const router = useRouter();

  const handleToggleStatus = async () => {
    const nextStatus = userStatus === 'Active' ? 'Suspended' : 'Active';
    const res = await updateUserStatusAction(userId, nextStatus);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to update user status.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/iam/users/${userId}/edit`} className="w-full flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Edit User
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/iam/users/${userId}/roles`} className="w-full flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Manage Roles
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleToggleStatus} className="text-[color:var(--ims-error)]">
          {userStatus === 'Active' ? (
            <span className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-[color:var(--ims-error)]" /> Suspend User
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[color:var(--ims-success)]" /> Activate User
            </span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
