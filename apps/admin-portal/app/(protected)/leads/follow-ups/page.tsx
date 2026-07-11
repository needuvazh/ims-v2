import { Suspense } from 'react';
import { assertPermission } from '../../../lib/auth-guard';
import { FollowUpsClient } from './_components/follow-ups-client';
import { AdminListPageLayout } from '@ims/shared-ui';

export const metadata = { title: 'Lead Follow-ups | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function LeadFollowUpsPage() {
  // Enforce read permission
  await assertPermission('lead.read');

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading follow-ups...</div>}>
        <FollowUpsClient />
      </Suspense>
    </AdminListPageLayout>
  );
}
