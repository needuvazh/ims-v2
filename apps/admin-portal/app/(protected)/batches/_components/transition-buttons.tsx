'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@ims/shared-ui';
import { toast } from 'sonner';
import { transitionBatchStatusAction } from '../actions';
import { Loader2 } from 'lucide-react';

interface TransitionButtonsProps {
  batchId: string;
  status: string;
  version: number;
}

export function TransitionButtons({ batchId, status, version }: TransitionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleTransition = (targetStatus: string, actionLabel: string) => {
    startTransition(async () => {
      try {
        const res = await transitionBatchStatusAction(batchId, targetStatus, version);
        if (res && !res.success) {
          toast.error(res.error || `Failed to transition state.`);
        } else {
          toast.success(`Batch successfully transitioned to ${actionLabel}!`);
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {status === 'Draft' && (
        <Button
          onClick={() => handleTransition('OpenForEnrollment', 'Open')}
          disabled={isPending}
          variant="primary"
          className="w-full text-xs py-1.5 flex justify-center items-center gap-1.5"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Open Batch'}
        </Button>
      )}
      {status === 'OpenForEnrollment' && (
        <Button
          onClick={() => handleTransition('InProgress', 'In Progress')}
          disabled={isPending}
          variant="primary"
          className="w-full text-xs py-1.5 flex justify-center items-center gap-1.5"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Start Class'}
        </Button>
      )}
      {status === 'InProgress' && (
        <Button
          onClick={() => handleTransition('Completed', 'Completed')}
          disabled={isPending}
          variant="primary"
          className="w-full text-xs py-1.5 flex justify-center items-center gap-1.5"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Complete'}
        </Button>
      )}
      {status !== 'Completed' && status !== 'Cancelled' && (
        <Button
          onClick={() => handleTransition('Cancelled', 'Cancelled')}
          disabled={isPending}
          variant="outline"
          className="w-full text-xs py-1.5 text-red-500 border-red-200 hover:bg-red-50 flex justify-center items-center gap-1.5"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cancel Batch'}
        </Button>
      )}
    </div>
  );
}
