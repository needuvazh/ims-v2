'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, CheckCircle, Ban, Archive, KeyRound, Mail, LockOpen } from 'lucide-react';
import { Button } from '@ims/shared-ui';
import { userLifecycleAction } from '../../actions';

interface Props {
  userId: string;
  currentStatus: string;
}

export function UserLifecycleDropdown({ userId, currentStatus }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAction = (action: 'activate' | 'suspend' | 'archive' | 'unlock' | 'adminResetPassword' | 'resendActivationEmail') => {
    setIsOpen(false);
    startTransition(async () => {
      const result = await userLifecycleAction(userId, action);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || 'Action failed');
      }
    });
  };

  return (
    <div className="relative inline-block text-left">
      <Button variant="secondary" onClick={() => setIsOpen(!isOpen)} disabled={isPending}>
        {isPending ? 'Processing...' : 'Actions'}
        <MoreVertical className="ml-2 h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
          <div className="py-1">
            {currentStatus === 'PendingActivation' && (
              <button
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => handleAction('resendActivationEmail')}
              >
                <Mail className="mr-2 h-4 w-4" />
                Resend Activation Email
              </button>
            )}
            {(currentStatus === 'PendingActivation' || currentStatus === 'Suspended' || currentStatus === 'Locked') && (
              <button
                className="flex w-full items-center px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                onClick={() => handleAction('activate')}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Activate User
              </button>
            )}
            {currentStatus === 'Locked' && (
              <button
                className="flex w-full items-center px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
                onClick={() => handleAction('unlock')}
              >
                <LockOpen className="mr-2 h-4 w-4" />
                Unlock Account
              </button>
            )}
            {currentStatus === 'Active' && (
              <button
                className="flex w-full items-center px-4 py-2 text-sm text-yellow-600 hover:bg-gray-100"
                onClick={() => handleAction('suspend')}
              >
                <Ban className="mr-2 h-4 w-4" />
                Suspend User
              </button>
            )}
            {(currentStatus !== 'Archived') && (
              <button
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => handleAction('adminResetPassword')}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Admin Reset Password
              </button>
            )}
            <div className="border-t border-gray-100 my-1"></div>
            {(currentStatus !== 'Archived') && (
              <button
                className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                onClick={() => {
                  if (confirm('Are you sure you want to archive this user? This will revoke all active sessions and access.')) {
                    handleAction('archive');
                  } else {
                    setIsOpen(false);
                  }
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive User
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
