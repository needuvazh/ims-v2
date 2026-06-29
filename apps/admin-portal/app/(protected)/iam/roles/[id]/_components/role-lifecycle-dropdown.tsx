'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Archive } from 'lucide-react';
import { Button } from '@ims/shared-ui';
import { archiveRoleAction } from '../../actions';

interface Props {
  roleId: string;
  currentStatus: string;
  isSystemRole: boolean;
}

export function RoleLifecycleDropdown({ roleId, currentStatus, isSystemRole }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleArchive = () => {
    setIsOpen(false);
    if (!confirm('Are you sure you want to archive this role? Assigned users will lose associated permissions.')) {
      return;
    }
    
    startTransition(async () => {
      const result = await archiveRoleAction(roleId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || 'Failed to archive role');
      }
    });
  };

  if (isSystemRole || currentStatus === 'Archived') {
    return null;
  }

  return (
    <div className="relative inline-block text-left">
      <Button variant="secondary" onClick={() => setIsOpen(!isOpen)} disabled={isPending}>
        {isPending ? 'Processing...' : 'Actions'}
        <MoreVertical className="ml-2 h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
          <div className="py-1">
            <button
              className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              onClick={handleArchive}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive Role
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
