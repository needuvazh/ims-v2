'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, CheckCircle, Ban, Archive, KeyRound, Mail, LockOpen } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@ims/shared-ui';
import { userLifecycleAction } from '../../actions';

interface Props {
  userId: string;
  currentStatus: string;
}

export function UserLifecycleDropdown({ userId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAction = (action: 'activate' | 'suspend' | 'archive' | 'unlock' | 'adminResetPassword' | 'resendActivationEmail') => {
    startTransition(async () => {
      const result = await userLifecycleAction(userId, action);
      if (result.success) {
        if (action === 'resendActivationEmail' && result.data?.activationLink) {
          prompt('Activation link generated successfully. Copy and share it with the user:', result.data.activationLink);
        } else if (action === 'adminResetPassword' && result.data?.resetLink) {
          prompt('Password reset link generated successfully. Copy and share it with the user:', result.data.resetLink);
        }
        router.refresh();
      } else {
        alert(result.error || 'Action failed');
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" disabled={isPending}>
          {isPending ? 'Processing...' : 'Actions'}
          <MoreVertical className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 z-50">
        {currentStatus === 'PendingActivation' && (
          <DropdownMenuItem onClick={() => handleAction('resendActivationEmail')} className="flex items-center text-gray-700">
            <Mail className="mr-2 h-4 w-4" />
            Resend Activation Email
          </DropdownMenuItem>
        )}
        {(currentStatus === 'PendingActivation' || currentStatus === 'Suspended' || currentStatus === 'Locked') && (
          <DropdownMenuItem onClick={() => handleAction('activate')} className="flex items-center text-green-600">
            <CheckCircle className="mr-2 h-4 w-4" />
            Activate User
          </DropdownMenuItem>
        )}
        {currentStatus === 'Locked' && (
          <DropdownMenuItem onClick={() => handleAction('unlock')} className="flex items-center text-blue-600">
            <LockOpen className="mr-2 h-4 w-4" />
            Unlock Account
          </DropdownMenuItem>
        )}
        {currentStatus === 'Active' && (
          <DropdownMenuItem onClick={() => handleAction('suspend')} className="flex items-center text-yellow-600">
            <Ban className="mr-2 h-4 w-4" />
            Suspend User
          </DropdownMenuItem>
        )}
        {currentStatus !== 'Archived' && (
          <DropdownMenuItem onClick={() => handleAction('adminResetPassword')} className="flex items-center text-gray-700">
            <KeyRound className="mr-2 h-4 w-4" />
            Admin Reset Password
          </DropdownMenuItem>
        )}
        {currentStatus !== 'Archived' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (confirm('Are you sure you want to archive this user? This will revoke all active sessions and access.')) {
                  handleAction('archive');
                }
              }}
              className="flex items-center text-red-600"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive User
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
