import { ReactNode } from 'react';
import { SearchX, ShieldAlert } from 'lucide-react';
import { EmptyState, CardSkeleton, TableSkeleton, Alert } from '@ims/shared-ui';

export function IamEmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <EmptyState
      icon={<SearchX className="h-6 w-6" />}
      title={title}
      description={description ?? 'No records found matching the current criteria.'}
      action={action}
      className="my-8"
    />
  );
}

export function IamLoadingState({ type = 'table' }: { type?: 'table' | 'card' }) {
  if (type === 'card') {
    return <CardSkeleton className="my-8" />;
  }
  return <div className="my-8"><TableSkeleton rows={5} columns={4} /></div>;
}

export function IamUnauthorizedState({ message }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center py-12 px-4">
      <Alert
        variant="error"
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Unauthorized Access"
        description={message ?? 'You do not have the required permissions or branch assignment to view this area.'}
        className="max-w-md w-full shadow-sm"
      />
    </div>
  );
}
