'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, CheckCircle, Ban, Archive, KeyRound, Mail, LockOpen, Copy, Check } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@ims/shared-ui';
import { userLifecycleAction } from '../../actions';

interface Props {
  userId: string;
  currentStatus: string;
}

export function UserLifecycleDropdown({ userId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogLink, setDialogLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dialogLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleAction = (action: 'activate' | 'suspend' | 'archive' | 'unlock' | 'adminResetPassword' | 'resendActivationEmail') => {
    startTransition(async () => {
      const result = await userLifecycleAction(userId, action);
      if (result.success) {
        if (action === 'resendActivationEmail' && result.data?.activationLink) {
          setDialogLink(result.data.activationLink);
          setDialogTitle('Account Activation Link');
          setIsOpen(true);
        } else if (action === 'adminResetPassword' && result.data?.resetLink) {
          setDialogLink(result.data.resetLink);
          setDialogTitle('Password Reset Link');
          setIsOpen(true);
        }
        router.refresh();
      } else {
        alert(result.error || 'Action failed');
      }
    });
  };

  return (
    <>
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Copy the link below to share it with the user.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <input
              type="text"
              readOnly
              value={dialogLink}
              className="h-11 flex-1 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-4 text-sm text-[color:var(--ims-ink)] shadow-[0_8px_24px_rgba(16,36,58,0.04)] outline-none transition-all placeholder:text-[color:var(--ims-muted)] focus:border-[color:var(--ims-brass)] focus:ring-2 focus:ring-[color:var(--ims-brass-soft)]"
            />
            <Button
              type="button"
              className="h-11 px-4 flex items-center justify-center gap-1.5"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

